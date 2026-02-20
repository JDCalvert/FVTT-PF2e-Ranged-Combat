class UserPF2e {
    id: string;

    active: boolean;
    character: ActorPF2e;
    role: number;

    targets: {
        ids: string[];
    };
}
