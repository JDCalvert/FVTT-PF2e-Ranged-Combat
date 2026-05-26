class ItemPF2e {
    id: string;
    sourceId: string;
    name: string;
    img: string;
    slug: string;

    type: string;
    actor: ActorPF2e;

    flags: any;

    quantity: number;

    isEquipped: boolean;
    isStowed: boolean;
    carryType: string;

    sort: number;
    system: ItemPF2eSystem;

    isAmmoFor(weapon: WeaponPF2e): boolean;

    toObject(): ItemPF2eSource;
    async toMessage(): Promise<void>;

    async update(update: any): Promise<void>;
    async delete(): Promise<void>;
}

class ItemPF2eSystem {
    description: {
        value: string;
    };
    quantity: number;
    equipped: {
        carryType: string;
    };
    containerId: string;
    rules: Rule[];

    uses?: {
        value: number,
        max: number,
        autoDestroy: boolean;
    };

    tokenIcon: {
        show: boolean;
    };

    traits: {
        value: string[];
    };
}

class ItemPF2eSource {
    _id: string;
    name: string;
    description: string;
    flags: {
        core: {
            sourceId: string;
        };
        pf2e: {
            rulesSelections: any;
        };
    };
    system: ItemPF2eSystem;
}
