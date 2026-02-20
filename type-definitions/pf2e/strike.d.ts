class StrikePF2e {
    item: WeaponPF2e;
    auxiliaryActions: AuxiliaryAction[];
    totalModifier: number;

    options: string[];

    async roll(params: any): Promise<RollResult>;
}

class RollResult {
    degreeOfSuccess: number;
}
