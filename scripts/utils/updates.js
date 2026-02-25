import { Item } from "../weapons/types.js";

export class Updates {
    /** @type {ActorPF2e} */
    actor;

    /** @type {ItemPF2eSource[]} */
    creates;

    /** @type {string[]} */
    deletes;

    /** @type {ItemPF2eSource[]} */
    updates;

    /** @type {(() => Promise<void>)[]} */
    deferredUpdates;

    /** @type {{text: string, up: boolean}[]} */
    floatyTextToShow;

    /**
     * @param {ActorPF2e} actor 
     */
    constructor(actor) {
        this.actor = actor;

        this.creates = []; // Array of items to be created
        this.deletes = []; // Set of IDs of items to be deleted
        this.updates = []; // Array of updates to existing items
        this.deferredUpdates = [];

        this.floatyTextToShow = [];
    }

    /**
     * @param {ItemPF2eSource} item 
     */
    create(item) {
        this.creates.push(item);
    }

    /**
     * @param {Item} item 
     */
    delete(item) {
        if (!item) {
            return;
        }

        const existingDelete = this.deletes.find(deleteId => deleteId === item.id);
        if (!existingDelete) {
            this.deletes.push(item.id);
        }
    }

    /**
     * Add the given update to the updates list.
     * If another update for the same item exists, merges the existing and new updates.
     * 
     * @param {Item} item 
     * @param {object} update 
     */
    update(item, update) {
        const existingUpdate = this.updates.find(updateItem => updateItem._id === item.id);
        if (existingUpdate) {
            foundry.utils.mergeObject(existingUpdate, update);
        } else {
            this.updates.push(
                {
                    ...update,
                    _id: item.id,
                }
            );
        }
    }

    /**
     * Add a process to run before all the other updates. Useful for when we can't run asynchronously at the time
     * @param {() => Promise<void>} update 
     */
    deferredUpdate(update) {
        this.deferredUpdates.push(update);
    }

    /**
     * @param {string} text
     * @param {boolean} up
     */
    floatyText(text, up) {
        this.floatyTextToShow.push({ text, up });
    }

    /**
     * @returns {boolean}
     */
    hasChanges() {
        return !!this.creates.length || !!this.deletes.length || !!this.updates.length || !!this.deferredUpdates.length;
    }

    async commit() {
        for (const deferredUpdate of this.deferredUpdates) {
            await deferredUpdate();
        }

        if (this.creates.length) await this.actor.createEmbeddedDocuments("Item", this.creates);
        if (this.updates.length) await this.actor.updateEmbeddedDocuments("Item", this.updates);
        if (this.deletes.length) await this.actor.deleteEmbeddedDocuments("Item", this.deletes);

        let i = 0;
        for (const floatyText of this.floatyTextToShow) {
            const tokens = this.actor.getActiveTokens();
            setTimeout(
                () => {
                    for (const token of tokens) {
                        floatyText.up
                            ? token.showFloatyText({ create: { name: floatyText.text } })
                            : token.showFloatyText({ update: { name: floatyText.text } });
                    }
                },
                i * 500
            );
            i++;
        }
    }
}
