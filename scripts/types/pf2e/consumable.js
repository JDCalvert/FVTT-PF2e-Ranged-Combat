import { PF2eItem } from "./item.js";

export class PF2eConsumable extends PF2eItem {
    /** @type boolean */
    isAmmo;

    /** @type PF2eConsumableSystem */
    system;
}

export class PF2eConsumableSystem {
    /**
        @type {
            {
                value: number,
                max: number,
                autoDestroy: boolean
            }
        }
     */
    uses;
}
