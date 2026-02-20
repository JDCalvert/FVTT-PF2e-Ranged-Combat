import { LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { getEffectFromActor } from "../../utils/utils.js";
import { Weapon } from "../types.js";

/**
 * @abstract
 */
export class WeaponTransformer {
    /**
     * @param {ActorPF2e} _actor
     * @returns {boolean}
     */
    isForActor(_actor) {
        return false;
    }


    /** 
     * @param {ActorPF2e} _actor 
     * @returns {Weapon[]}
     */
    getWeapons(_actor) {
        return [];
    }

    /**
     * @param {WeaponPF2e | MeleePF2e} _weapon
     * @returns {Weapon}
     */
    transformWeapon(_weapon) {
        return null;
    }

    /**
     * Add the derived values of the weapon - these calculations are the same for all transforms
     * @param {Weapon} weapon 
     * @returns {Weapon}
     */
    static calculateDerivedValues(weapon) {
        // The number of ammunition items loaded into the weapon
        const numLoadedAmmunition = weapon.loadedAmmunition
            .map(ammunition => ammunition.quantity)
            .reduce((current, quantity) => current + quantity, 0);

        weapon.remainingCapacity = weapon.capacity - numLoadedAmmunition;

        weapon.isReadyToFire = weapon.loadedAmmunition.some(ammunition => ammunition.calculateTotalRemainingUses() >= weapon.expend);

        // A repeating weapon that has a reload value must be cocked to be ready to fire
        if (weapon.isReadyToFire && weapon.isRepeating && weapon.reloadActions > 0 && !getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id)) {
            weapon.isReadyToFire = false;
        }

        return weapon;
    }

    /**
     * Search the given item for a trait with the given name which has a value
     * 
     * @param {WeaponPF2e | MeleePF2e} pf2eItem
     * @param {string} traitName
     * 
     * @returns {number | null} The value of the trait, if found, or null if the trait was not found
     */
    static findTraitValue(pf2eItem, traitName) {
        const match = pf2eItem.system.traits.value
            .map(trait => trait.match(`${traitName}-(\d+)`))
            .find(match => !!match);

        if (match) {
            return Number(match[1]);
        } else {
            return null;
        }
    }
}
