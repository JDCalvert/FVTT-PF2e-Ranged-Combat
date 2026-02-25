import { Updates } from "../../utils/updates.js";
import { Ammunition, Weapon } from "../../weapons/types.js";

export class WeaponAmmunitionData {
    /** @type {Weapon} */
    weapon;

    /** @type {Ammunition} */
    ammunition;

    /** @type {Updates} */
    updates;
}
