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

    origin: {
        signature: string;
    }
}

class EffectPF2eSystem extends ItemPF2eSystem {
    duration: {
        value: number;
    }
}

class EffectPF2eSource extends ItemPF2eSource {
    system: EffectPF2eSystem;
}
