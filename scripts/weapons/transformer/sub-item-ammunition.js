import { PF2eActor } from "../../types/pf2e/actor.js";
import { PF2eItem } from "../../types/pf2e/item.js";
import { PF2eWeapon } from "../../types/pf2e/weapon.js";
import { Updates } from "../../utils/updates.js";
import { getItem } from "../../utils/utils.js";
import { Ammunition, Weapon } from "../types.js";
import { WeaponTransformer } from "./base.js";

class SubItemWeapon extends Weapon {

    /**
     * Reference to the actual weapon
     * 
     * @type {PF2eWeapon}
     */
    pf2eWeapon;

    /**
     * Transform a generic piece of ammunition to loaded ammunition
     * 
     * @param {Ammunition} ammunition
     * @returns {LoadedAmmunition} loadedAmmunition
     */
    transformLoadedAmmunition(ammunition) {
        const newAmmunition = new LoadedAmmunition();
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
        const loadedAmmunition = this.transformLoadedAmmunition(ammunition);
        this.loadedAmmunition.push(loadedAmmunition);

        await loadedAmmunition.create(updates);
    }
}

export class LoadedAmmunition extends Ammunition {
    /** @type {PF2eWeapon} */
    pf2eWeapon;

    /**
     * @override
     * @param {Updates} updates
     */
    async create(updates) {
        const subitems = this.pf2eWeapon.system.subitems;

        const ammunitionSource = await getItem(this.sourceId);
        ammunitionSource.system.quantity = this.quantity;
        ammunitionSource.sort = subitems.length;
        if (this.hasUses) {
            ammunitionSource.system.uses.autoDestroy = false;
            if (this.isRepeating) {
                ammunitionSource.system.uses.value = this.remainingUses;
            }
        }

        subitems.push(ammunitionSource);

        updates.update(this.weapon, { "system.subitems": subitems });
    }

    /**
     * @override
     * @param {Updates} updates 
     */
    save(updates) {
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
    delete(updates) {
        const subitems = this.pf2eWeapon.system.subitems;
        subitems.findSplice(subitem => subitem._id === this.id);
        updates.update(this.weapon, { "system.subitems": subitems });
    }
}

/**
 * Transformer to use for player characters using Pathfinder 2e v7.7+, using the system's own ammunition system
 * using sub-items on the weapon
 */
export class SubItemTransformer extends WeaponTransformer {

    /**
     * @param {PF2eActor} actor
     * @returns {Weapon[]}
     */
    getWeapons(actor) {
        return actor.itemTypes.weapon.map(pf2eWeapon => this.transformWeapon(pf2eWeapon));
    }

    /**
     * @param {PF2eWeapon} pf2eWeapon
     * @returns {Weapon}
     */
    transformWeapon(pf2eWeapon) {
        const weapon = new SubItemWeapon();

        weapon.actor = pf2eWeapon.actor;
        weapon.pf2eWeapon = pf2eWeapon;

        weapon.id = pf2eWeapon.id;
        weapon.name = pf2eWeapon.name;
        weapon.img = pf2eWeapon.img;

        weapon.isStowed = pf2eWeapon.isStowed;
        weapon.isEquipped = pf2eWeapon.isEquipped;

        weapon.reloadActions = pf2eWeapon.system.reload.value;
        weapon.isRepeating = pf2eWeapon.traits.has("repeating");
        weapon.capacity = pf2eWeapon.system.ammo?.capacity ?? 0;
        weapon.expend = pf2eWeapon.system.expend;

        // Find the weapon's sub-items that are ammunition, transform them into
        // generic ammunition, and then into loaded ammunition
        weapon.loadedAmmunition = pf2eWeapon.subitems.contents
            .filter(item => item.isAmmoFor(pf2eWeapon))
            .map(ammo => this.transformAmmunition(ammo))
            .map(ammo => weapon.transformLoadedAmmunition(ammo));

        weapon.compatibleAmmunition = [
            ...weapon.actor.itemTypes.weapon,
            ...weapon.actor.itemTypes.ammo
        ]
            .filter(ammo => ammo.system.quantity > 0)
            .filter(ammo => !ammo.isStowed)
            .filter(ammo => ammo.isAmmoFor(pf2eWeapon))
            .map(ammo => this.transformAmmunition(ammo));

        return weapon;
    }

    /**
     * @param {PF2eItem} pf2eAmmunition
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
        ammunition.descriptionText = pf2eAmmunition.system.description;
        ammunition.rules = pf2eAmmunition.system.rules;

        if (pf2eAmmunition.system.uses) {
            ammunition.hasUses = true;
            ammunition.remainingUses = pf2eAmmunition.system.uses.value;
            ammunition.maxUses = pf2eAmmunition.system.uses.max;
        } else {
            ammunition.hasUses = false;
            ammunition.remainingUses = 1;
            ammunition.maxUses = 1;
        }

        return ammunition;
    }
}
