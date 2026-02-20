import { Updates } from "../utils/updates.js";
import { Weapon } from "../weapons/types.js";

export class WeaponAttackCheckParams {
    /** @type {Weapon} */
    weapon;

    /**
     * @param {Weapon} weapon 
     */
    constructor(weapon) {
        this.weapon = weapon;
    }
}

export class WeaponAttackProcessParams {
    /** @type {Weapon} */
    weapon;

    /** @type {Updates} */
    updates;


    /**
     * @param {Weapon} weapon 
     * @param {Updates} updates 
     */
    constructor(weapon, updates) {
        this.weapon = weapon;
        this.updates = updates;
    }
}
