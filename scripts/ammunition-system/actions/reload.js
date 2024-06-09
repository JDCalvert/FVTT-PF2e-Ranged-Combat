import { CapacityLoadedEffect } from "../../types/pf2e-ranged-combat/loaded-effect.js";
import { Weapon } from "../../types/pf2e-ranged-combat/weapon.js";
import { PF2eActor } from "../../types/pf2e/actor.js";
import { PF2eConsumable } from "../../types/pf2e/consumable.js";
import { PF2eToken } from "../../types/pf2e/token.js";
import { HookManager } from "../../utils/hook-manager.js";
import { getControlledActorAndToken, getEffectFromActor, getFlag, getFlags, getItem, postToChat, setEffectTarget, showWarning, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CONJURED_ROUND_EFFECT_ID, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID, RELOAD_AMMUNITION_IMG } from "../constants.js";
import { buildLoadedEffectName, checkFullyLoaded, isFullyLoaded, updateAmmunitionQuantity } from "../utils.js";
import { setLoadedChamber } from "./next-chamber.js";
import { selectAmmunition } from "./switch-ammunition.js";
import { unloadAmmunition } from "./unload.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.reload." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.reload." + key, data);

class ReloadOptions {
    /** @type boolean */
    fullyReload;
}

export async function reload() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.requiresLoading,
        localize("warningNoReloadableWeapons"),
        weapon => !isFullyLoaded(weapon)
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    await performReload(actor, token, weapon, updates);

    updates.handleUpdates();
}

export async function fullyReload() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.requiresLoading && weapon.capacity,
        localize("warningNoReloadableCapacityWeapons"),
        weapon => !isFullyLoaded(weapon)
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    await performReload(actor, token, weapon, updates, { fullyReload: true });

    updates.handleUpdates();
}

export async function reloadNPCs() {
    try {
        CONFIG.pf2eRangedCombat.silent = true;

        const nonPlayerTokens = Array.from(canvas.scene.tokens).filter(token => !token.actor.hasPlayerOwner);
        for (const token of nonPlayerTokens) {
            const actor = token.actor;
            const weapons = getWeapons(
                actor,
                weapon => weapon.requiresLoading,
                localize("noReloadableWeapons"),
            );

            const updates = new Updates(actor);

            for (const weapon of weapons) {
                await performReload(actor, token, weapon, updates);
            }

            updates.handleUpdates();
        }
    } finally {
        CONFIG.pf2eRangedCombat.silent = false;
    }
}

/**
 * @param {PF2eActor} actor 
 * @param {PF2eToken} token 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @param {ReloadOptions} options
 */
export async function performReload(actor, token, weapon, updates, options = {}) {
    if (useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            // With a repeating weapon, we only need to have a magazine loaded with at least one ammunition remaining. The ammunition itself
            // is still only consumed when we fire
            const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (!magazineLoadedEffect) {
                showWarning(format("warningNoMagazineLoaded", { weapon: weapon.name }));
                return;
            } else if (getFlag(magazineLoadedEffect, "remaining") < 1) {
                showWarning(format("warningMagazineEmpty", { weapon: weapon.name }));
                return;
            }

            // If the weapon is already loaded, we don't need to do it again
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                showWarning(format("warningAlreadyLoaded", { weapon: weapon.name }));
                return;
            }

            // Create the new loaded effect
            const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
            setEffectTarget(loadedEffectSource, weapon);
            updates.create(loadedEffectSource);

            await postReloadToChat(token, weapon);
        } else {
            if (weapon.capacity) {
                if (isFullyLoaded(weapon)) {
                    showWarning(format("warningAlreadyFullyLoaded", { weapon: weapon.name }));
                    return;
                }

                /** @type PF2eConsumable */
                let ammo;

                /** @type number */
                let numRoundsToLoad;

                // If some chambers are already loaded, we only want to load with the same type of ammunition
                const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
                if (loadedEffect) {
                    /** @type CapacityLoadedEffect */
                    const loaded = getFlags(loadedEffect);

                    numRoundsToLoad = options.fullyReload ? loaded.capacity - loaded.loadedChambers : 1;

                    ammo = await getAmmunition(weapon, updates, numRoundsToLoad);
                    if (!ammo) {
                        return;
                    }

                    const loadedAmmunitions = loaded.ammunition;

                    // Try to find ammunition of the same type already loaded. If we find any, add to it, otherwise create a new one.
                    let loadedAmmunition = loadedAmmunitions.find(ammunition => ammunition.sourceId === ammo.sourceId);
                    if (loadedAmmunition) {
                        loadedAmmunition.quantity += numRoundsToLoad;
                    } else {
                        loadedAmmunition = {
                            name: ammo.name,
                            img: ammo.img,
                            id: ammo.id,
                            sourceId: ammo.sourceId,
                            quantity: numRoundsToLoad,
                        };
                        loadedAmmunitions.push(loadedAmmunition);
                    }

                    // Increase the number of loaded chambers by one.
                    loaded.loadedChambers += numRoundsToLoad;

                    updates.update(
                        loadedEffect,
                        {
                            name: buildLoadedEffectName(loadedEffect),
                            flags: {
                                "pf2e-ranged-combat": loaded
                            }
                        }
                    );
                    updates.floatyText(`${getFlag(loadedEffect, "originalName")} ${loadedAmmunition.name} ${loaded.loadedChambers}/${loaded.capacity}`, true);
                } else {
                    numRoundsToLoad = options.fullyReload ? weapon.capacity : 1;

                    ammo = await getAmmunition(weapon, updates, numRoundsToLoad);
                    if (!ammo) {
                        return;
                    }

                    // No chambers are loaded, so create a new loaded effect
                    const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                    updates.create(loadedEffectSource);

                    setEffectTarget(loadedEffectSource, weapon);

                    /** @type CapacityLoadedEffect */
                    const loaded = {
                        originalName: loadedEffectSource.name,
                        ammunition: [
                            {
                                name: ammo.name,
                                img: ammo.img,
                                id: ammo.id,
                                sourceId: ammo.sourceId,
                                quantity: numRoundsToLoad
                            }
                        ],
                        loadedChambers: numRoundsToLoad,
                        capacity: weapon.capacity
                    };

                    loadedEffectSource.flags["pf2e-ranged-combat"] = {
                        ...loadedEffectSource.flags["pf2e-ranged-combat"],
                        ...loaded
                    };
                    loadedEffectSource.name = buildLoadedEffectName(loadedEffectSource);
                }

                // For a capacity weapon, if the selected chamber isn't loaded, assume the chamber being loaded is the selected one
                if (weapon.isCapacity) {
                    await setLoadedChamber(actor, weapon, ammo, updates);
                }

                await postReloadToChat(token, weapon, ammo.name);
                updateAmmunitionQuantity(updates, ammo, -numRoundsToLoad);
            } else {
                // If we have no ammunition selected, or we don't have any left in the stack, we can't reload
                const ammo = await getAmmunition(weapon, updates);
                if (!ammo) {
                    return;
                }

                // If the weapon is already loaded with the same type of ammunition as we're loading, don't reload
                // Otherwise, unload the existing round before loading the new one
                const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
                const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
                if (conjuredRoundEffect) {
                    updates.delete(conjuredRoundEffect);
                } else if (loadedEffect) {
                    // If the selected ammunition is the same as what's already loaded, don't reload
                    const loadedAmmunition = getFlag(loadedEffect, "ammunition");
                    if (ammo.sourceId === loadedAmmunition.sourceId) {
                        showWarning(format("warningAlreadyLoadedWithAmmo", { weapon: weapon.name, ammo: ammo.name }));
                        return;
                    }
                    await unloadAmmunition(actor, weapon, loadedEffect, updates);
                }

                // Now we can load the new ammunition
                const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                updates.create(loadedEffectSource);

                setEffectTarget(loadedEffectSource, weapon);
                loadedEffectSource.name = `${loadedEffectSource.name} (${ammo.name})`;
                loadedEffectSource.flags["pf2e-ranged-combat"] = {
                    ...loadedEffectSource.flags["pf2e-ranged-combat"],
                    ammunition: {
                        name: ammo.name,
                        img: ammo.img,
                        id: ammo.id,
                        sourceId: ammo.sourceId
                    }
                };

                await postReloadToChat(token, weapon, ammo.name);

                // Remove one piece of ammunition from the stack
                updateAmmunitionQuantity(updates, ammo, -1);
            }
        }
    } else {
        if (checkFullyLoaded(weapon)) {
            return;
        }

        if (weapon.capacity) {
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                /** @type CapacityLoadedEffect */
                const loaded = getFlags(loadedEffect);

                if (options.fullyReload) {
                    loaded.loadedChambers = loaded.capacity;
                } else {
                    loaded.loadedChambers++;
                }

                updates.update(
                    loadedEffect,
                    {
                        "name": `${getFlag(loadedEffect, "name")} (${loaded.loadedChambers}/${loaded.capacity})`,
                        "flags.pf2e-ranged-combat": loaded
                    }
                );
                updates.floatyText(`${getFlag(loadedEffect, "name")} (${loaded.loadedChambers}/${loaded.capacity})`, true);

                if (weapon.isCapacity) {
                    await setLoadedChamber(actor, weapon, null, updates);
                }
            } else {
                const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                setEffectTarget(loadedEffectSource, weapon);
                updates.create(loadedEffectSource);

                /** @type CapacityLoadedEffect */
                const loaded = {
                    name: loadedEffectSource.name,
                    capacity: weapon.capacity,
                    loadedChambers: options.fullyReload ? weapon.capacity : 1,
                };

                loadedEffectSource.name = `${loadedEffectSource.name} (1/${weapon.capacity})`;
                loadedEffectSource.flags["pf2e-ranged-combat"] = {
                    ...loadedEffectSource.flags["pf2e-ranged-combat"],
                    ...loaded
                };

                if (weapon.isCapacity) {
                    await setLoadedChamber(actor, weapon, null, updates);
                }
            }
        } else {
            // Create the new loaded effect
            const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
            setEffectTarget(loadedEffectSource, weapon);
            updates.create(loadedEffectSource);
        }
        await postReloadToChat(token, weapon);
    }

    await HookManager.call("reload", { weapon, updates });

    Hooks.callAll("pf2eRangedCombatReload", actor, token, weapon);
};

/**
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @param {number} ammunitionRequired 
 * @returns {Promise<PF2eConsumable | null>}
 */
async function getAmmunition(weapon, updates, ammunitionRequired = 1) {
    const ammunition = weapon.ammunition;

    if (!ammunition) {
        return await selectAmmunition(
            weapon,
            updates,
            format("warningNoCompatibleAmmunition", { weapon: weapon.name }),
            format("noAmmunitionSelectNew", { weapon: weapon.name }),
            false,
            false
        );
    } else if (ammunition.quantity < ammunitionRequired && ammunition.system.uses.autoDestroy) {
        return await selectAmmunition(
            weapon,
            updates,
            format("warningNotEnoughAmmunition", { weapon: weapon.name }),
            format("notEnoughAmmunitionSelectNew", { weapon: weapon.name }),
            true,
            false
        );
    } else {
        return ammunition;
    }
}

async function postReloadToChat(token, weapon, ammunitionName) {
    const reloadActions = weapon.reload;
    let desc = format("tokenReloadsWeapon", { token: token.name, weapon: weapon.name });
    if (ammunitionName) {
        desc = desc + " " + format("withAmmunition", { ammunition: ammunitionName });
    } else {
        desc = `${desc}.`;
    }

    await postToChat(
        token.actor,
        RELOAD_AMMUNITION_IMG,
        desc,
        game.i18n.localize("PF2E.Actions.Interact.Title"),
        reloadActions <= 3 ? String(reloadActions) : "",
    );
}
