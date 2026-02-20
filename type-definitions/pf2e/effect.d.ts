class EffectPF2e extends ItemPF2e {
    isExpired: boolean;

    flags: {
        pf2e: {
            rulesSelections: {
                weapon: string;
            };
        };
        "pf2e-ranged-combat": any;
    };
}

class EffectPF2eSystem extends ItemPF2eSystem {

}

class EffectPF2eSource extends ItemPF2eSource {
    system: EffectPF2eSystem;
}
