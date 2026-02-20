class ItemPF2e {
    id: string;
    sourceId: string;
    name: string;
    img: string;

    type: string;
    actor: ActorPF2e;

    flags: any;

    quantity: number;

    isEquipped: boolean;
    isStowed: boolean;

    system: ItemPF2eSystem;

    isAmmoFor(weapon: WeaponPF2e): boolean;

    toObject(): ItemPF2eSource;
    async toMessage(): Promise<void>;

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
    rules: Rule[];

    uses?: {
        value: number,
        max: number,
        autoDestroy: boolean;
    };

    tokenIcon: {
        show: boolean;
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
    };
    system: ItemPF2eSystem;
}
