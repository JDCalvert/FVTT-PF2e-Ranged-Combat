import { Updates } from "../../utils/updates.js";
import { LoadedAmmunition, Weapon } from "../../weapons/types.js";

export class ReloadHookData {
    /** @type {Weapon} */
    weapon;

    /** @type {LoadedAmmunition} */
    ammunition;

    /** @type {Updates} */
    updates;
}
