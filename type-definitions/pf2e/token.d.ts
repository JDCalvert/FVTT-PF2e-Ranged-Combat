class TokenPF2e {
    id: string;
    uuid: string;
    name: string;

    actor: ActorPF2e;

    document: {
        playersCanSeeName: boolean;
        uuid: string;
    };

    showFloatyText(args: any): void
}
