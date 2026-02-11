import { LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { CapacityLoadedEffect } from "../../types/pf2e-ranged-combat/loaded-effect.js";
import { PF2eActor } from "../../types/pf2e/actor.js";
import { PF2eConsumable } from "../../types/pf2e/consumable.js";
import { PF2eItem } from "../../types/pf2e/item.js";
import { PF2eWeapon } from "../../types/pf2e/weapon.js";
import { Updates } from "../../utils/updates.js";
import { getEffectFromActor, getFlags, getItem, setEffectTarget } from "../../utils/utils.js";
import { Ammunition, Weapon } from "../types.js";

class SimpleWeapon extends Weapon {
    /**
     * @param {Ammunition} ammunition
     * @param {Updates} updates
     */
    async createAmmunition(ammunition, updates) {
        const newAmmunition = this.transformLoadedAmmunition(ammunition);
        await newAmmunition.create(updates);
    }

    /**
     * @param {Ammunition} ammunition 
     * @returns {SimpleAmmunition}
     */
    transformLoadedAmmunition(ammunition) {
        const newAmmunition = this.isRepeating
            ? new Magazine()
            : this.capacity > 0
                ? new CapacityAmmunition()
                : new StandardAmmunition();

        ammunition.copyData(newAmmunition);

        return newAmmunition;
    }
}

class SimpleAmmunition extends Ammunition {
    /**
     * Reference to the ammunition in the actor's inventory that this refers to
     * 
     * @type {Ammunition | null}
     */
    linkedAmmunition;

    /**
     * Reference to the effect that represents this ammunition being loaded into the weapon
     * @type {PF2eItem}
     */
    loadedEffect;

    /**
     * Delete the loaded effect
     * 
     * @param {Updates} updates 
     */
    delete(updates) {
        updates.delete(this.loadedEffect);
    }

    /**
     * Update the linked ammunition as well as this one
     * 
     * @param {number} quantity
     * @param {Updates} updates
     * 
     * @returns {Ammunition} A new ammunition stack containing the removed ammunition
     */
    pop(quantity, updates) {
        const removedAmmunition = super.pop(quantity);

        // Also remove from the linked ammunition, if we have one
        if (this.linkedAmmunition) {
            this.linkedAmmunition.quantity -= quantity;
            updates.update(this.linkedAmmunition, { "system.quantity": this.linkedAmmunition.quantity });
        }

        return removedAmmunition;
    }

    /**
     * Update the linked ammunition as well as this one
     * 
     * @param {Ammunition} ammunition 
     * @param {Updates} updates 
     */
    push(ammunition, updates) {
        super.push(ammunition, updates);

        if (this.linkedAmmunition) {
            this.linkedAmmunition.quantity += ammunition.quantity;
            updates.update(this.linkedAmmunition, { "system.quantity": this.linkedAmmunition.quantity });
        }
    }
}

class StandardAmmunition extends SimpleAmmunition {
    /**
     * Create the loaded effect
     * 
     * @param {Updates} updates 
     */
    async create(updates) {
        const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
        setEffectTarget(loadedEffectSource, this.weapon);
        updates.create(loadedEffectSource);
    }

    /**
     * This type of ammunition should never be updated this way.
     * 
     * @param {Updates} updates
     */
    save(updates) {
    }
}

class CapacityAmmunition extends SimpleAmmunition {
    /**
     * @param {Updates} updates
     */
    async create(updates) {
        const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
        setEffectTarget(loadedEffectSource, this.weapon);

        /** @type {CapacityLoadedEffect} */
        const flags = {
            "name": loadedEffectSource.name,
            "capacity": this.weapon.capacity,
            "loadedChambers": this.quantity
        };

        foundry.utils.mergeObject(
            loadedEffectSource,
            {
                "name": `${flags.name} (${flags.loadedChambers}/${flags.capacity})`,
                "flags.pf2e-ranged-combat": flags
            }
        );

        updates.create(loadedEffectSource);
    }

    /**
     * @param {Updates} updates
     */
    save(updates) {
        /** @type {CapacityLoadedEffect} */
        const flags = getFlags(this.loadedEffect);
        flags.loadedChambers = this.quantity;

        updates.update(
            this.loadedEffect,
            {
                "name": `${flags.name} (${flags.loadedChambers}/${flags.capacity})`,
                "flags.pf2e-ranged-combat": flags
            }
        );
    }
}

class Magazine extends SimpleAmmunition {
    /**
     * @param {Updates} update
     */
    async create(updates) {

    }

    /**
     * @param {Updates} updates 
     */
    save(updates) {

    }

    /**
     * @param {Updates} updates 
     */
    delete(updates) {
    }
}

export class SimpleWeaponSystemTransformer extends WeaponTransformer {
    /**
     * @param {PF2eActor} actor
     * @returns {Weapon[]}
     */
    getWeapons(actor) {
        if (actor.type === "character") {
            return actor.itemTypes.weapon.map(pf2eWeapon => this.transformWeaponCharacter(pf2eWeapon));
        } else if (actor.type === "npc") {
            return actor.itemTypes.melee.map(melee => this.transformWeaponNPC(melee));
        } else {
            return [];
        }
    }

    /**
     * @param {PF2eWeapon} pf2eWeapon
     * @returns {Weapon}
     */
    transformWeaponCharacter(pf2eWeapon) {
        const weapon = new SimpleWeapon();

        weapon.actor = pf2eWeapon.actor;

        weapon.id = pf2eWeapon.id;
        weapon.name = pf2eWeapon.name;
        weapon.img = pf2eWeapon.img;

        weapon.isStowed = pf2eWeapon.isStowed;
        weapon.isEquipped = pf2eWeapon.isEquipped;

        weapon.reloadActions = pf2eWeapon.system.reload.value;

        weapon.isRepeating = pf2eWeapon.traits.has("repeating");

        // Calculate the weapon's capacity by either the presence of a Capacity or Double Barrel trait
        const match = pf2eWeapon.system.traits.value
            .map(trait => trait.match(/capacity-(\d+)/))
            .find(match => !!match);

        if (match) {
            weapon.capacity = Number(match[1]);
        } else if (pf2eWeapon.traits.has("double-barrel")) {
            weapon.capacity = 2;
        } else {
            weapon.capacity = 1;
        }

        weapon.expend = 1;
        if (pf2eWeapon.system.traits.toggles.doubleBarrel.selected) {
            weapon.expend = 2;
        }

        weapon.loadedAmmunition = [];

        const selectedAmmunition = pf2eWeapon.ammo;

        if (weapon.isRepeating) {
            if (selectedAmmunition) {
                // Always consider the selected ammunition as loaded
                const ammunition = new Magazine();

                // Create a copy of the selected ammunition to act as a dummy loaded magazine
                const linkedAmmunition = this.transformAmmunition(selectedAmmunition);
                linkedAmmunition.copyData(ammunition);

                ammunition.weapon = weapon;
                ammunition.linkedAmmunition = linkedAmmunition;

                ammunition.isHeld = false;
                ammunition.quantity = 1;

                weapon.loadedAmmunition.push(ammunition);
            }
        } else if (weapon.capacity > 1) {
            const loadedEffect = getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);
            if (selectedAmmunition && loadedEffect) {
                /** @type {CapacityLoadedEffect} */
                const flags = getFlags(loadedEffect);

                const ammunition = new CapacityAmmunition();

                const linkedAmmunition = this.transformAmmunition(selectedAmmunition);
                linkedAmmunition.copyData(ammunition);

                ammunition.weapon = weapon;
                ammunition.linkedAmmunition = linkedAmmunition;

                ammunition.isHeld = false;
                ammunition.quantity = flags.loadedChambers;

                weapon.loadedAmmunition.push(ammunition);
            }
        } else {
            const loadedEffect = getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);
            if (selectedAmmunition && loadedEffect) {
                const ammunition = new StandardAmmunition();

                const linkedAmmunition = this.transformAmmunition(selectedAmmunition);
                linkedAmmunition.copyData(ammunition);

                ammunition.weapon = weapon;
                ammunition.linkedAmmunition = linkedAmmunition;

                ammunition.isHeld = false;
                ammunition.quantity = 1;

                weapon.loadedAmmunition.push(ammunition);
            }
        }

        weapon.compatibleAmmunition = [
            ...weapon.actor.itemTypes.weapon,
            ...weapon.actor.itemTypes.consumable,
            ...weapon.actor.itemTypes.ammo ?? []
        ]
            .filter(item => item.system.quantity > 0)
            .filter(item => !item.isStowed)
            .filter(item => item.isAmmoFor(pf2eWeapon))
            .map(ammo => this.transformAmmunition(ammo));

        return weapon;
    }

    /**
     * @param {PF2eWeapon | PF2eConsumable} pf2eAmmo 
     * @returns {Ammunition}
     */
    transformAmmunition(pf2eAmmo) {
        const ammunition = new Ammunition();
        ammunition.id = pf2eAmmo.id;
        ammunition.sourceId = pf2eAmmo.sourceId;
        ammunition.name = pf2eAmmo.sourceId;
        ammunition.img = pf2eAmmo.img;

        ammunition.quantity = pf2eAmmo.system.quantity;
        ammunition.isHeld = pf2eAmmo.system.equipped.carryType === "held";
        ammunition.descriptionText = pf2eAmmo.system.description;
        ammunition.rules = pf2eAmmo.system.rules;

        if (pf2eAmmo.system.uses) {
            ammunition.hasUses = true;
            ammunition.remainingUses = pf2eAmmo.system.uses.value;
            ammunition.maxUses = pf2eAmmo.system.uses.max;
        } else {
            ammunition.hasUses = false;
            ammunition.remainingUses = 1;
            ammunition.maxUses = 1;
        }

        return ammunition;
    }
}
