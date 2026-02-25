namespace CONFIG {
    namespace PF2E {
        var featTraits: Map<string, string>;
        var traitsDescriptions: Map<string, string>;

        namespace Item {
            namespace documentClasses {
                var weapon: any;
            }
        }
    }
}

interface ConfigPF2e {
    PF2E: {

    };
}

interface GamePF2e {
    settings: {
        register(module: string, name: string, params: any): void;
        get(module: string, name: string): any;
        set(module: string, name: string, value: any): void;
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data: object): string;
    };
    pf2e: any;
    system: {
        version: string;
    };
    user: UserPF2e;
    users: UserPF2e[];
    version: string;

    actors: {
        contents: ActorPF2e[];
        get(id: string): ActorPF2e | null;
        find(predicate: (actor: ActorPF2e) => boolean): ActorPF2e | null;
    };

    combat: CombatPF2e;
    combats: {
        active: CombatPF2e;
    };

    time: {
        worldTime: number;
    };
}

var game: GamePF2e;

