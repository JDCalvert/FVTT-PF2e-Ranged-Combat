export class PF2eActor {
    /** @type PF2eItemTypes */
    itemTypes;
}

export class PF2eItemTypes {
    /** @type PF2eConsumable[] */
    consumable;
}

export class PF2eConsumable {
    /** @type boolean */
    autoDestroy;

    /** @type boolean */
    isAmmunition;

    /** @type boolean */
    isStowed;

    /** @type number */
    quantity;
}
