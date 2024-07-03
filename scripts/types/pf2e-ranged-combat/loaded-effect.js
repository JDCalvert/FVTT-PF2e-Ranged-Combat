import { Ammunition } from "./ammunition.js";

export class LoadedEffect {
    /** @type Ammunition */
    ammunition;
}

export class CapacityLoadedEffect extends LoadedEffect {
    /** @type string */
    originalName;

    /** @type string */
    originalDescription;

    /** @type number */
    capacity;

    /** @type number */
    loadedChambers;

    /** @type Ammunition[] */
    ammunition;
}
