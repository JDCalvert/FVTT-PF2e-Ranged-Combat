import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eItem } from "../types/pf2e/item.js";

export class Updates {
    /** @type PF2eActor */
    actor;

    /** @type PF2eItem[] */
    creates;

    /** @type PF2eItem[] */
    deletes;

    /** @type PF2eItem[] */
    updates;

    /** @type {(() => Promise<void>)[]} */
    deferredUpdates;

    /**
     * @param {PF2eActor} actor 
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
     * @param {PF2eItem} item 
     */
    create(item) {
        this.creates.push(item);
    }

    /**
     * @param {PF2eItem} item 
     */
    delete(item) {
        const existingDelete = this.deletes.find(deleteId => deleteId === item.id);
        if (!existingDelete) {
            this.deletes.push(item.id);
        }
    }

    /**
     * Add the given update to the updates list.
     * If another update for the same item exists, merges the existing and new updates.
     * 
     * @param {PF2eItem} item 
     * @param {any} update 
     */
    update(item, update) {
        const existingUpdate = this.updates.find(updateItem => updateItem._id === item.id);
        if (existingUpdate) {
            mergeObject(existingUpdate, update);
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
        return this.creates.length || this.deletes.length || this.updates.length || this.deferredUpdates.length;
    }

    async handleUpdates() {
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
                            : token.showFloatyText({ upadte: { name: floatyText.text } });
                    }
                },
                i * 500
            );
            i++;
        }
    }
}
