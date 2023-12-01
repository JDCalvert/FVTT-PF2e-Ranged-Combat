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
    autoDestroy;

    /** @type boolean */
    isAmmunition;

    /** @type boolean */
    isStowed;

    /** @type number */
    quantity;
}
