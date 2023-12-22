import { PF2eActor } from "../pf2e/actor.js";
import { PF2eConsumable } from "../pf2e/consumable.js";

export class Weapon {
    /** @type string */
    id;

    /** @type PF2eActor */
    actor;

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
}


