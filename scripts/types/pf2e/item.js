export class PF2eItem {
    /** @type {string} */
    id;

    /** @type {string} */
    sourceId;

    /** @type {string} */
    name;

    /** @type {string} */
    img;

    /** @type {boolean} */
    isStowed;

    /** @type {number} */
    quantity;

    /** @type {string} */
    type;

    /** @type {PF2eItemSystem} */
    system;
}

export class PF2eItemSystem {
    /** @type {number} */
    quantity;
}
