import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { Updates } from "../utils/updates.js";

export class SystemAmmunition {
    /**
     * @param {Weapon} weapon
     * 
     * Determine if the weapon is loaded.
     */
    static isLoaded(weapon) {
        weapon.pf2eWeapon;
        return weapon.requiresLoading && !!weapon.ammunition;
    }

    /**
     * @param {Weapon} weapon
     * @param {string} sourceId
     * @param {number} quantity
     * @param {Updates} updates
     * 
     * Remove a specific piece of ammunition from the weapon.
     */
    static removeAmmunition(weapon, sourceId, quantity, updates) {
        const pf2eWeapon = weapon.pf2eWeapon;
        const subItems = pf2eWeapon.system.subitems;

        const ammunitionIndex = subItems.findIndex(item => item._stats.compendiumSource === sourceId);
        if (ammunitionIndex === -1) {
            return false;
        }

        const ammunition = subItems[ammunitionIndex];
        if (ammunition.system.quantity > quantity) {
            ammunition.system.quantity -= quantity;
        } else {
            subItems.splice(ammunitionIndex, 1);
        }

        updates.update(
            pf2eWeapon,
            {
                "system.subitems": subItems
            }
        );

        return true;
    }
}
