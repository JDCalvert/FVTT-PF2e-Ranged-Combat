import { ClearJam } from "../../actions/clear-jam.js";
import { Chat } from "../../utils/chat.js";
import { HookManager } from "../../utils/hook-manager.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { AmmunitionSystem, WeaponSystem } from "../../weapons/system.js";
import { Ammunition, Weapon } from "../../weapons/types.js";
import { LOADED_EFFECT_ID } from "../constants.js";
import { Unload } from "./unload.js";

/**
 * @typedef ReloadOptions
 * @property {boolean} [fullyReload]
 * @property {import("../../utils/chat.js").ChatMessageParams} [messageParams]
 */

export class Reload {
    /**
     * @param {string} key 
     * @param {object} data
     * 
     * @returns {string} 
     */
    static localize(key, data = {}) {
        return AmmunitionSystem.localize(`actions.reload.${key}`, data);
    }

    /**
     * @param {Weapon} weapon 
     * @returns {{reload: boolean, magazineReload: boolean, magazineReloadActions: number}} result
     */
    static showAuxiliaryActions(weapon) {
        const result = {
            reload: false,
            magazineReload: false,
            magazineReloadActions: 0
        };

        if (weapon.isStowed || weapon.capacity === 0 || ClearJam.isJammed(weapon)) {
            return result;
        }

        if (weapon.isRepeating) {
            result.magazineReload = true;
            result.magazineReloadActions = weapon.loadedAmmunition.length > 0 ? 3 : 2;

            if (weapon.reloadActions > 0 && weapon.loadedAmmunition.length > 0 && weapon.loadedAmmunition[0].remainingUses > 0) {
                result.reload = !Util.getEffect(weapon, LOADED_EFFECT_ID);
            }
        } else {
            // Non-repeating weapons can reload if they have an empty slot or if a loaded slot
            // is not at full uses.
            if (weapon.remainingCapacity > 0 || weapon.loadedAmmunition.some(loaded => loaded.remainingUses < loaded.maxUses)) {
                result.reload = true;
            }
        }

        return result;
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: weapon => !weapon.isStowed && weapon.capacity > 0,
                priority: weapon => {
                    if (!weapon.isEquipped) {
                        return false;
                    }

                    // The weapon has capacity remaining, or some ammunition has fewer than maximum uses
                    if (weapon.remainingCapacity > 0 || weapon.loadedAmmunition.some(loaded => loaded.remainingUses < loaded.maxUses)) {
                        return true;
                    }

                    // The weapon is a repeating weapon which takes at least an action to reload, and is not loaded
                    if (weapon.isRepeating && !weapon.isReadyToFire) {
                        return true;
                    }

                    return false;
                }
            },
            "reload",
            Reload.localize("warningNoReloadableWeapons", { actor: actor.name })
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);
        await Reload.reload(weapon, updates);
        updates.commit();
    }

    static async actionMagazine() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: weapon => !weapon.isStowed && weapon.isRepeating,
                priority: weapon => {
                    // Don't prioritise non-wielded weapons
                    if (!weapon.isEquipped) {
                        return false;
                    }

                    // Only prioritise if we have ammunition to load
                    if (weapon.compatibleAmmunition.length === 0) {
                        return false;
                    }

                    // Prioritise if there's already an empty slot to load into
                    if (weapon.remainingCapacity > 0) {
                        return true;
                    }

                    // Prioritise if any of the weapon's magazines are empty
                    if (weapon.loadedAmmunition.find(ammunition => ammunition.remainingUses === 0)) {
                        return true;
                    }

                    return false;
                }
            },
            Reload.localize("selectWeapon"),
            Reload.localize("magazine.warning.noRepeatingWeapons", { actor: actor.name })
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);
        await Reload.reloadMagazine(weapon, updates);
        updates.commit();
    }

    /**
     * @param {Weapon} weapon 
     * @param {Updates} updates 
     * @param {ReloadOptions} [options]
     * 
     * @returns {Promise<boolean>} Whether the weapon was reloaded
     */
    static async reload(weapon, updates, options = {}) {
        if (ClearJam.checkJammed(weapon)) {
            return false;
        }

        if (weapon.isRepeating) {
            // A repeating weapon might need to be loaded because it doesn't have a magazine loaded, or because it needs to be cocked.            
            if (weapon.isReadyToFire) {
                Util.warn(Reload.localize(`warning.alreadyLoaded`, { weapon: weapon.name }));
                return false;
            }

            // If we need to load a new magazine, call the reload magazine function
            if (weapon.loadedAmmunition.length === 0 || weapon.loadedAmmunition[0].remainingUses === 0) {
                return Reload.reloadMagazine(weapon, updates);
            }

            const loadedEffectSource = await Util.getSource(LOADED_EFFECT_ID);
            Util.setEffectTarget(loadedEffectSource, weapon);
            updates.create(loadedEffectSource);

            Reload.postToChat(weapon, null, options.messageParams);
        } else {
            if (weapon.remainingCapacity == 0 && weapon.loadedAmmunition.every(loaded => loaded.remainingUses == loaded.maxUses)) {
                Util.warn(Reload.localize(`warning.${weapon.capacity > 1 ? "alreadyFullyLoaded" : "alreadyLoaded"}`, { weapon: weapon.name }));
                return false;
            }

            const ammunition = await AmmunitionSystem.chooseCompatibleAmmunition(weapon, "load");
            if (!ammunition) {
                return false;
            }

            // If we don't have an empty slot, choose a slot to unload first
            if (weapon.remainingCapacity === 0) {
                const ammunitionToUnload = await AmmunitionSystem.chooseLoadedAmmunition(
                    weapon,
                    "unload",
                    [
                        {
                            header: "Depleted",
                            predicate: ammunition => ammunition.remainingUses < ammunition.maxUses
                        }
                    ]
                );

                await Unload.removeFromWeapon(weapon, ammunitionToUnload, updates);
            }

            const ammunitionToLoad = ammunition.pop(1, updates);

            const matching = weapon.loadedAmmunition.find(loaded => loaded.sourceId === ammunitionToLoad.sourceId);
            if (matching) {
                matching.push(ammunitionToLoad, updates);
            } else {
                await weapon.createAmmunition(ammunitionToLoad, updates);
            }

            Reload.postToChat(weapon, ammunitionToLoad, options.messageParams);
        }

        HookManager.call("reload", { weapon, updates });
        Hooks.callAll("pf2eRangedCombatReload", weapon.actor, weapon);

        return true;
    }

    /**
     * @param {Weapon} weapon
     * @param {Updates} updates
     * @param {ReloadOptions} [options]
     * 
     * @return {Promise<boolean>}
     */
    static async reloadMagazine(weapon, updates, options = {}) {
        const ammunition = await AmmunitionSystem.chooseCompatibleAmmunition(weapon, "unload");
        if (!ammunition) {
            return false;
        }

        // Check if the weapon is already loaded with a full magazine of identical ammunition
        const fullMatchingAmmunition = weapon.loadedAmmunition.find(loaded => loaded.sourceId === ammunition.sourceId && loaded.remainingUses === loaded.maxUses);
        if (fullMatchingAmmunition) {
            Util.warn(Reload.localize("magazine.warning.fullyLoaded", { weapon: weapon.name }));
            return false;
        }

        let numActions = 0;

        // If there's already a magazine in the weapon, remove it
        if (weapon.loadedAmmunition.length > 0) {
            await Unload.removeFromWeapon(weapon, weapon.loadedAmmunition[0], updates);
            numActions++;

            // If the weapon was cocked, remove the effect
            const loadedEffect = Util.getEffect(weapon, LOADED_EFFECT_ID);
            if (loadedEffect) {
                updates.delete(loadedEffect);
            }
        }

        // If we're not holding the new ammunition, add an action to retrieve it
        if (!ammunition.isHeld) {
            numActions++;
        }

        numActions++;

        const ammunitionToAdd = ammunition.pop(1, updates);
        await weapon.createAmmunition(ammunitionToAdd, updates);

        // If the weapon needs cocking, do so
        if (weapon.reloadActions > 0) {
            const loadedEffectSource = await Util.getSource(LOADED_EFFECT_ID);
            Util.setEffectTarget(loadedEffectSource, weapon);
            updates.create(loadedEffectSource);
        }

        Reload.postToChat(weapon, ammunitionToAdd, Chat.mergeParams(options.messageParams, { actionSymbol: String(numActions) }));

        HookManager.call("reload", { weapon, updates });
        Hooks.callAll("pf2eRangedCombatReloadMagazine", weapon.actor, weapon);

        return true;
    }

    /**
     * @param {Weapon} weapon
     * @param {Ammunition | null} ammunition 
     * @param {import("../../utils/chat.js").ChatMessageParams} options
     */
    static postToChat(weapon, ammunition, options = {}) {
        Chat.postInteract(
            weapon.actor,
            (ammunition ?? weapon).img,
            Reload.localize(
                `performed.weapon${ammunition ? `Ammunition${ammunition.maxUses > 1 ? "Charges" : ""}` : ""}`,
                {
                    actor: weapon.actor.name,
                    weapon: weapon.name,
                    ammunition: ammunition?.name,
                    charges: ammunition?.remainingUses,
                    maxCharges: ammunition?.maxUses
                }
            ),
            Chat.mergeParams({ actionSymbol: String(weapon.reloadActions) }, options)
        );
    }
}
