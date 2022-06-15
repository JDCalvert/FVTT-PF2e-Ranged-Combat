import { getControlledActorAndToken, getEffectFromActor, getFlag, getItem, postInChat, setEffectTarget, showWarning, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CONJURED_ROUND_EFFECT_ID, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID, RELOAD_AMMUNITION_IMG } from "../constants.js";
import { checkFullyLoaded, isFullyLoaded, triggerCrossbowReloadEffects } from "../utils.js";
import { setLoadedChamber } from "./next-chamber.js";
import { unloadAmmunition } from "./unload.js";

export async function reload() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getSingleWeapon(
        getWeapons(actor, weapon => weapon.requiresLoading, "You have no reloadable weapons."),
        weapon => !isFullyLoaded(actor, weapon)
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    if (useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            // With a repeating weapon, we only need to have a magazine loaded with at least one ammunition remaining. The ammunition itself
            // is still only consumed when we fire
            const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (!magazineLoadedEffect) {
                showWarning(`${weapon.name} has no magazine loaded!`);
                return;
            } else if (getFlag(magazineLoadedEffect, "remaining") < 1) {
                showWarning(`${weapon.name}'s magazine is empty!`);
                return;
            }

            // If the weapon is already loaded, we don't need to do it again
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                showWarning(`${weapon.name} is already loaded.`);
                return;
            }

            // Create the new loaded effect
            const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
            setEffectTarget(loadedEffectSource, weapon);
            updates.add(loadedEffectSource);

            await postReloadToChat(token, weapon);
        } else {
            // If we have no ammunition selected, or we don't have any left in the stack, we can't reload
            const ammo = weapon.ammunition;
            if (!ammo) {
                showWarning(`${weapon.name} has no ammunition selected.`);
                return;
            } else if (ammo.quantity < 1) {
                showWarning(`Not enough ammunition to reload ${weapon.name}.`);
                return;
            }

            if (weapon.capacity) {
                if (isFullyLoaded(actor, weapon)) {
                    showWarning(`${weapon.name} is already fully loaded.`);
                    return;
                }

                // If some chambers are already loaded, we only want to load with the same type of ammunition
                const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
                if (loadedEffect) {
                    const loadedSourceId = getFlag(loadedEffect, "ammunitionSourceId");
                    const loadedAmmunitionName = getFlag(loadedEffect, "ammunitionName");
                    const loadedChambers = getFlag(loadedEffect, "loadedChambers");
                    const loadedCapacity = getFlag(loadedEffect, "capacity");

                    if (ammo.sourceId !== loadedSourceId) {
                        showWarning(`${weapon.name} is already loaded with ${loadedChambers} ${loadedAmmunitionName}.`);
                        return;
                    }

                    // Increase the number of loaded chambers by one
                    updates.update(async () => {
                        await loadedEffect.update({
                            "flags.pf2e-ranged-combat.loadedChambers": loadedChambers + 1,
                            "name": `${getFlag(loadedEffect, "name")} (${loadedChambers + 1}/${loadedCapacity})`
                        });
                    });
                    updates.floatyText(`${getFlag(loadedEffect, "name")} ${loadedChambers + 1}/${loadedCapacity}`, true);
                } else {
                    // No chambers are loaded, so create a new loaded effect
                    const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                    updates.add(loadedEffectSource);

                    setEffectTarget(loadedEffectSource, weapon);

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
                }

                // For a capacity weapon, if the selected chamber isn't loaded, assume the chamber being loaded is the selected one
                if (weapon.isCapacity) {
                    await setLoadedChamber(actor, weapon, updates);
                }

                await postReloadToChat(token, weapon, ammo.name);
            } else {
                // If the weapon is already loaded with the same type of ammunition as we're loading, don't reload
                // Otherwise, unload the existing round before loading the new one
                const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
                const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
                if (conjuredRoundEffect) {
                    updates.remove(conjuredRoundEffect);
                } else if (loadedEffect) {
                    // If the selected ammunition is the same as what's already loaded, don't reload
                    const loadedSourceId = getFlag(loadedEffect, "ammunitionSourceId");
                    if (ammo.sourceId === loadedSourceId) {
                        showWarning(`${weapon.name} is already loaded with ${ammo.name}.`);
                        return;
                    }
                    await unloadAmmunition(actor, weapon, updates);
                }

                // Now we can load the new ammunition
                const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                updates.add(loadedEffectSource);

                setEffectTarget(loadedEffectSource, weapon);
                loadedEffectSource.name = `${loadedEffectSource.name} (${ammo.name})`;
                loadedEffectSource.flags["pf2e-ranged-combat"] = {
                    ...loadedEffectSource.flags["pf2e-ranged-combat"],
                    ammunitionName: ammo.name,
                    ammunitionImg: ammo.img,
                    ammunitionItemId: ammo.id,
                    ammunitionSourceId: ammo.sourceId
                };

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
        if (checkFullyLoaded(actor, weapon)) {
            return;
        }

        // If the weapon is already loaded, we don't need to do it again
        const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);

        if (weapon.capacity) {
            if (loadedEffect) {
                const loadedChambers = getFlag(loadedEffect, "loadedChambers");
                const loadedCapacity = getFlag(loadedEffect, "capacity");

                updates.update(() => loadedEffect.update({
                    "name": `${getFlag(loadedEffect, "name")} (${loadedChambers + 1}/${loadedCapacity})`,
                    "flags.pf2e-ranged-combat.loadedChambers": loadedChambers + 1
                }));
                updates.floatyText(`${getFlag(loadedEffect, "name")} (${loadedChambers + 1}/${loadedCapacity})`, true);

                if (weapon.isCapacity) {
                    await setLoadedChamber(actor, weapon, updates);
                }
            } else {
                const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                setEffectTarget(loadedEffectSource, weapon);
                updates.add(loadedEffectSource);

                const loadedEffectName = loadedEffectSource.name;
                loadedEffectSource.name = `${loadedEffectName} (1/${weapon.capacity})`;
                loadedEffectSource.flags["pf2e-ranged-combat"] = {
                    ...loadedEffectSource.flags["pf2e-ranged-combat"],
                    name: loadedEffectName,
                    loadedChambers: 1,
                    capacity: weapon.capacity,
                    currentChamberLoaded: true
                };

                if (weapon.isCapacity) {
                    await setLoadedChamber(actor, weapon, updates);
                }
            }
        } else {
            // Create the new loaded effect
            const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
            setEffectTarget(loadedEffectSource, weapon);
            updates.add(loadedEffectSource);
        }
        await postReloadToChat(token, weapon);
    }

    await triggerCrossbowReloadEffects(actor, token, weapon, updates);

    updates.handleUpdates();
};

export async function reloadAll() {
    showWarning("Reload All is deprecated, will not work for capacity weapons, and will be removed in version 3.0.0");

    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (useAdvancedAmmunitionSystem(actor)) {
        showWarning("You cannot use this macro with the Advanced Ammunition System active. Please reload each weapon individually.");
        return;
    }

    let weapons = getWeapons(actor, weapon => weapon.requiresLoading, "You have no reloadable weapons.");
    if (!weapons.length) {
        return;
    }

    weapons = weapons.filter(weapon => !getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id));
    if (!weapons.length) {
        ui.notifications.info("All your weapons are already loaded.");
        return;
    }

    const updates = new Updates(actor);

    for (const weapon of weapons) {
        const loadedEffect = await getItem(LOADED_EFFECT_ID);
        setEffectTarget(loadedEffect, weapon);
        updates.add(loadedEffect);
    }

    postInChat(actor, RELOAD_AMMUNITION_IMG, `${token.name} reloads their weapons.`, "Reload", "");
    await updates.handleUpdates();
}

async function postReloadToChat(token, weapon, ammunitionName) {
    const reloadActions = weapon.reload;
    let desc = `${token.name} reloads their ${weapon.name}`;
    if (ammunitionName) {
        desc = `${desc} with ${ammunitionName}.`;
    } else {
        desc = `${desc}.`;
    }

    await postInChat(
        token.actor,
        RELOAD_AMMUNITION_IMG,
        desc,
        "Interact",
        reloadActions <= 3 ? String(reloadActions) : "",
    );
}
