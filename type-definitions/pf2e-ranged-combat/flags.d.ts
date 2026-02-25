interface FlagItem {
    flags: {
        "pf2e-ranged-combat": any;
    };
}

class FlagsAmmunition {
    id: string;
    sourceId: string;
    name: string;
    img: string;
    quantity: number;
}

class LoadedFlags {
    ammunition: FlagsAmmunition;
}

class CapacityFlags {
    originalName: string;
    originalDescription: string;
    capacity: number;
    loadedChambers: number;
    ammunition: FlagsAmmunition[];
}

class SimpleCapacityFlags {
    name: string;
    capacity: number;
    loadedChambers: number;
}
