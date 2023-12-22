import { PF2eActor } from "../pf2e/actor.js";

export class Weapon {
    /** @type PF2eActor */
    actor;

    /** @type boolean */
    usesAmmunition;

    /** @type boolean */
    isRepeating;

    /** @type boolean */
    isCapacity;

    /** @type boolean */
    isDoubleBarrel;

    /** @type boolean */
    requiresLoading;
}


