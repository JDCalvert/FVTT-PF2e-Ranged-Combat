import { ClearJam } from "../actions/clear-jam.js";
import { WeaponAttackCheckParams } from "../hook-manager/types/weapon-attack-check.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { Util } from "../utils/utils.js";
import { Weapon } from "../weapons/types.js";
import { AmmunitionSystem } from "../weapons/system.js";
import { LOADED_EFFECT_ID } from "./constants.js";
import { AutoSelect, SetSelected, SwitchAmmunition } from "./actions/switch-ammunition.js";
import { Updates } from "../utils/updates.js";

export class FireWeaponCheck {
    /**
     * @param {string} key 
     * @param {object} data 
     * 
     * @returns {string}
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`check.${key}`, data);
    }

    /**
     * @param {Weapon} weapon
     * @param {string} reason
     */
    static warn(weapon, reason) {
        Util.warn(FireWeaponCheck.localize(reason, { weapon: weapon.name }));
    }

    static initalise() {
        HookManager.registerCheck("weapon-attack", FireWeaponCheck.runCheck);
    }

    /**
     * Check that the weapon can be fired.
     * 
     * @param {WeaponAttackCheckParams} data
     */
    static async runCheck({ weapon }) {
        // If the weapon doesn't use ammunition, we don't need to check
        if (weapon.expend == null) {
            return true;
        }

        // Cannot fire if jammed
        if (ClearJam.checkJammed(weapon)) {
            return false;
        }

        // Repeating weapons must have a magazine loaded with enough uses remaining and
        // may need to have an action spent to reload them.
        if (weapon.isRepeating) {
            if (weapon.loadedAmmunition.length === 0) {
                FireWeaponCheck.warn(weapon, "magazineNotLoaded");
                return false;
            }

            const ammunition = weapon.loadedAmmunition[0];
            if (ammunition.remainingUses === 0) {
                FireWeaponCheck.warn(weapon, "magazineEmpty");
                return false;
            } else if (ammunition.remainingUses < weapon.expend) {
                FireWeaponCheck.warn(weapon, "magazineNotEnough");
                return false;
            }

            if (weapon.reloadActions > 0 && !Util.getEffect(weapon, LOADED_EFFECT_ID)) {
                FireWeaponCheck.warn(weapon, "weaponNotLoaded");
                return false;
            }

            return true;
        }

        // Capacity weapons must have ammunition loaded and a chamber already selected
        if (weapon.isCapacity) {
            // No ammunition
            if (weapon.loadedAmmunition.length === 0) {
                FireWeaponCheck.warn(weapon, "weaponNotLoaded");
                return false;
            }

            // Weapons with Capacity-X need to have a chamber selected before firing
            if (!weapon.selectedLoadedAmmunition) {
                FireWeaponCheck.warn(weapon, "chamberNotLoaded");
                return false;
            }

            return true;
        }

        // Weapons that can be loaded but do not have the Capacity-X trait must be loaded with some ammunition to fire.
        // They may be loaded with multiple type of ammunition, but we must only fire one type on a given Strike.
        // Filter to loaded ammunition that meets these requirements and, if there are multiple, give a choice. If there
        // is none, then show a warning.
        if (weapon.capacity > 0) {
            weapon.selectedLoadedAmmunition = await AmmunitionSystem.chooseLoadedAmmunition(
                weapon,
                "fire",
                {
                    filter: {
                        predicate: ammunition => ammunition.calculateTotalRemainingUses() >= weapon.expend,
                        warningMessage: FireWeaponCheck.localize("notEnoughAmmunition", { weapon: weapon.name })
                    },
                    autoChooseSelected: true,
                    autoChooseOnlyOption: true
                }

            );

            // If we don't have a chamber selected, either we cancelled or were already shown a warning
            if (!weapon.selectedLoadedAmmunition) {
                return false;
            }
        }

        // Reload-0 weapons that use ammunition must have some ammunition selected
        if (weapon.reloadActions === 0) {
            const updates = new Updates(weapon.actor);
            weapon.selectedInventoryAmmunition = await SwitchAmmunition.chooseAmmunition(
                weapon,
                updates,
                AmmunitionSystem.localize("select.action.fire"),
                {
                    filter: { predicate: ammunition => ammunition.quantity > 0 },
                    autoSelect: AutoSelect.Selected,
                    setSelected: SetSelected.DefaultNo
                }
            );
            await updates.commit();
            if (!weapon.selectedInventoryAmmunition) {
                return false;
            }

            // Not enough uses left in the selected ammunition to fire
            if (weapon.selectedInventoryAmmunition.calculateTotalRemainingUses() < weapon.expend) {
                FireWeaponCheck.warn(weapon, "notEnoughAmmunition");
                return false;
            }
        }

        return true;
    }
}
