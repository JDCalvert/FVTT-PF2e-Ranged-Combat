class TokenPF2e {
    id: string;
    uuid: string;
    name: string;

    actor: ActorPF2e;

    document: {
        playersCanSeeName: boolean;
        uuid: string;
    };

    inCombat: boolean;

    showFloatyText(args: any): void;
}
