import { Choice, Option, Response, Section } from "../../lib/lib-item-select-dialog-types/types.js";
import { PF2eItem } from "../types/pf2e/item.js";

export class ItemSelect {
    /**
     * @template {PF2eItem} T
     * 
     * @param {T} item 
     * @returns {Choice<T>}
     */
    static buildChoice(item) {
        return new Choice(item.id, item.name, item.img, item);
    }

    /**
     * @template T
     * 
     * @param {string} title 
     * @param {string} header 
     * @param {Section<T>[]} items 
     * 
     * @returns {Promise<T | null>}
     */
    static async getItem(title, header, items) {
        const result = await ItemSelect.getItemWithOptions(title, header, items, []);
        return result?.choice?.item;
    }

    /**
     * @template T
     * 
     * @param {string} title 
     * @param {string} header 
     * @param {Section<T>[]} items 
     * @param {Option[]} options 
     * 
     * @returns {Promise<Response<T> | null>}
     */
    static async getItemWithOptions(title, header, items, options) {
        if (CONFIG.pf2eRangedCombat.silent) {
            return null;
        }

        return CONFIG.itemSelectDialog.getItem(
            {
                title,
                heading: header,
                sections: items,
                options
            }
        );
    }
}
