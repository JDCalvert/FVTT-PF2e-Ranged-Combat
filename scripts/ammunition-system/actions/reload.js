import { CROSSBOW_ACE_EFFECT_ID, CROSSBOW_ACE_FEAT_ID, CROSSBOW_CRACK_SHOT_EFFECT_ID, CROSSBOW_CRACK_SHOT_FEAT_ID, getControlledActorAndToken, getEffectFromActor, getFlag, getItem, getItemFromActor, postInChat, setEffectTarget, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CHAMBER_LOADED_EFFECT_ID, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID, RELOAD_AMMUNITION_IMG } from "../constants.js";
import { isFullyLoaded } from "../utils.js";
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
                ui.notifications.warn(`${weapon.name} has no magazine loaded!`);
                return;
            } else if (getFlag(magazineLoadedEffect, "remaining") < 1) {
                ui.notifications.warn(`${weapon.name}'s magazine is empty!`);
                return;
            }

            // If the weapon is already loaded, we don't need to do it again
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                ui.notifications.warn(`${weapon.name} is already loaded.`);
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
                ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
                return;
            } else if (ammo.quantity < 1) {
                ui.notifications.warn(`Not enough ammunition to reload ${weapon.name}.`);
                return;
            }

            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);

            if (weapon.capacity) {
                // If some chambers are already loaded, we only want to load with the same type of ammunition
                if (loadedEffect) {
                    const loadedChambers = getFlag(loadedEffect, "loadedChambers");
                    const loadedCapacity = getFlag(loadedEffect, "capacity");
                    const loadedSourceId = getFlag(loadedEffect, "ammunitionSourceId");
                    if (ammo.sourceId !== loadedSourceId) {
                        ui.notifications.warn(`${weapon.name} is already loaded with ${loadedChambers} ${getFlag(loadedEffect, "ammunitionName")}.`);
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
                if (weapon.isCapacity && !getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)) {
                    await setLoadedChamber(weapon, updates);
                }

                await postReloadToChat(token, weapon, ammo.name);
            } else {
                // If the weapon is already loaded, then either unload the current ammunition (if different from the new ammunition)
                // or don't reload at all
                if (loadedEffect) {
                    // If the selected ammunition is the same as what's already loaded, don't reload
                    const loadedSourceId = getFlag(loadedEffect, "ammunitionSourceId");
                    if (ammo.sourceId === loadedSourceId) {
                        ui.notifications.warn(`${weapon.name} is already loaded with ${ammo.name}.`);
                        return;
                    }
                    await unloadAmmunition(actor, weapon, updates);
                }

                // Now we can load the new ammunition
                const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                updates.add(loadedEffectSource);

                setEffectTarget(loadedEffectSource, weapon);
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
        const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);

        if (weapon.capacity) {
            if (loadedEffect) {
                const loadedChambers = getFlag(loadedEffect, "loadedChambers");
                const loadedCapacity = getFlag(loadedEffect, "capacity");

                if (loadedChambers === loadedCapacity) {
                    ui.notifications.warn(`${weapon.name} is fully loaded.`);
                    return;
                }

                updates.update(() => loadedEffect.update({
                    "name": `${getFlag(loadedEffect, "name")} (${loadedChambers + 1}/${loadedCapacity})`,
                    "flags.pf2e-ranged-combat.loadedChambers": loadedChambers + 1
                }));
                updates.floatyText(`${getFlag(loadedEffect, "name")} (${loadedChambers + 1}/${loadedCapacity})`, true);

                if (weapon.isCapacity && !getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)) {
                    await setLoadedChamber(weapon, updates);
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
                    await setLoadedChamber(weapon, updates);
                }
            }
        } else {
            if (loadedEffect) {
                ui.notifications.warn(`${weapon.name} is already loaded.`);
                return;
            }

            // Create the new loaded effect
            const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
            setEffectTarget(loadedEffectSource, weapon);
            updates.add(loadedEffectSource);
        }
        await postReloadToChat(token, weapon);
    }

    await triggerCrossbowReloadEffects(actor, weapon, updates);

    updates.handleUpdates();
};

export async function reloadAll() {
    ui.notifications.warn("Reload All is deprecated, will not work for capacity weapons, and will be removed in version 3.0.0");

    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (useAdvancedAmmunitionSystem(actor)) {
        ui.notifications.warn("You cannot use this macro with the Advanced Ammunition System active. Please reload each weapon individually.");
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

async function triggerCrossbowReloadEffects(actor, weapon, updates) {
    const crossbowFeats = [
        { featId: CROSSBOW_ACE_FEAT_ID, effectId: CROSSBOW_ACE_EFFECT_ID },
        { featId: CROSSBOW_CRACK_SHOT_FEAT_ID, effectId: CROSSBOW_CRACK_SHOT_EFFECT_ID }
    ];

    // Handle crossbow effects that trigger on reload
    if (weapon.isCrossbow && weapon.isEquipped) {
        for (const crossbowFeat of crossbowFeats) {
            const featId = crossbowFeat.featId;
            const effectId = crossbowFeat.effectId;

            if (getItemFromActor(actor, featId)) {
                // Remove any existing effects
                const existing = getEffectFromActor(actor, effectId, weapon.id);
                if (existing) {
                    updates.remove(existing);
                }

                // Add the new effect
                const effect = await getItem(effectId);
                setEffectTarget(effect, weapon);
                effect.flags["pf2e-ranged-combat"].fired = false;

                updates.add(effect);
            }
        }
    }
}
