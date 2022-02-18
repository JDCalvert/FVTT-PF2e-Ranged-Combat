import * as Utils from "../utils.js";

export async function reload() {
    const itemsToAdd = [];
    const itemsToRemove = [];
    const itemsToUpdate = [];

    const token = Utils.getControlledToken();
    const actor = token?.actor;
    if (!token) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.")
        return;
    }

    const weapon = await Utils.getSingleWeapon(getReloadableWeapons(actor));
    if (!weapon) {
        return;
    }

    if (Utils.useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            // With a repeating weapon, we only need to have a magazine loaded with at least one ammunition remaining. The ammunition itself
            // is still only consumed when we fire
            const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (!magazineLoadedEffect) {
                ui.notifications.warn(`${weapon.name} has no magazine loaded!`);
                return;
            } else if (magazineLoadedEffect.getFlag("pf2e-ranged-combat", "remaining") < 1) {
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
            itemsToAdd.push(loadedEffectSource);

            await postReloadToChat(token, weapon, loadedEffectSource);
        } else {
            // If we have no ammunition selected, or we don't have any left in the stack, we can't reload
            const ammo = Utils.getAmmunition(weapon.value);
            if (!ammo) {
                ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
                return;
            } else if (ammo.quantity < 1) {
                ui.notifications.warn(`Not enough ammunition to reload ${weapon.name}`);
                return;
            }

            // If the weapon is already loaded, unload the current ammunition first
            const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                // If the selected ammunition is the same as what's already loaded, don't reload
                const loadedSourceId = loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionSourceId");
                if (ammo.sourceId === loadedSourceId) {
                    ui.notifications.warn(`${weapon.name} is already loaded with ${ammo.name}.`);
                    return;
                }
                await unloadAmmunition(actor, loadedEffect, itemsToAdd, itemsToRemove, itemsToUpdate);
            }

            // Now we can load the new ammunition
            const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
            itemsToAdd.push(loadedEffectSource);

            Utils.setEffectTarget(loadedEffectSource, weapon);
            loadedEffectSource.name = `${loadedEffectSource.name} (${ammo.name})`;

            const loadedEffectSourceFlags = loadedEffectSource.flags["pf2e-ranged-combat"];
            loadedEffectSourceFlags.ammunitionName = ammo.name;
            loadedEffectSourceFlags.ammunitionImg = ammo.img;
            loadedEffectSourceFlags.ammunitionItemId = ammo.id;
            loadedEffectSourceFlags.ammunitionSourceId = ammo.sourceId;

            // Remove one piece of ammunition from the stack
            itemsToUpdate.push(async () => {
                await ammo.update({
                    "data.quantity.value": ammo.quantity - 1
                });
            });

            await postReloadToChat(token, weapon, loadedEffectSource);
        }
    } else {
        // If the weapon is already loaded, we don't need to do it again
        const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
        if (loadedEffect) {
            ui.notifications.warn(`${weapon.name} is already loaded.`);
            return;
        }

        // Create the new loaded effect
        const loadedEffectSource = await Utils.getItem(Utils.LOADED_EFFECT_ID);
        Utils.setEffectTarget(loadedEffectSource, weapon);
        itemsToAdd.push(loadedEffectSource);

        await postReloadToChat(token, weapon, loadedEffectSource);
    }

    await triggerCrossbowReloadEffects(actor, weapon, itemsToAdd, itemsToRemove);

    Utils.handleUpdates(actor, itemsToAdd, itemsToRemove, itemsToUpdate);
};

/**
 * Replace the magazine in a repeating weapon.
 * - If no new magazine is selected, only remove the current magazine.
 * - If no new magazine is selected and there is no current magazine, show an error.
 * - If a new magazine is selected and it is different to, or has different remaining ammunition to, the current magazine:
 *     - Remove the existing magazine, if there is one (one action)
 *     - Load the new magazine (two actions)
 */
export async function reloadMagazine() {
    const token = Utils.getControlledToken();
    const actor = token?.actor || game.user.character;
    if (!token || !actor) {
        ui.notifications.warn("You must have exactly one token selected or an assigned character.");
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

    const weapon = await Utils.getSingleWeapon(getRepeatingWeapons(actor));
    if (!weapon) {
        return;
    }

    const itemsToAdd = [];
    const itemsToRemove = [];
    const itemsToUpdate = [];

    // If we have no ammunition selected, or we have none left in the stack, we can't reload
    const ammo = Utils.getAmmunition(weapon.value);
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
        const magazineRemaining = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "remaining");
        const magazineCapacity = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "capacity");

        const magazineSourceId = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionSourceId");
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
            await unloadMagazine(actor, magazineLoadedEffect, itemsToAdd, itemsToRemove, itemsToUpdate);
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

    itemsToAdd.push(magazineLoadedEffectSource);

    await triggerCrossbowReloadEffects(actor, weapon, itemsToAdd, itemsToRemove);

    numActions += 2;

    // Remove that magazine from the stack
    await ammo.update({
        "data.quantity.value": ammo.quantity - 1,
        "data.charges.value": ammo.charges.max,
    });

    await Utils.postInChat(
        actor,
        magazineLoadedEffectSource.img,
        `${token.name} loads their ${weapon.name} with ${ammo.name} (${ammo.charges.current}/${ammo.charges.max}).`,
        "Interact",
        String(numActions)
    );

    Utils.handleUpdates(actor, itemsToAdd, itemsToRemove, itemsToUpdate);
}

async function unloadAmmunition(actor, loadedEffect, itemsToAdd, itemsToRemove, itemsToUpdate) {
    const loadedItemId = loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionItemId");
    const loadedSourceId = loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionSourceId");

    // Try to find either the stack the loaded ammunition came from, or another stack of the same ammunition
    const ammunitionItem = actor.items.find(item => item.id === loadedItemId)
        || actor.items.find(item => item.sourceId === loadedSourceId);

    if (ammunitionItem) {
        // We still have the stack the ammunition originally came from, or another that's the same.
        // Add the currently loaded ammunition to the stack
        itemsToUpdate.push(() => {
            ammunitionItem.update({
                "data.quantity.value": ammunitionItem.quantity + 1
            });
        });
    } else {
        // Create a new stack with one piece of ammunition in it
        const ammunitionSource = await Utils.getItem(loadedSourceId);
        ammunitionSource.data.quantity.value = 1;
        itemsToAdd.push(ammunitionSource);
    }

    itemsToRemove.push(loadedEffect);
}

/**
 * Remove the magazine effect and add the remaining ammunition back to the actor
 */
async function unloadMagazine(actor, magazineLoadedEffect, itemsToAdd, itemsToRemove, itemsToUpdate) {
    const ammunitionCapacity = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "capacity");
    const ammunitionRemaining = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "remaining");

    const ammunitionItemId = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionItemId");
    const ammunitionItem = actor.items.find(item => item.id === ammunitionItemId);

    if (ammunitionRemaining === ammunitionCapacity && ammunitionItem) {
        // The magazine is full, but we've got different ammunition selected, so switch to that
        itemsToUpdate.push(() => {
            ammunitionItem.update({
                "data.quantity.value": ammunitionItem.quantity + 1
            });
        });
    } else if (ammunitionRemaining > 0) {
        // The magazine still has some ammunition left, create a new item with the remaining ammunition
        const itemSourceId = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionSourceId");
        const ammunitionSource = await Utils.getItem(itemSourceId);
        ammunitionSource.data.charges.value = ammunitionRemaining;
        itemsToAdd.push(ammunitionSource);
    }

    // Finally, remove the existing effect
    itemsToRemove.push(magazineLoadedEffect);

    // If the weapon was loaded, then remove the loaded status as well
    const weaponId = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "targetId");
    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weaponId);
    if (loadedEffect) {
        itemsToRemove.push(loadedEffect);
    }
}

export async function reloadAll() {
    const token = Utils.getControlledToken();
    const actor = token?.actor;
    if (!token) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.");
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

    const effectsToAdd = [];

    const promises = weapons.map(async weapon => {
        const loadedEffect = await Utils.getItem(Utils.LOADED_EFFECT_ID);
        Utils.setEffectTarget(loadedEffect, weapon);
        effectsToAdd.push(loadedEffect);
    });

    const loadedEffect = await fromUuid(Utils.LOADED_EFFECT_ID);
    Utils.postInChat(actor, loadedEffect.img, `${token.name} reloads their weapons.`, "Reload", "");

    await Promise.all(promises);
    token.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

export async function unload() {
    const token = Utils.getControlledToken();
    const actor = token?.actor;
    if (!token) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.");
        return;
    }

    const weapon = await Utils.getSingleWeapon(getReloadableOrRepeatingWeapons(actor));
    if (!weapon) {
        return;
    }

    const itemsToAdd = [];
    const itemsToRemove = [];
    const itemsToUpdate = [];

    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
    const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect && !magazineLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is not loaded!`);
        return;
    } else {
        if (Utils.useAdvancedAmmunitionSystem(actor)) {
            if (weapon.isRepeating) {
                if (loadedEffect) {
                    itemsToRemove.push(loadedEffect);
                }
                if (magazineLoadedEffect) {
                    await unloadMagazine(actor, magazineLoadedEffect, itemsToAdd, itemsToRemove, itemsToUpdate);
                    Utils.postInChat(
                        actor,
                        magazineLoadedEffect.img,
                        `${token.name} unloads ${magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")} from their ${weapon.name}.`,
                        "Interact",
                        "1"
                    );
                }
            } else {
                await unloadAmmunition(actor, loadedEffect, itemsToAdd, itemsToRemove, itemsToUpdate);
                if (Utils.useAdvancedAmmunitionSystem(actor)) {
                    Utils.postInChat(
                        actor,
                        loadedEffect.img,
                        `${token.name} unloads ${loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")} from their ${weapon.name}.`,
                        "Interact",
                        "1"
                    );
                }
            }
        } else if (loadedEffect) {
            itemsToRemove.push(loadedEffect);
        }
    }

    Utils.handleUpdates(actor, itemsToAdd, itemsToRemove, itemsToUpdate);
}

export async function consolidateRepeatingWeaponAmmunition() {
    const token = Utils.getControlledToken();
    const actor = token?.actor;
    if (!token) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.");
        return;
    }

    // Find all the repeating ammunition stacks
    const ammunitionStacks = actor.itemTypes.consumable.filter(consumable => consumable.isAmmunition && consumable.charges.max > 1);
    const ammunitionStacksBySourceId = ammunitionStacks.reduce(
        function (map, stack) {
            const mapEntry = map[stack.sourceId];
            if (!mapEntry) {
                map[stack.sourceId] = {
                    stacks: [stack],
                    totalCharges: getTotalChargesForStack(stack)
                }
            } else {
                mapEntry.stacks.push(stack);
                mapEntry.totalCharges += getTotalChargesForStack(stack);
            }
            return map;
        },
        {}
    );

    const itemsToAdd = [];
    const itemsToRemove = [];
    const itemsToUpdate = [];

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
            itemsToUpdate.push(async () => {
                await stacks[indexNow].update({
                    "data.quantity.value": quantityFullCharges,
                    "data.charges.value": maxChargesPerItem
                });
            });
            index++;
        }

        // Make one stack of one item with the remaining charges
        if (remainingCharges) {
            if (index >= stacks.length) {
                const newStackSource = await Utils.getItem(sourceId);
                newStackSource.data.quantity.value = 1;
                newStackSource.data.charges.value = remainingCharges;
                itemsToAdd.push(newStackSource);
            } else {
                const indexNow = index;
                itemsToUpdate.push(async () => {
                    await stacks[indexNow].update({
                        "data.quantity.value": 1,
                        "data.charges.value": remainingCharges
                    });
                });
                index++;
            }
        }

        // Remove the rest of the stacks
        while (index < stacks.length) {
            itemsToRemove.push(stacks[index]);
            index++;
        }
    }

    if (itemsToAdd.length || itemsToRemove.length || itemsToUpdate.length) {
        Utils.postInChat(
            actor,
            ammunitionStacks[0].img,
            `${token.name} consolidates their ammunition.`,
            "Interact",
            ""
        );
        Utils.handleUpdates(actor, itemsToAdd, itemsToRemove, itemsToUpdate);
    } else {
        ui.notifications.info("Your repeating ammunition is already consolidated!");
    }
}

function getTotalChargesForStack(stack) {
    return stack.quantity > 0 ? stack.charges.current + (stack.quantity - 1) * stack.charges.max : 0;
}

function getReloadableOrRepeatingWeapons(actor) {
    return getWeapons(actor, weapon => Utils.requiresLoading(weapon) || Utils.isRepeating(weapon), "You have no reloadable or repeating weapons.");
}

function getReloadableWeapons(actor) {
    return getWeapons(actor, weapon => Utils.requiresLoading(weapon), "You have no reloadable weapons.");
}

function getRepeatingWeapons(actor) {
    return getWeapons(actor, weapon => Utils.isRepeating(weapon), "You have no repeating weapons.");
}

function getWeapons(actor, predicate, noResultsMessage) {
    let weapons;

    if (actor.type === "character") {
        weapons = actor.itemTypes.weapon
            .filter(predicate)
            .map(characterWeaponTransform);
    } else if (actor.type === "npc") {
        weapons = actor.itemTypes.melee
            .filter(predicate)
            .map(npcWeaponTransform);
    } else {
        weapons = [];
    }

    if (!weapons.length) {
        ui.notifications.warn(noResultsMessage);
    }
    return weapons;
}

function characterWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.id,
        name: weapon.name,
        img: weapon.img,
        reload: Utils.getReloadTime(weapon),
        isRepeating: Utils.isRepeating(weapon),
        isEquipped: weapon.isEquipped,
        isCrossbow: weapon.data.data.traits.otherTags.includes("crossbow")
    }
}

function npcWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.id,
        name: weapon.name,
        img: weapon.img,
        reload: Utils.getReloadTime(weapon),
        isRepeating: Utils.isRepeating(weapon),
        isEquipped: true,
        isCrossbow: false
    }
}

async function postReloadToChat(token, weapon, loadedEffectSource) {
    // Find out which reload action to use and post it to chat
    const reloadActions = weapon.reload;
    const reloadActionId = (() => {
        switch (reloadActions) {
            case 1:
                return Utils.RELOAD_ACTION_ONE_ID;
            case 2:
                return Utils.RELOAD_ACTION_TWO_ID;
            case 3:
                return Utils.RELOAD_ACTION_THREE_ID;
            default:
                return Utils.RELOAD_ACTION_EXPLORE_ID;
        }
    })();

    // Post into chat that we've reloaded
    await Utils.postActionInChat(token.actor, reloadActionId);

    const ammunitionName = loadedEffectSource.flags["pf2e-ranged-combat"]?.ammunitionName;
    let desc = `${token.name} reloads their ${weapon.name}`;
    if (ammunitionName) {
        desc = `${desc} with ${ammunitionName}.`;
    } else {
        desc = `${desc}.`;
    }

    await Utils.postInChat(
        token.actor,
        loadedEffectSource.img,
        desc,
        "Interact",
        reloadActions <= 3 ? String(reloadActions) : "",
    );
}

async function triggerCrossbowReloadEffects(actor, weapon, itemsToAdd, itemsToRemove) {
    const crossbowFeats = [
        {
            featId: Utils.CROSSBOW_ACE_FEAT_ID,
            effectId: Utils.CROSSBOW_ACE_EFFECT_ID
        },
        {
            featId: Utils.CROSSBOW_CRACK_SHOT_FEAT_ID,
            effectId: Utils.CROSSBOW_CRACK_SHOT_EFFECT_ID
        }
    ];

    // Handle crossbow effects that trigger on reload
    if (weapon.isCrossbow && weapon.isEquipped) {
        for (const crossbowFeat of crossbowFeats) {
            const featId = crossbowFeat.featId;
            const effectId = crossbowFeat.effectId;

            if (Utils.actorHasItem(actor, featId)) {
                // Remove any existing effects
                const existing = Utils.getEffectFromActor(actor, effectId, weapon.id);
                if (existing) itemsToRemove.push(existing);

                // Add the new effect
                const effect = await Utils.getItem(effectId);
                Utils.setEffectTarget(effect, weapon);

                itemsToAdd.push(effect);
            }
        }
    }
}