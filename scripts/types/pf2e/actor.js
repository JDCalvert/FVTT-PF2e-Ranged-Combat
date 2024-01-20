import { PF2eConsumable } from "./consumable.js";
import { PF2eItem } from "./item.js";
import { PF2eWeapon } from "./weapon.js";

export class PF2eActor {
    /** @type string */
    type;
    
    /** @type PF2eItemTypes */
    itemTypes;

    /** @type PF2eItem[] */
    items;
}

export class PF2eItemTypes {
    /** @type PF2eConsumable[] */
    consumable;

    /** @type PF2eItem[] */
    effect;

    /** @type PF2eWeapon[] */
    weapon;
}
