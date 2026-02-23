class UserPF2e {
    id: string;

    active: boolean;
    character: ActorPF2e;
    isGM: boolean;
    role: number;

    targets: {
        ids: string[];
    };
}
