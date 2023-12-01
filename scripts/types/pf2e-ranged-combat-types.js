import { PF2eActor } from "./pf2e-types.js";

export class Weapon {
    /** @type PF2eActor */
    actor;
}

export class Ammunition {
    /** @type string */
    name;

    /** @type string */
    img;
    
    /** @type string */
    id;
    
    /** @type string */
    sourceId;
    
    /** @type number */
    quantity;
}
