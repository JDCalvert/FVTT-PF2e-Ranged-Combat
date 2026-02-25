import { Updates } from "../../utils/updates.js";
import { Weapon } from "../../weapons/types.js";

export class WeaponAttackProcessParams {
    /** @type {Weapon} */
    weapon;

    /** @type {Updates} */
    updates;

    /** @type {AttackContext} */
    context;

    /** @type {Roll} */
    roll;
}

class AttackContext {
    /** @type {Target} */
    target;
}

class Target {
    /** @type {TokenPF2e} */
    token;

    /** @type {number} */
    distance;
}

class Roll {
    /** @type {number} */
    degreeOfSuccess;
}
