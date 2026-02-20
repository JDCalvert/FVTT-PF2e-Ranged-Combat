namespace CONFIG {
    var pf2eRangedCombat: {
        chatHook: boolean;
        silent: boolean;
    };
    var itemSelectDialog: {
        getItem: (params: DialogParameters<T>) => T;
    };
}

interface GamePF2e {
    pf2eRangedCombat: object;
}
