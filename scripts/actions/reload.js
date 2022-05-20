import { Updates } from "../utils/utils.js";
import * as Utils from "../utils/utils.js";
import * as WeaponUtils from "../utils/weapon-utils.js";

export async function reload() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await WeaponUtils.getSingleWeapon(
        getReloadableWeapons(actor),
        weapon => {
            const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
            if (!loadedEffect) {
                return true;
            }
            if (weapon.capacity) {
                const loadedCapacity = Utils.getFlag(loadedEffect, "capacity");
                const loadedChambers = Utils.getFlag(loadedEffect, "loadedChambers");
                return loadedChambers < loadedCapacity;
            }
            return false;
        }
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    if (Utils.useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            // With a repeating weapon, we only need to have a magazine loaded with at least one ammunition remaining. The ammunition itself
            // is still only consumed when we fire
            const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (!magazineLoadedEffect) {
                ui.notifications.warn(`${weapon.name} has no magazine loaded!`);
                return;
            } else if (Utils.getFlag(magazineLoadedEffect, "remaining") < 1) {
                ui.notifications.warn(`${weapon.name}'s magazine is empty!`);
                return;
            }

            // If the weapon is already loaded, we don't need to do it again
            const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                ui.notifications.warn(`${weapon.name} is already loaded.`);
                return;
            }

            // Create the new loaded effect
            const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
            Utils.setEffectTarget(loadedEffectSource, weapon);
            updates.add(loadedEffectSource);

            await postReloadToChat(token, weapon);
        } else {
            // If we have no ammunition selected, or we don't have any left in the stack, we can't reload
            const ammo = weapon.ammunition;
            if (!ammo) {
                ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
                return;
            } else if (ammo.quantity < 1) {
                ui.notifications.warn(`Not enough ammunition to reload ${weapon.name}.`);
                return;
            }

            const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);

            if (weapon.capacity) {
                // If some chambers are already loaded, we only want to load with the same type of ammunition
                if (loadedEffect) {
                    const loadedChambers = Utils.getFlag(loadedEffect, "loadedChambers");
                    const loadedCapacity = Utils.getFlag(loadedEffect, "capacity");
                    const loadedSourceId = Utils.getFlag(loadedEffect, "ammunitionSourceId");
                    if (ammo.sourceId !== loadedSourceId) {
                        ui.notifications.warn(`${weapon.name} is already loaded with ${loadedChambers} ${Utils.getFlag(loadedEffect, "ammunitionName")}.`);
                        return;
                    }

                    if (loadedChambers === loadedCapacity) {
                        ui.notifications.warn(`${weapon.name} is already fully loaded.`);
                        return;
                    }

                    // Increase the number of loaded chambers by one
                    updates.update(async () => {
                        await loadedEffect.update({
                            "flags.pf2e-ranged-combat.loadedChambers": loadedChambers + 1,
                            "name": `${Utils.getFlag(loadedEffect, "name")} (${loadedChambers + 1}/${weapon.capacity})`
                        });
                    });

                    token.showFloatyText({
                        create: {
                            name: `${Utils.getFlag(loadedEffect, "name")} ${loadedChambers + 1}/${loadedCapacity}`
                        }
                    });
                } else {
                    // No chambers are loaded, so create a new loaded effect
                    const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
                    updates.add(loadedEffectSource);

                    Utils.setEffectTarget(loadedEffectSource, weapon);

                    const loadedEffectName = `${loadedEffectSource.name} (${ammo.name})`;

                    loadedEffectSource.name = `${loadedEffectName} (1/${weapon.capacity})`;
                    loadedEffectSource.flags["pf2e-ranged-combat"] = {
                        ...loadedEffectSource.flags["pf2e-ranged-combat"],
                        name: loadedEffectName,
                        ammunitionName: ammo.name,
                        ammunitionImg: ammo.img,
                        ammunitionItemId: ammo.id,
                        ammunitionSourceId: ammo.sourceId,
                        loadedChambers: 1,
                        capacity: weapon.capacity,
                        currentChamberLoaded: true
                    };

                    await postReloadToChat(token, weapon, ammo.name);
                }
            } else {
                // If the weapon is already loaded, then either unload the current ammunition (if different from the new ammunition)
                // or don't reload at all
                if (loadedEffect) {
                    // If the selected ammunition is the same as what's already loaded, don't reload
                    const loadedSourceId = loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionSourceId");
                    if (ammo.sourceId === loadedSourceId) {
                        ui.notifications.warn(`${weapon.name} is already loaded with ${ammo.name}.`);
                        return;
                    }
                    await unloadAmmunition(actor, loadedEffect, updates);
                }

                // Now we can load the new ammunition
                const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
                updates.add(loadedEffectSource);

                Utils.setEffectTarget(loadedEffectSource, weapon);
                loadedEffectSource.name = `${loadedEffectSource.name} (${ammo.name})`;

                const loadedEffectSourceFlags = loadedEffectSource.flags["pf2e-ranged-combat"];
                loadedEffectSourceFlags.ammunitionName = ammo.name;
                loadedEffectSourceFlags.ammunitionImg = ammo.img;
                loadedEffectSourceFlags.ammunitionItemId = ammo.id;
                loadedEffectSourceFlags.ammunitionSourceId = ammo.sourceId;

                await postReloadToChat(token, weapon, ammo.name);
            }

            // Remove one piece of ammunition from the stack
            updates.update(async () => {
                await ammo.update({
                    "data.quantity": ammo.quantity - 1
                });
            });
        }
    } else {
        // If the weapon is already loaded, we don't need to do it again
        const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);

        if (weapon.capacity) {
            if (loadedEffect) {
                const loadedChambers = Utils.getFlag("loadedChambers");
                const loadedCapacity = Utils.getFlag("capacity");

                if (loadedChambers === loadedCapacity) {
                    ui.notifications.warn(`${weapon.name} is fully loaded.`);
                    return;
                }

                updates.update(() => loadedEffect.update({
                    "name": `${Utils.getFlag("name")} (${loadedChambers + 1}/${loadedCapacity})`,
                    "flags.pf2e-ranged-combat.loadedChambers": loadedChambers + 1
                }));
                updates.floatyText(`${Utils.getFlag("name")} (${loadedChambers + 1}/${loadedCapacity})`);

                const chamberLoadedSource = await Utils.getItem(Utils.CHAMBER_LOADED_EFFECT_ID);
                Utils.setEffectTarget(chamberLoadedSource, weapon);

            } else {
                const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
                Utils.setEffectTarget(loadedEffectSource, weapon);
                updates.add(loadedEffectSource);

                loadedEffectSource.flags["pf2e-ranged-combat"] = {
                    ...loadedEffectSource.flags["pf2e-ranged-combat"],
                    name: loadedEffectSource.name,
                    loadedChambers: 1,
                    capacity: weapon.capacity,
                    currentChamberLoaded: true
                };

                await postReloadToChat(token, weapon);
            }
        } else {
            if (loadedEffect) {
                ui.notifications.warn(`${weapon.name} is already loaded.`);
                return;
            }

            // Create the new loaded effect
            const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
            Utils.setEffectTarget(loadedEffectSource, weapon);
            updates.add(loadedEffectSource);

            await postReloadToChat(token, weapon);
        }
    }

    await triggerCrossbowReloadEffects(actor, weapon, updates);

    await updates.handleUpdates();
};

export async function nextChamber() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await WeaponUtils.getSingleWeapon(
        getCapacityWeapons(actor),
        weapon => {
            const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
            return loadedEffect && !Utils.getFlag(loadedEffect, "currentChamberLoaded");
        }
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect) {
        Utils.showWarning(`${weapon.name} is not loaded!`);
        return;
    }

    if (Utils.getFlag(loadedEffect, "currentChamberLoaded")) {
        Utils.showWarning(`${weapon.name}'s current chamber is loaded!`);
        return;
    }
}

/**
 * Replace the magazine in a repeating weapon.
 * - If no new magazine is selected, only remove the current magazine.
 * - If no new magazine is selected and there is no current magazine, show an error.
 * - If a new magazine is selected and it is different to, or has different remaining ammunition to, the current magazine:
 *     - Remove the existing magazine, if there is one (one action)
 *     - Load the new magazine (two actions)
 */
export async function reloadMagazine() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (!Utils.useAdvancedAmmunitionSystem(actor)) {
        if (actor.type === "character") {
            ui.notifications.warn("PF2e Ranged Combat - Magazine Reload can only be used if the Advanced Ammunition System is enabled.");
            return;
        } else if (actor.type === "npc") {
            ui.notifications.warn("PF2e Ranged Combat - Magazine Reload is currently not supported for NPCs.");
            return;
        }
    }

    const weapon = await WeaponUtils.getWeapon(
        actor,
        weapon => weapon.isRepeating,
        "You have no repeating weapons.",
        weapon => !Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id)
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    // If we have no ammunition selected, or we have none left in the stack, we can't reload
    const ammo = weapon.ammunition;
    if (!ammo) {
        ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
        return;
    } else if (ammo.quantity < 1) {
        ui.notifications.warn(`You don't have enough ammunition to reload ${weapon.name}.`);
        return;
    }

    let numActions = 0;

    // Find if the weapon is already loaded with a magazine. If it is, and there's some ammo left in it,
    // we'll put it back in our inventory
    const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (magazineLoadedEffect) {
        const magazineRemaining = Utils.getFlag(magazineLoadedEffect, "remaining");
        const magazineCapacity = Utils.getFlag(magazineLoadedEffect, "capacity");

        const magazineSourceId = Utils.getFlag(magazineLoadedEffect, "ammunitionSourceId");
        const selectedAmmunitionSourceId = ammo.sourceId;

        if (magazineRemaining === magazineCapacity && magazineSourceId === selectedAmmunitionSourceId) {
            // The current magazine is full, and the selected ammunition is the same
            ui.notifications.warn(`${weapon.name} is already loaded with a full magazine.`);
            return;
        } else if (magazineRemaining === ammo.charges.current && magazineSourceId === selectedAmmunitionSourceId) {
            // The current magazine is the same, and has the same remaining ammunition, as the new one
            ui.notifications.warn(`${weapon.name}'s current magazine is already loaded with as much ammunition as ${ammo.name}`);
            return;
        } else {
            // We actually want to reload, either for a magazine with more ammunition remaining, or for a different type of ammunition
            numActions++;
            await unloadMagazine(actor, magazineLoadedEffect, updates);
        }
    }

    // Get a magazine from the existing ammunition and create an effect to represent that magazine
    const magazineLoadedEffectSource = await Utils.getItem(Utils.MAGAZINE_LOADED_EFFECT_ID);
    Utils.setEffectTarget(magazineLoadedEffectSource, weapon);

    const magazineLoadedEffectFlags = magazineLoadedEffectSource.flags["pf2e-ranged-combat"];
    magazineLoadedEffectFlags.name = `${magazineLoadedEffectSource.name} (${ammo.name})`;
    magazineLoadedEffectFlags.capacity = ammo.charges.max;
    magazineLoadedEffectFlags.remaining = ammo.charges.current;
    magazineLoadedEffectFlags.ammunitionName = ammo.name;
    magazineLoadedEffectFlags.ammunitionImg = ammo.img;
    magazineLoadedEffectFlags.ammunitionItemId = ammo.id;
    magazineLoadedEffectFlags.ammunitionSourceId = ammo.sourceId;

    magazineLoadedEffectSource.name = `${magazineLoadedEffectSource.name} (${ammo.name}) (${ammo.charges.current}/${ammo.charges.max})`;

    updates.add(magazineLoadedEffectSource);

    await triggerCrossbowReloadEffects(actor, weapon, updates);

    numActions += 2;

    // Remove that magazine from the stack
    updates.update(async () => {
        await ammo.update({
            "data.quantity": ammo.quantity - 1,
            "data.charges.value": ammo.charges.max,
        });
    });

    await Utils.postInChat(
        actor,
        Utils.RELOAD_MAGAZINE_IMG,
        `${token.name} loads their ${weapon.name} with ${ammo.name} (${ammo.charges.current}/${ammo.charges.max}).`,
        "Interact",
        String(numActions)
    );

    await updates.handleUpdates();
}

async function unloadAmmunition(actor, loadedEffect, updates) {
    const loadedItemId = Utils.getFlag(loadedEffect, "ammunitionItemId");
    const loadedSourceId = Utils.getFlag(loadedEffect, "ammunitionSourceId");

    // Try to find either the stack the loaded ammunition came from, or another stack of the same ammunition
    const ammunitionItem = actor.items.find(item => item.id === loadedItemId && !item.isStowed)
        || actor.items.find(item => item.sourceId === loadedSourceId && !item.isStowed);

    if (ammunitionItem) {
        // We still have the stack the ammunition originally came from, or another that's the same.
        // Add the currently loaded ammunition to the stack
        updates.update(() => {
            ammunitionItem.update({
                "data.quantity": ammunitionItem.quantity + 1
            });
        });
    } else {
        // Create a new stack with one piece of ammunition in it
        const ammunitionSource = await Utils.getItem(loadedSourceId);
        ammunitionSource.data.quantity = 1;
        updates.add(ammunitionSource);
    }

    removeAmmunition(actor, loadedEffect, updates);
}

export function removeAmmunition(actor, loadedEffect, updates) {
    const loadedCapacity = Utils.getFlag(loadedEffect, "capacity");
    const loadedChambers = Utils.getFlag(loadedEffect, "loadedChambers") - 1;

    if (loadedCapacity && loadedChambers > 0) {
        updates.update(async () =>
            await loadedEffect.update({
                "name": `${Utils.getFlag(loadedEffect, "name")} (${loadedChambers}/${loadedCapacity})`,
                "flags.pf2e-ranged-combat.loadedChambers": loadedChambers,
                "flags.pf2e-ranged-combat.currentChamberLoaded": false
            })
        );
        updates.floatyText(`${Utils.getFlag(loadedEffect, "ammunitionName")} ${loadedChambers}/${loadedCapacity}`);
    } else {
        updates.update(() => loadedEffect.update({ "name": Utils.getFlag(loadedEffect, "name") }));
        updates.remove(loadedEffect);
    }
}

/**
 * Remove the magazine effect and add the remaining ammunition back to the actor
 */
async function unloadMagazine(actor, magazineLoadedEffect, updates) {
    const ammunitionCapacity = Utils.getFlag(magazineLoadedEffect, "capacity");
    const ammunitionRemaining = Utils.getFlag(magazineLoadedEffect, "remaining");

    const ammunitionItemId = Utils.getFlag(magazineLoadedEffect, "ammunitionItemId");
    const ammunitionItem = actor.items.find(item => item.id === ammunitionItemId && !item.isStowed);

    if (ammunitionRemaining === ammunitionCapacity && ammunitionItem) {
        // We found the original stack of ammunition this
        updates.update(() => {
            ammunitionItem.update({
                "data.quantity": ammunitionItem.quantity + 1
            });
        });
    } else if (ammunitionRemaining > 0) {
        // The magazine still has some ammunition left, create a new item with the remaining ammunition
        const itemSourceId = Utils.getFlag(magazineLoadedEffect, "ammunitionSourceId");
        const ammunitionSource = await Utils.getItem(itemSourceId);
        ammunitionSource.data.charges.value = ammunitionRemaining;
        updates.add(ammunitionSource);
    }

    // Finally, remove the existing effect
    updates.remove(magazineLoadedEffect);

    // If the weapon was loaded, then remove the loaded status as well
    const weaponId = Utils.getFlag(magazineLoadedEffect, "targetId");
    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weaponId);
    if (loadedEffect) {
        updates.remove(loadedEffect);
    }
}

export async function reloadAll() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (Utils.useAdvancedAmmunitionSystem(actor)) {
        ui.notifications.warn("You cannot use this macro with the Advanced Ammunition System active. Please reload each weapon individually.");
        return;
    }

    let weapons = getReloadableWeapons(actor);
    if (!weapons.length) {
        return;
    }

    weapons = weapons.filter(weapon => !Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id));
    if (!weapons.length) {
        ui.notifications.info("All your weapons are already loaded.");
        return;
    }

    const updates = new Updates(actor);

    for (const weapon of weapons) {
        const loadedEffect = await Utils.getItem(Utils.LOADED_EFFECT_ID);
        Utils.setEffectTarget(loadedEffect, weapon);
        updates.add(loadedEffect);
    }

    Utils.postInChat(actor, Utils.RELOAD_AMMUNITION_IMG, `${token.name} reloads their weapons.`, "Reload", "");
    await updates.handleUpdates();
}

export async function unload() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getLoadedWeapon(actor);
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
    const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect && !magazineLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is not loaded!`);
        return;
    } else {
        if (Utils.useAdvancedAmmunitionSystem(actor)) {
            if (weapon.isRepeating) {
                if (loadedEffect) {
                    updates.remove(loadedEffect);
                }
                if (magazineLoadedEffect) {
                    await unloadMagazine(actor, magazineLoadedEffect, updates);
                    Utils.postInChat(
                        actor,
                        magazineLoadedEffect.img,
                        `${token.name} unloads ${Utils.getFlag(magazineLoadedEffect, "ammunitionName")} from their ${weapon.name}.`,
                        "Interact",
                        "1"
                    );
                }
            } else {
                await unloadAmmunition(actor, loadedEffect, updates);
                if (Utils.useAdvancedAmmunitionSystem(actor)) {
                    Utils.postInChat(
                        actor,
                        loadedEffect.img,
                        `${token.name} unloads ${Utils.getFlag(loadedEffect, "ammunitionName")} from their ${weapon.name}.`,
                        "Interact",
                        "1"
                    );
                }
            }
        } else if (loadedEffect) {
            updates.remove(loadedEffect);
        }
    }

    await updates.handleUpdates();
}

export async function consolidateRepeatingWeaponAmmunition() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    // Find all the repeating ammunition stacks
    const ammunitionStacks = actor.itemTypes.consumable.filter(consumable => consumable.isAmmunition && consumable.charges.max > 1);
    const ammunitionStacksBySourceId = ammunitionStacks.reduce(
        function(map, stack) {
            const mapEntry = map[stack.sourceId];
            if (!mapEntry) {
                map[stack.sourceId] = {
                    stacks: [stack],
                    totalCharges: getTotalChargesForStack(stack)
                };
            } else {
                mapEntry.stacks.push(stack);
                mapEntry.totalCharges += getTotalChargesForStack(stack);
            }
            return map;
        },
        {}
    );

    const updates = new Updates(actor);

    for (const sourceId in ammunitionStacksBySourceId) {
        const stackEntry = ammunitionStacksBySourceId[sourceId];
        const stacks = stackEntry.stacks;

        const maxChargesPerItem = stacks[0].charges.max;

        // Work out if we need to consolidate:
        // - We have one stack with zero quantity
        // - OR we have:
        //   - Optionally, one stack fully-charge with non-zero quantity
        //   - Optionally, one stack with quantity 1 and not fully-charged
        // - AND
        //   - We have no other stacks
        const haveEmptyStack = stacks.some(stack => stack.quantity === 0);
        const haveFullStack = stacks.some(stack => stack.quantity > 0 && stack.charges.current === stack.charges.max);
        const haveNonFullStack = stacks.some(stack => stack.quantity === 1 && stack.charges.current !== stack.charges.max);
        if ((haveEmptyStack && stacks.length === 1) || stacks.length === haveFullStack + haveNonFullStack) {
            continue;
        }

        const remainingCharges = stackEntry.totalCharges % maxChargesPerItem;
        const quantityFullCharges = (stackEntry.totalCharges - remainingCharges) / maxChargesPerItem;

        let index = 0;

        // Make one stack of fully-charged items
        if (quantityFullCharges) {
            const indexNow = index;
            updates.update(async () => {
                await stacks[indexNow].update({
                    "data.quantity": quantityFullCharges,
                    "data.charges.value": maxChargesPerItem
                });
            });
            index++;
        }

        // Make one stack of one item with the remaining charges
        if (remainingCharges) {
            if (index >= stacks.length) {
                const newStackSource = await Utils.getItem(sourceId);
                newStackSource.data.quantity = 1;
                newStackSource.data.charges.value = remainingCharges;
                updates.add(newStackSource);
            } else {
                const indexNow = index;
                updates.update(async () => {
                    await stacks[indexNow].update({
                        "data.quantity": 1,
                        "data.charges.value": remainingCharges
                    });
                });
                index++;
            }
        }

        // Remove the rest of the stacks
        while (index < stacks.length) {
            updates.remove(stacks[index]);
            index++;
        }
    }

    if (updates.hasChanges()) {
        Utils.postInChat(
            actor,
            ammunitionStacks[0].img,
            `${token.name} consolidates their ammunition.`,
            "Interact",
            ""
        );
        await updates.handleUpdates();
    } else {
        ui.notifications.info("Your repeating ammunition is already consolidated!");
    }
}

function getTotalChargesForStack(stack) {
    return stack.quantity > 0 ? stack.charges.current + (stack.quantity - 1) * stack.charges.max : 0;
}

async function getLoadedWeapon(actor) {
    return WeaponUtils.getWeapon(
        actor,
        weapon => {
            if (weapon.isRepeating) {
                return Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            } else if (weapon.requiresLoading) {
                return Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
            }
            return false;
        },
        "You have no loaded weapons."
    );
}

function getReloadableWeapons(actor) {
    return WeaponUtils.getWeapons(actor, weapon => weapon.requiresLoading, "You have no reloadable weapons.");
}

function getCapacityWeapons(actor) {
    return WeaponUtils.getWeapons(actor, weapon => weapon.capacity, "You have no weapons with the capacity trait.");
}

async function postReloadToChat(token, weapon, ammunitionName) {
    const reloadActions = weapon.reload;
    let desc = `${token.name} reloads their ${weapon.name}`;
    if (ammunitionName) {
        desc = `${desc} with ${ammunitionName}.`;
    } else {
        desc = `${desc}.`;
    }

    await Utils.postInChat(
        token.actor,
        Utils.RELOAD_AMMUNITION_IMG,
        desc,
        "Interact",
        reloadActions <= 3 ? String(reloadActions) : "",
    );
}

async function triggerCrossbowReloadEffects(actor, weapon, updates) {
    const crossbowFeats = [
        { featId: Utils.CROSSBOW_ACE_FEAT_ID, effectId: Utils.CROSSBOW_ACE_EFFECT_ID },
        { featId: Utils.CROSSBOW_CRACK_SHOT_FEAT_ID, effectId: Utils.CROSSBOW_CRACK_SHOT_EFFECT_ID }
    ];

    // Handle crossbow effects that trigger on reload
    if (weapon.isCrossbow && weapon.isEquipped) {
        for (const crossbowFeat of crossbowFeats) {
            const featId = crossbowFeat.featId;
            const effectId = crossbowFeat.effectId;

            if (Utils.actorHasItem(actor, featId)) {
                // Remove any existing effects
                const existing = Utils.getEffectFromActor(actor, effectId, weapon.id);
                if (existing) {
                    updates.remove(existing);
                }

                // Add the new effect
                const effect = await Utils.getItem(effectId);
                Utils.setEffectTarget(effect, weapon);
                effect.flags["pf2e-ranged-combat"].fired = false;

                updates.add(effect);
            }
        }
    }
}
