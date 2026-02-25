import { CHAMBER_LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { Configuration } from "../../config/config.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { InventoryAmmunitionTransformer } from "../ammunition-transformer/inventory.js";
import { Ammunition, InventoryAmmunition, LoadedAmmunition, Weapon } from "../types.js";
import { WeaponTransformer } from "./base.js";

class SubItemWeapon extends Weapon {

    /**
     * Transform a generic piece of ammunition to loaded ammunition
     * 
     * @param {Ammunition} ammunition
     * @returns {SubItemAmmunition} loadedAmmunition
     */
    transformLoadedAmmunition(ammunition) {
        const newAmmunition = new SubItemAmmunition();
        ammunition.copyData(newAmmunition);

        newAmmunition.weapon = this;
        newAmmunition.pf2eWeapon = this.pf2eWeapon;

        return newAmmunition;
    }

    /**
     * @override
     * 
     * @param {Ammunition} ammunition 
     * @param {Updates} updates 
     */
    async createAmmunition(ammunition, updates) {
        const newAmmunition = this.transformLoadedAmmunition(ammunition);
        this.loadedAmmunition.push(newAmmunition);

        await newAmmunition.create(updates);

        return newAmmunition;
    }

    /**
     * @param {InventoryAmmunition | null} ammunition
     * @param {Updates} updates
     */
    setSelectedAmmunition(ammunition, updates) {
        this.selectedInventoryAmmunition = ammunition;

        // Reload-0 weapons still have an ammunition selection box, so use that instead of a flag
        if (!this.isRepeating && this.reloadActions === 0) {
            updates.update(this, { "system.selectedAmmoId": ammunition?.id ?? null });
            return;
        }

        if (ammunition) {
            updates.update(this, { "flags.pf2e-ranged-combat.ammunitionId": ammunition.id });
        } else {
            updates.update(this, { "flags.pf2e-ranged-combat.-=ammunitionId": null });
        }
    }

    /**
     * @override
     * @param {SubItemAmmunition} ammunition 
     * @param {Updates} updates 
     */
    async setNextChamber(ammunition, updates) {
        this.tidySubItems();

        // If we already have a chamber loaded, remove that effect
        const chamberLoadedEffect = Util.getEffect(this, CHAMBER_LOADED_EFFECT_ID);
        if (chamberLoadedEffect) {
            updates.delete(chamberLoadedEffect);
        }

        if (!ammunition) {
            return;
        }

        const chamberLoadedSource = await Util.getSource(CHAMBER_LOADED_EFFECT_ID);
        Util.setEffectTarget(chamberLoadedSource, this);
        updates.create(chamberLoadedSource);

        // Move the chosen ammunition to the front of the sub-items list
        const subitems = this.pf2eWeapon.system.subitems;
        subitems.unshift(subitems.findSplice(subitem => subitem._id === ammunition.id));
        for (let i = 0; i < subitems.length; i++) {
            subitems[i].sort = i;
        }

        updates.update(this, { "system.subitems": subitems });
    }

    tidySubItems() {
        // Remove any zero-quantity subitems
        this.pf2eWeapon.system.subitems = this.pf2eWeapon.system.subitems
            .filter(subitem => subitem.system.quantity > 0)
            .sort((a, b) => a.sort - b.sort);

        for (let i = 0; i < this.pf2eWeapon.system.subitems.length; i++) {
            this.pf2eWeapon.system.subitems[i].sort = i;
        }
    }
}

/**
 * @extends {LoadedAmmunition<SubItemWeapon>}
 */
export class SubItemAmmunition extends LoadedAmmunition {
    /** @type {WeaponPF2e} */
    pf2eWeapon;

    /**
     * @override
     * @param {Updates} updates
     */
    async create(updates) {
        this.weapon.tidySubItems();

        const subitems = this.pf2eWeapon.system.subitems;

        // Tidy up any sub-items that already have zero quantity
        subitems.splice(0, subitems.length, ...subitems.filter(item => item.system.quantity > 0));

        const ammunitionSource = /** @type {SubItem} */ (await Util.getSource(this.sourceId));
        ammunitionSource.system.quantity = this.quantity;
        ammunitionSource.sort = subitems.length;
        if (this.hasUses) {
            ammunitionSource.system.uses.value = this.remainingUses;
        }

        subitems.push(ammunitionSource);

        updates.update(this.weapon, { "system.subitems": subitems });

        this.id = ammunitionSource._id;
    }

    /**
     * @override
     * @param {Updates} updates 
     */
    save(updates) {
        this.weapon.tidySubItems();

        const subitems = this.pf2eWeapon.system.subitems;

        const matchingAmmunition = subitems.find(subitem => subitem._id === this.id);
        if (matchingAmmunition) {
            matchingAmmunition.system.quantity = this.quantity;
            if (this.hasUses) {
                matchingAmmunition.system.uses.value = this.remainingUses;
            }

            updates.update(this.weapon, { "system.subitems": subitems });
        }
    }

    /**
     * @override
     * @param {Updates} updates
     */
    onDelete(updates) {
        const subitems = this.pf2eWeapon.system.subitems;
        subitems.findSplice(subitem => subitem._id === this.id);
        updates.update(this.weapon, { "system.subitems": subitems });
    }

    /**
     * Override of the normal consume rules - don't remove the ammunition entry immediately if the quantity is reduced to 0.
     * We won't consider it loaded ammunition, but the system will use it for ammunition effects. We'll tidy it up next time
     * we reload.
     * 
     * @override
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

        this.save(updates);

        // Remove this from the loaded ammunition if it's empty
        if (this.quantity === 0) {
            this.weapon.loadedAmmunition.findSplice(loaded => loaded.id === this.id);
        }
    }
}

/**
 * Transformer to use for player characters using Pathfinder 2e v7.7+, using the system's own ammunition system
 * using sub-items on the weapon
 */
export class SubItemTransformer extends WeaponTransformer {
    /**
     * @param {ActorPF2e} actor
     * @returns {boolean}
     */
    isForActor(actor) {
        return Configuration.isUsingSubItemAmmunitionSystem(actor);
    }

    /**
     * @param {ActorPF2e} actor
     * @returns {Weapon[]}
     */
    getWeapons(actor) {
        return actor.itemTypes.weapon.map(pf2eWeapon => this.transformWeapon(pf2eWeapon));
    }

    /**
     * @param {WeaponPF2e} pf2eWeapon
     * @returns {Weapon}
     */
    transformWeapon(pf2eWeapon) {
        const weapon = new SubItemWeapon();

        weapon.actor = pf2eWeapon.actor;
        weapon.pf2eWeapon = pf2eWeapon;

        weapon.id = pf2eWeapon.id;
        weapon.name = pf2eWeapon.name;
        weapon.img = pf2eWeapon.img;
        weapon.slug = pf2eWeapon.slug;

        weapon.level = pf2eWeapon.system.level.value;

        weapon.traits = pf2eWeapon.system.traits.value;

        weapon.isRanged = pf2eWeapon.isRanged;
        weapon.group = pf2eWeapon.system.group;
        weapon.baseItem = pf2eWeapon.system.baseItem;

        weapon.isStowed = pf2eWeapon.isStowed;
        weapon.isEquipped = pf2eWeapon.isEquipped;
        weapon.hands = pf2eWeapon.handsHeld;

        weapon.damageType = pf2eWeapon.system.damage.damageType;
        weapon.damageDice = pf2eWeapon.system.damage.dice;

        weapon.capacity = pf2eWeapon.system.ammo?.capacity ?? 0;

        const reload = pf2eWeapon.system.reload.value;
        if (reload !== null && reload !== "-") {
            weapon.reloadActions = Number(reload);
        } else {
            weapon.reloadActions = null;
        }

        weapon.expend = pf2eWeapon.system.expend;

        weapon.isRepeating = pf2eWeapon.traits.has("repeating");

        const capacity = WeaponTransformer.findTraitValue(weapon, "capacity");
        if (capacity != null) {
            weapon.isCapacity = true;
        }

        weapon.compatibleAmmunition = [
            ...weapon.actor.itemTypes.weapon,
            ...weapon.actor.itemTypes.ammo
        ]
            .filter(ammo => !ammo.isStowed)
            .filter(ammo => ammo.isAmmoFor(pf2eWeapon))
            .map(ammo => this.transformAmmunition(ammo))
            .map(ammunition => InventoryAmmunitionTransformer.transform(ammunition));

        const selectedAmmunitionId = (!weapon.isRepeating && weapon.reloadActions === 0)
            ? pf2eWeapon.system.selectedAmmoId
            : Util.getFlag(pf2eWeapon, "ammunitionId");
        if (selectedAmmunitionId) {
            weapon.selectedInventoryAmmunition = weapon.compatibleAmmunition.find(compatible => compatible.id === selectedAmmunitionId);
        }

        // Find the weapon's sub-items that are ammunition, transform them into
        // generic ammunition, and then into loaded ammunition
        weapon.loadedAmmunition = pf2eWeapon.subitems.contents
            .filter(item => item.isAmmoFor(pf2eWeapon))
            .filter(item => item.quantity > 0)
            .sort((a, b) => a.sort - b.sort)
            .map(ammo => this.transformAmmunition(ammo))
            .map(ammo => weapon.transformLoadedAmmunition(ammo));

        if (weapon.loadedAmmunition.length > 0) {
            if (!weapon.isCapacity || Util.getEffect(weapon, CHAMBER_LOADED_EFFECT_ID)) {
                weapon.selectedLoadedAmmunition = weapon.loadedAmmunition[0];
            }
        }

        return weapon;
    }

    /**
     * @param {ItemPF2e} pf2eAmmunition
     * @returns {Ammunition}
     */
    transformAmmunition(pf2eAmmunition) {
        const ammunition = new Ammunition();
        ammunition.id = pf2eAmmunition.id;
        ammunition.sourceId = pf2eAmmunition.sourceId;
        ammunition.name = pf2eAmmunition.name;
        ammunition.img = pf2eAmmunition.img;

        ammunition.quantity = pf2eAmmunition.system.quantity;
        ammunition.isHeld = pf2eAmmunition.system.equipped.carryType === "held";
        ammunition.descriptionText = pf2eAmmunition.system.description.value;
        ammunition.rules = pf2eAmmunition.system.rules;

        if (pf2eAmmunition.system.uses) {
            ammunition.hasUses = true;
            ammunition.remainingUses = pf2eAmmunition.system.uses.value;
            ammunition.maxUses = pf2eAmmunition.system.uses.max;
            ammunition.allowDestroy = pf2eAmmunition.system.uses.autoDestroy;
        } else {
            ammunition.hasUses = false;
            ammunition.remainingUses = 1;
            ammunition.maxUses = 1;
            ammunition.allowDestroy = true;
        }

        ammunition.autoEject = ammunition.maxUses === 1; // Ammunition used in magazines must be remove manually when empty

        return ammunition;
    }
}
