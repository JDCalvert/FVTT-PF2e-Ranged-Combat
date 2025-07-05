import * as ItemSelect from "../../../lib-item-select-dialog/scripts/item-select-dialog.js";

export { Section, Choice, Option } from "../../../lib-item-select-dialog/scripts/item-select-dialog.js";

export function buildChoice(item) {
    return new ItemSelect.Choice(
        item.id,
        item.name,
        null,
        item.img,
        item
    );
}

/**
 * @template T
 * 
 * @param {string} title 
 * @param {string} header 
 * @param {ItemSelect.Section<T>[]} items 
 * 
 * @returns {Promise<T | null>}
 */
export async function getItem(title, header, items) {
    const result = await this.getItemWithOptions(title, header, items, []);
    return result?.choice?.item;
}

/**
 * @template T
 * 
 * @param {string} title 
 * @param {string} header 
 * @param {ItemSelect.Section<T>[]} items 
 * @param {ItemSelect.Option[]} options 
 * 
 * @returns {Promise<ItemSelect.Response<T> | null>}
 */
export async function getItemWithOptions(title, header, items, options) {
    if (CONFIG.pf2eRangedCombat.silent) {
        return null;
    }

    return ItemSelect.getItem(
        {
            title,
            heading: header,
            sections: items,
            options
        }
    );
}
