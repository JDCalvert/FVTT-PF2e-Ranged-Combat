import { PF2eActor } from "../pf2e/actor.js";
import { PF2eWeapon } from "../pf2e/weapon.js";
import { PF2eConsumable } from "../pf2e/consumable.js";

export class Weapon {
    /** @type string */
    id;

    /** @type PF2eActor */
    actor;

    /** @type string */
    group;

    /** @type boolean */
    usesAmmunition;

    /** @type PF2eConsumable */
    ammunition;

    /** @type boolean */
    isRepeating;

    /**
     * The amount of ammunition this weapon can hold.
     * 
     * @type number
     */
    capacity;

    /** @type boolean */
    isCapacity;

    /** @type boolean */
    isDoubleBarrel;

    /** @type boolean */
    requiresLoading;

    /** @type boolean */
    isEquipped;

    /** @type {PF2eWeapon} */
    pf2eWeapon;
}


