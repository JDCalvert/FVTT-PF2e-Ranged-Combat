var libWrapper: LibWrapper;

interface LibWrapper {
    register(module: string, functionPath: string, func: any, type: string): void;
}
