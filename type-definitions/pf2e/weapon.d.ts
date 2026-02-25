class WeaponPF2e extends ItemPF2e {
    ammo: ItemPF2e | null;
    carryType: string;
    /** The number of hands required to wield the weapon */
    hands: number;
    /** The number of hands currently holding the weapon */
    handsHeld: number;
    isRanged: boolean;
    traits: Set<string>;
    system: WeaponPF2eSystem;

    // Only in v13+
    subitems: {
        contents: ItemPF2e[];
    };

    async delete(): Promise<void>;
}

class WeaponPF2eSystem extends ItemPF2eSystem {
    ammo: {
        capacity: number;
    };
    baseItem: string;
    containerId: string;
    damage: {
        damageType: string;
        dice: number;
    };
    expend: number;
    group: string;
    level: {
        value: number;
    };
    reload: {
        value: string | null;
    };
    runes: {
        property: string[];
    };
    subitems: SubItem[]; // Only in v13+
    selectedAmmoId: string; // Only in v12
    traits: {
        value: string[];
        toggles: {
            doubleBarrel: {
                selected: boolean;
            };
        };
    };
    usage: {
        canBeAmmo: boolean;
    };
}

class SubItem extends ItemPF2eSource {
    sort: number;
}
