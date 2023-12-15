export class PF2eActor {
    /** @type PF2eItemTypes */
    itemTypes;
}

export class PF2eItemTypes {
    /** @type PF2eConsumable[] */
    consumable;
}

export class PF2eConsumable {
    /** @type string */
    id;

    /** @type string */
    sourceId;

    /** @type boolean */
    isAmmunition;

    /** @type boolean */
    isStowed;

    /** @type number */
    quantity;

    /** @type PF2eConsumableSystem */
    system;
}

export class PF2eConsumableSystem {
    /** @type PF2eConsumableUses */
    uses;
}

export class PF2eConsumableUses {
    /** @type number */
    value;
    
    /** @type number */
    max;
    
    /** @type boolean */
    autoDestroy;
}
