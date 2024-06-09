export class HookManager {

    /** @type Map<string, function[]> */
    static hooks = new Map();

    /**
     * 
     * @param {string} key 
     * @param {(args) => void} callback 
     */
    static register(key, callback) {
        let functions = this.hooks.get(key);
        if (!functions) {
            functions = [];
            this.hooks.set(key, functions);
        }

        functions.push(callback);
    }

    /**
     * Call all the functions registered with this key, waiting for them all to be finished before continuing
     * 
     * @param {string} key
     * @param  {*} args
     */
    static async call(key, args) {
        const functions = this.hooks.get(key);
        if (functions) {
            for (let func of functions) {
                await func(args);
            }
        }
    }
}
