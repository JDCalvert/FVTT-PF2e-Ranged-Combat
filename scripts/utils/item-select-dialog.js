export class ItemSelectDialog extends Dialog {
    itemId;
    result;

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

    static async getItem(title, header, items) {
        let content = `
            <div class="item-buttons" style="max-width: max-content; justify-items: center; margin: auto;">
            <p>${header}</p>
        `;

        for (const itemCategory of items.keys()) {
            content += `
                <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
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
                        <span>${item.name}${item.reason ? ` (${item.reason})` : ""}</span>
                    </button>
                `;
            }

            content += `</fieldset>`;
        }

        content += `</div>`;
        let itemId = await new this(title, content).getItemId();
        return Array.from(items.values()).flat().find(item => item.id === itemId);
    }

    activateListeners(html) {
        html.find(".item-button").click(this.clickItemButton.bind(this));
        super.activateListeners(html);
    }

    clickItemButton(event) {
        this.itemId = event.currentTarget.value;
        this.close();
    }

    async close() {
        this.result?.(this.itemId);
        await super.close();
    }

    async getItemId() {
        this.render(true);
        return new Promise(result => {
            this.result = result;
        });
    }
}
