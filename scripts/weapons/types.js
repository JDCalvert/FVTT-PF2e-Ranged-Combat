import { Updates } from "../utils/updates.js";
import { Util } from "../utils/utils.js";

export class Item {
    /** @type string */
    id;

    /** @type string */
    sourceId;

    /** @type string */
    name;

    /** @type {string} */
    img;

    /** @type number */
    quantity;
}

export class Weapon extends Item {
    /** @type {ActorPF2e} */
    actor;

    /** @type {string} */
    slug;

    /** @type {number} */
    level;

    /** @type {boolean} */
    isRanged;

    /** @type {string} */
    group;

    /** @type {string} */
    baseItem;

    /** @type {string[]} */
    traits;

    /** @type {number} */
    hands;

    /** @type {string} */
    damageType;

    /** @type {number} */
    damageDice;

    /** @type {boolean} */
    isEquipped;

    /** @type {boolean} */
    isStowed;

    /** @type {number} */
    capacity;

    /** @type {number | null} */
    expend;

    /** @type {number | null} */
    reloadActions;

    /**
     * Whether the weapon has the Capacity-X trait
     * @type {boolean}
     */
    isCapacity;

    /** @type {boolean} */
    isRepeating;

    /** @type {number} */
    remainingCapacity;

    /** @type {LoadedAmmunition[]} */
    loadedAmmunition;

    /** @type {LoadedAmmunition | null} */
    selectedLoadedAmmunition;

    /** @type {boolean} */
    isReadyToFire;

    /** @type {InventoryAmmunition[]} */
    compatibleAmmunition;

    /**
     * The ammunition in the inventory that we've selected as this weapon's
     * default ammunition. We'll prioritise this ammunition when selecting
     * where to load or unload ammunition.
     * 
     * @type {InventoryAmmunition | null}
     */
    selectedInventoryAmmunition;

    /**
     * Add a new stack of ammunition to the weapon
     * 
     * @abstract
     * @param {Ammunition} ammunition
     * @param {Updates} updates
     */
    async createAmmunition(ammunition, updates) {
    }

    /**
     * Set the ammunition as the selected chamber
     * 
     * @param {LoadedAmmunition} ammunition
     * @param {Updates} updates 
     */
    async setNextChamber(ammunition, updates) {
    }

    /**
     * Set the ammunition that this weapon will use by default, or clear the
     * selected ammunition.
     * 
     * @param {InventoryAmmunition | null} ammunition 
     * @param {Updates} updates 
     */
    setSelectedAmmunition(ammunition, updates) { }

    /**
     * @param {string} traitName 
     */
    hasTrait(traitName) {
        return this.traits.some(trait => trait === traitName);
    }
}

export class Ammunition extends Item {
    /** @type {boolean} */
    hasUses;

    /** @type {number} */
    remainingUses;

    /** @type {number} */
    maxUses;

    /** @type {boolean} */
    isHeld;

    /**
     * Whether to automatically remove this ammunition from a weapon when it has run out of uses
     * @type {boolean}
     */
    autoEject;

    /**
     * Whether to automatically destroy this ammunition when it's removed from a weapon with no uses remaining
     * @type {boolean}
     */
    allowDestroy;

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

        copy.hasUses = this.hasUses;
        copy.maxUses = this.maxUses;
        copy.remainingUses = this.remainingUses;
        copy.autoEject = this.autoEject;
        copy.allowDestroy = this.allowDestroy;

        copy.isHeld = this.isHeld;
        copy.descriptionText = this.descriptionText;
        copy.rules = this.rules;
    }

    /**
     * Calculate the total number of uses remaining on this ammunition stack
     * 
     * @returns {number}
     */
    calculateTotalRemainingUses() {
        if (this.quantity === 0) {
            return 0;
        }

        return this.remainingUses + (this.quantity - 1) * this.maxUses;
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

    /**
     * @abstract
     * 
     * Run any operation necessary to create this ammunition in the system
     * @param {Updates} updates
     */
    async create(updates) { }

    /**
     * Save changes to this ammunition in the system
     * @param {Updates} updates
     */
    save(updates) { }

    /** 
     * Delete this piece of ammunition in the system
     * @param {Updates} updates
     */
    delete(updates) { }

    /**
     * @param {number} uses The amount of uses to consume
     * @param {Updates} updates
     */
    consume(uses, updates) {
        if (this.autoEject) {
            while (uses > 0) {
                const numToUse = Math.min(this.remainingUses, uses);

                this.remainingUses -= numToUse;
                uses -= numToUse;

                if (this.remainingUses === 0) {
                    this.remainingUses = this.maxUses;
                    this.quantity--;
                }
            }
        } else {
            // We should have already checked that there are sufficient remaining uses
            this.remainingUses -= uses;
        }

        if (this.quantity > 0) {
            this.save(updates);
        } else {
            this.delete(updates);
        }
    }
}

/**
 * Represents ammunition loaded into a weapon
 */
export class LoadedAmmunition extends Ammunition {
    /**
     * The weapon this ammunition is loaded into
     * @type {Weapon}
     */
    weapon;

    /**
     * Delete this piece of ammunition in the system
     * @param {Updates} updates
     */
    delete(updates) {
        this.weapon.loadedAmmunition.findSplice(loaded => loaded === this);
        this.onDelete(updates);
    }

    /**
     * @abstract
     * @param {Updates} updates
     */
    onDelete(updates) { }
}

/**
 * Represents ammunition in an actor's inventory
 */
export class InventoryAmmunition extends Ammunition {

    /**
     * Create this piece of ammunition in the actor's inventory
     * 
     * @param {Updates} updates
     */
    async create(updates) {
        const ammunitionSource = await Util.getSource(this.sourceId);
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
        updates.delete(this);
    }
}
