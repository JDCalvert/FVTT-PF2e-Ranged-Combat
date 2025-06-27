import { isUsingApplicationV2 } from "./utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.itemSelect." + key);

export class ItemSelectDialog {

    /**
     * @template T
     * 
     * @param {string} title 
     * @param {string} header 
     * @param {Map<string, T>} items 
     * @returns {Promise<T | null>}
     */
    static async getItem(title, header, items) {
        const result = await this.getItemWithOptions(title, header, items, []);
        return result?.item;
    }

    static async getItemWithOptions(title, header, items, options) {
        if (CONFIG.pf2eRangedCombat.silent) {
            return null;
        }

        let content = `
            <div class="item-buttons" style="min-width: 200px; max-width: max-content; justify-items: center; margin: auto;">
            <p style="width: 200px; min-width: 100%">${header}</p>
        `;

        for (const itemCategory of items.keys()) {
            content += `
                <fieldset style="border: 1px solid #a1a1a1; width: 100%; padding: 5px;  gap: 0px;">
                    <legend>${itemCategory}</legend>
            `;

            for (let item of items.get(itemCategory)) {
                content += `
                    <button
                        class="item-button"
                        type="button"
                        value="${item.id}"
                        style="display: flex; align-items: center; margin: 4px auto"
                    >
                        <img src="${item.img}" style="border: 1px solid #444; height: 1.6em; margin-right: 0.5em"/>
                        <span>${item.name}</span>
                    </button>
                `;
            }

            content += `</fieldset>`;
        }

        if (options.length) {
            content += `
                <fieldset style="border: 1px solid #a1a1a1; width: 100%; padding: 5px; gap: 0px;">
                    <legend>${localize("options")}</legend>
                    <form>
            `;

            for (const option of options) {
                content += `
                    <div class="form-group">
                        <input class="option-checkbox" type="checkbox" id="${option.id}" name="${option.id}" ${option.defaultValue ? "checked" : ""}>
                        <label for="${option.id}">${option.label}</label>
                    </div>
                `;
            }

            content += `
                    </form >
                </fieldset >
            `;
        }

        content += `</div > `;

        const itemSelectDialog = isUsingApplicationV2()
            ? new ItemSelectDialogV2(title, content)
            : new ItemSelectDialogV1(title, content);

        itemSelectDialog.selectionOptions = {};
        for (const option of options) {
            itemSelectDialog.selectionOptions[option.id] = option.defaultValue;
        }

        let result = await itemSelectDialog.getItemId();
        if (!result?.itemId) {
            return null;
        }

        return {
            item: Array.from(items.values()).flat().find(item => item.id === result.itemId),
            options: result.options
        };
    }
}

export class ItemSelectDialogV2 extends foundry.applications.api.DialogV2 {
    constructor(title, content) {
        super(
            {
                window: {
                    title
                },
                content: content,
                buttons: [
                    {
                        action: "cancel",
                        label: game.i18n.localize("pf2e-ranged-combat.dialog.button.cancel")
                    }
                ]
            },
            {
                height: "100%",
                width: "100%",
                id: "item-dialog"
            }
        );
    }

    _onRender(context, options) {
        const itemButtons = this.element.querySelectorAll(`[class="item-button"]`);
        for (const button of itemButtons) {
            button.addEventListener(
                "click",
                (event) => {
                    this.itemId = event.currentTarget.value;
                    this.close();
                }
            );
        }

        const checkboxes = this.element.querySelectorAll(`[class="option-checkbox"]`);
        for (const checkbox of checkboxes) {
            checkbox.addEventListener(
                "change",
                (event) => this.selectionOptions[event.currentTarget.id] = event.currentTarget.checked
            );
        }

        super._onRender(context, options);
    }

    async close() {
        await super.close();
        this.result?.(
            {
                itemId: this.itemId,
                options: this.selectionOptions
            }
        );
    }

    async getItemId() {
        this.render(true);
        return new Promise(result => {
            this.result = result;
        });
    }
}

class ItemSelectDialogV1 extends Dialog {
    constructor(title, content) {
        super(
            {
                title,
                content: content,
                buttons: {
                }
            },
            {
                height: "100%",
                width: "100%",
                id: "item-dialog"
            }
        );
    }

    activateListeners(html) {
        html.find(".item-button").on(
            "click",
            (event) => {
                this.itemId = event.currentTarget.value;
                this.close();
            }
        );

        html.find(".option-checkbox").on(
            "change",
            (event) => this.selectionOptions[event.currentTarget.id] = event.currentTarget.checked
        );

        super.activateListeners(html);
    }

    async close() {
        await super.close();
        this.result?.(
            {
                itemId: this.itemId,
                options: this.selectionOptions
            }
        );
    }

    async getItemId() {
        this.render(true);
        return new Promise(result => {
            this.result = result;
        });
    }
}
