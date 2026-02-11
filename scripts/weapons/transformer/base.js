import { LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { PF2eActor } from "../../types/pf2e/actor.js";
import { getEffectFromActor } from "../../utils/utils.js";
import { Weapon } from "../types.js";

/** @abstract */
export class WeaponTransformer {
    /** 
     * @param {PF2eActor} actor 
     * @returns {Weapon[]}
     */
    getWeapons(_) { }

    /**
     * Add the derived values of the weapon - these calculations are the same for all transforms
     * @param {Weapon} weapon 
     * @returns {void}
     */
    static calculateDerivedValues(weapon) {
        // The total number of rounds loaded into the weapon
        weapon.numLoadedRounds = weapon.loadedAmmunition
            .map(item => {
                if (item.quantity === 0) {
                    return 0;
                }

                return item.remainingUses + (item.quantity - 1) * item.maxUses;
            })
            .reduce((current, quantity) => current + quantity, 0);

        // The number of ammunition items loaded into the weapon
        const numLoadedAmmunition = weapon.loadedAmmunition
            .map(ammunition => ammunition.quantity)
            .reduce((current, quantity) => current + quantity, 0);

        weapon.remainingCapacity = weapon.capacity - numLoadedAmmunition;

        weapon.isReadyToFire = weapon.numLoadedRounds >= weapon.expend;

        // A repeating weapon that has a reload value must be cocked to be ready to fire
        if (weapon.isRepeating && weapon.reloadActions > 0) {
            weapon.isReadyToFire &= !!getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);;
        }

        return weapon;
    }
}
