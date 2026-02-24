class MeleePF2e extends ItemPF2e {
    isRanged: boolean;
    traits: Set<string>;

    system: MeleePF2eSystem;
}

class MeleePF2eSystem extends ItemPF2eSystem {
    traits: {
        value: string[];
    };
}
