import { PF2eActor } from "../types/pf2e/actor.js";
import { Updates } from "../utils/updates.js";
import { getItem } from "../utils/utils.js";

export class Item {
    /** @type string */
    id;

    /** @type string */
    sourceId;

    /** @type string */
    name;

    /** @type string */
    img;
}

export class Weapon extends Item {
    /** @type {PF2eActor} */
    actor;

    /** @type {boolean} */
    isEquipped;

    /** @type {boolean} */
    isStowed;

    /** @type {number} */
    capacity;

    /** @type {number} */
    remainingCapacity;

    /** @type {number} */
    expend;

    /** @type {Ammunition[]} */
    loadedAmmunition;

    /** @type {number} */
    numLoadedRounds;

    /** @type {boolean} */
    isReadyToFire;

    /** @type {boolean} */
    isRepeating;

    /** @type {number} */
    reloadActions;

    /** @type {Ammunition[]} */
    compatibleAmmunition;

    /**
     * Add a new stack of ammunition to the weapon
     * 
     * @abstract
     * @param {Ammunition} ammunition
     * @param {Updates} updates
     */
    async createAmmunition(ammunition, updates) {
    }
}

export class Ammunition extends Item {
    /** @type {Weapon} */
    weapon;

    /** @type {number} */
    quantity;

    /** @type {boolean} */
    hasUses;

    /** @type {number} */
    remainingUses;

    /** @type {number} */
    maxUses;

    /** @type {boolean} */
    isHeld;

    /** @type {string} */
    descriptionText;

    /** @type {object[]} */
    rules;

    /**
     * Copy the fields from this ammunition to 
     * 
     * @template {Ammunition} T
     * 
     * @param {T} copy
     */
    copyData(copy) {
        copy.id = this.id;
        copy.sourceId = this.sourceId;
        copy.name = this.name;
        copy.img = this.img;

        copy.quantity = this.quantity;
        copy.maxUses = this.maxUses;
        copy.remainingUses = this.remainingUses;

        copy.isHeld = this.isHeld;
        copy.descriptionText = this.descriptionText;
        copy.rules = this.rules;
    }

    /**
     * Create this piece of ammunition in the system
     * 
     * @param {Updates} updates
     */
    async create(updates) {
        const ammunitionSource = await getItem(this.sourceId);
        ammunitionSource.system.quantity = this.quantity;
        if (this.hasUses) {
            ammunitionSource.system.uses.value = this.remainingUses;
        }

        updates.create(ammunitionSource);
    }

    /**
     * Save any changes to the remaining uses or quantity of the ammunition.
     * 
     * @param {Updates} updates
     */
    save(updates) {
        const update = {
            "system.quantity": this.quantity
        };

        if (this.hasUses) {
            update["system.uses.value"] = this.remainingUses;
        }

        updates.update(this, update);
    }

    /** 
     * Delete this piece of ammunition
     * 
     * @param {Updates} updates
     */
    delete(updates) {
        // Don't actually delete the ammunition from the inventory, reduce the quantity to 0 and save.
        this.save(updates);
    }

    /**
     * Remove some quantity off the top of this ammunition stack into a new stack.
     * 
     * @param {number} quantity The quantity of this ammunition to remove
     * @param {Updates} updates
     * 
     * @returns {Ammunition} A new ammunition stack containing the removed ammunition
     */
    pop(quantity, updates) {
        const ammunition = new Ammunition();
        this.copyData(ammunition);

        // We're taking off the top of the stack, so the top of the new stack will have
        // the charges this stack currently has
        ammunition.quantity = quantity;
        ammunition.remainingUses = this.remainingUses;

        // Since we've removed the top of the stack, this stack now has max charges.
        this.quantity -= quantity;
        this.remainingUses = this.maxUses;

        if (this.quantity > 0) {
            this.save(updates);
        } else {
            this.delete(updates);
        }

        return ammunition;
    }

    /**
     * Add some ammunition to the top of this ammunition stack.
     * 
     * @param {Ammunition} ammunition
     * @param {Updates} updates
     */
    push(ammunition, updates) {
        this.remainingUses = ammunition.remainingUses;
        this.quantity += ammunition.quantity;

        this.save(updates);
    }
}
