import { PF2eConsumable } from "./consumable.js";
import { PF2eItem } from "./item.js";

export class PF2eActor {
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
}
