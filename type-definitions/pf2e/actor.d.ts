class ActorPF2e {
    id: string;
    name: string;
    type: string;
    uuid: string;

    itemTypes: {
        ammo: AmmoPF2e[];
        action: ActionPF2e[];
        consumable: ConsumablePF2e[];
        effect: EffectPF2e[];
        melee: MeleePF2e[];
        weapon: WeaponPF2e[];
    };


    flags: any;

    ownership: Map<string, number>;
    primaryUpdater: UserPF2e;

    signature: string;

    system: ActorPF2eSystem;

    getActiveTokens(): TokenPF2e[];

    testUserPermission(user: UserPF2e, permission: any): boolean;

    createEmbeddedDocuments(type: string, creates: ItemPF2eSource[]);
    updateEmbeddedDocuments(type: string, updates: ItemPF2eSource[]);
    deleteEmbeddedDocuments(type: string, deletes: string[]);
}

class ActorPF2eSystem {
    actions: StrikePF2e[];
}
