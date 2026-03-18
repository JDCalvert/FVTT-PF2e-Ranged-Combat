import { Util } from "../utils/utils.js";
import { ShadowSheath } from "./shadow-sheath.js";

export class Exemplar {
    /**
     * @param {string} key 
     * @param {object} data
     * @returns {string}
     */
    static localize(key, data) {
        return Util.localize(`exemplar.${key}`, data);
    }

    static initialise() {
        ShadowSheath.initialise();
    }
}
