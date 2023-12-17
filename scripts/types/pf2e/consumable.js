export class PF2eConsumable {
    /** @type string */
    id;

    /** @type string */
    sourceId;

    /** @type boolean */
    isAmmo;

    /** @type boolean */
    isStowed;

    /** @type number */
    quantity;

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
