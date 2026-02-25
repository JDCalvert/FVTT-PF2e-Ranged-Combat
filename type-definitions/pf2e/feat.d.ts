class FeatPF2e extends ItemPF2e {
    system: FeatPF2eSystem;
}

class FeatPF2eSystem extends ItemPF2eSystem {
    traits: {
        otherTags: string[];
    };
}
