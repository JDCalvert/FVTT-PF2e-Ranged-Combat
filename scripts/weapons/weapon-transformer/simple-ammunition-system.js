import { CHAMBER_LOADED_EFFECT_ID, LOADED_EFFECT_ID, RELOAD_AMMUNITION_IMG } from "../../ammunition-system/constants.js";
import { Configuration } from "../../config/config.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { InventoryAmmunitionTransformer } from "../ammunition-transformer/inventory.js";
import { Ammunition, InventoryAmmunition, LoadedAmmunition, Weapon } from "../types.js";
import { WeaponTransformer } from "./base.js";

class SimpleWeapon extends Weapon {
    /**
     * Reference to the system item
     * @type {WeaponPF2e | MeleePF2e}
     */
    pf2eItem;

    /**
     * @param {Ammunition} ammunition
     * @param {Updates} updates
     */
    async createAmmunition(ammunition, updates) {
        this.setSelectedAmmunition(ammunition, updates);

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

        if (this.pf2eItem.type === "weapon") {
            updates.update(this, { "system.selectedAmmoId": ammunition ? ammunition.id : null });
        } else {
            if (ammunition) {
                updates.update(this, { "flags.pf2e-ranged-combat.ammunitionId": ammunition.id });
            } else {
                updates.update(this, { "flags.pf2e-ranged-combat.-=ammunitionId": null });
            }
        }
    }

    /**
     * @param {Ammunition} _ammunition
     * @param {Updates} updates
     */
    async setNextChamber(_ammunition, updates) {
        const chamberLoadedEffect = Util.getEffect(this, CHAMBER_LOADED_EFFECT_ID);
        if (chamberLoadedEffect) {
            updates.delete(chamberLoadedEffect);
        }

        if (!_ammunition) {
            return;
        }

        const nextChamberSource = await Util.getSource(CHAMBER_LOADED_EFFECT_ID);
        Util.setEffectTarget(nextChamberSource, this);
        updates.create(nextChamberSource);
    }

    /**
     * @param {Ammunition} ammunition 
     * @returns {SimpleAmmunition}
     */
    transformLoadedAmmunition(ammunition) {
        const newAmmunition = this.isRepeating
            ? new Magazine()
            : this.capacity > 1
                ? new CapacityAmmunition()
                : new StandardAmmunition();

        ammunition.copyData(newAmmunition);

        newAmmunition.linkedAmmunition = this.compatibleAmmunition.find(item => item.id === ammunition.id);
        newAmmunition.weapon = this;

        return newAmmunition;
    }
}

/**
 * @extends {LoadedAmmunition<SimpleWeapon>}
 */
class SimpleAmmunition extends LoadedAmmunition {
    /**
     * Reference to the ammunition in the actor's inventory that this refers to
     * 
     * @type {Ammunition | null}
     */
    linkedAmmunition;

    /**
     * Reference to the effect that represents this ammunition being loaded into the weapon
     * @type {ItemPF2e}
     */
    loadedEffect;

    /**
     * Add this quantity to the linked ammunition, if there is any
     * 
     * @param {Updates} updates 
     */
    async create(updates) {
        this.syncLinkedAmmunition(updates);
    }

    /**
     * Update the linked ammunition
     * @param {Updates} updates 
     */
    save(updates) {
        this.syncLinkedAmmunition(updates);
    }

    /**
     * Delete the loaded effect
     * 
     * @param {Updates} updates 
     */
    onDelete(updates) {
        updates.delete(this.loadedEffect);
        this.syncLinkedAmmunition(updates);
    }

    /**
     * @param {Updates} updates 
     */
    syncLinkedAmmunition(updates) {
        if (this.linkedAmmunition) {
            const update = { "system.quantity": this.linkedAmmunition.quantity + this.quantity };
            if (this.linkedAmmunition.hasUses) {
                update["system.uses.value"] = this.remainingUses;
            }

            updates.update(this.linkedAmmunition, update);
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
        super.create(updates);

        const loadedEffectSource = await Util.getSource(LOADED_EFFECT_ID);
        Util.setEffectTarget(loadedEffectSource, this.weapon);
        updates.create(loadedEffectSource);
    }
}

class CapacityAmmunition extends SimpleAmmunition {
    /**
     * @param {Updates} updates
     */
    async create(updates) {
        super.create(updates);

        const loadedEffectSource = await Util.getSource(LOADED_EFFECT_ID);
        Util.setEffectTarget(loadedEffectSource, this.weapon);

        /** @type {SimpleCapacityFlags} */
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
        super.save(updates);

        if (this.loadedEffect) {
            /** @type {SimpleCapacityFlags} */
            const flags = Util.getFlags(this.loadedEffect);
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
}

class Magazine extends SimpleAmmunition {

}

export class SimpleWeaponSystemTransformer extends WeaponTransformer {
    /**
     * @param {ActorPF2e} actor 
     * @returns {boolean}
     */
    isForActor(actor) {
        return true;
    }

    /**
     * @param {ActorPF2e} actor
     * @returns {Weapon[]}
     */
    getWeapons(actor) {
        if (actor.type === "character") {
            return actor.itemTypes.weapon.map(pf2eWeapon => this.transformWeapon(pf2eWeapon));
        } else if (actor.type === "npc") {
            return actor.itemTypes.melee.map(melee => this.transformWeapon(melee));
        } else {
            return [];
        }
    }

    /**
     * @param {WeaponPF2e | MeleePF2e} pf2eItem
     * @returns {Weapon}
     */
    transformWeapon(pf2eItem) {
        const weapon = new SimpleWeapon();

        weapon.actor = pf2eItem.actor;
        weapon.pf2eItem = pf2eItem;

        weapon.id = pf2eItem.id;
        weapon.name = pf2eItem.name;
        weapon.slug = pf2eItem.slug;

        weapon.traits = pf2eItem.system.traits.value;

        weapon.isRanged = pf2eItem.isRanged;
        weapon.isRepeating = weapon.hasTrait("repeating");

        /** @type {WeaponPF2e} */
        let pf2eWeapon;
        /** @type {MeleePF2e} */
        let pf2eMelee;

        if (pf2eItem.type === "weapon") {
            pf2eWeapon = /** @type {WeaponPF2e} */ (pf2eItem);
        } else {
            pf2eMelee = /** @type {MeleePF2e} */ (pf2eItem);

            const weaponId = Util.getFlag(pf2eMelee, "weaponId") ?? pf2eMelee.flags.pf2e.linkedWeapon;
            pf2eWeapon = weaponId ? weapon.actor.itemTypes.weapon.find(weapon => weapon.id === weaponId) : null;
        }

        weapon.pf2eWeapon = pf2eWeapon;

        if (pf2eWeapon) {
            weapon.img = pf2eWeapon.img;
            weapon.sourceId = pf2eWeapon.sourceId;
            weapon.quantity = pf2eWeapon.quantity;

            weapon.level = pf2eWeapon.system.level.value;

            weapon.group = pf2eWeapon.system.group;
            weapon.baseItem = pf2eWeapon.system.baseItem;

            weapon.isStowed = pf2eWeapon.isStowed;
            weapon.isEquipped = pf2eWeapon.isEquipped;
            weapon.hands = pf2eWeapon.handsHeld;

            weapon.damageType = pf2eWeapon.system.damage.damageType;
            weapon.damageDice = pf2eWeapon.system.damage.dice;

            const reload = pf2eWeapon.system.reload.value;
            if (reload !== null && reload !== "-") {
                weapon.reloadActions = Number(reload);

                weapon.expend = 1;
                if (pf2eWeapon.system.traits.toggles.doubleBarrel.selected) {
                    weapon.expend = 2;
                }
            } else {
                weapon.reloadActions = null;
                weapon.expend = null;
            }

            weapon.compatibleAmmunition = [
                ...weapon.actor.itemTypes.weapon,
                ...(weapon.actor.itemTypes.ammo ?? weapon.actor.itemTypes.consumable) // AmmoPF2e for v7.7+, ConsumablePF2e before
            ]
                .filter(item => !item.isStowed)
                .filter(item => item.isAmmoFor(pf2eWeapon))
                .map(ammunition => this.transformAmmunition(ammunition))
                .map(ammunition => InventoryAmmunitionTransformer.transform(ammunition));
        } else {
            weapon.img = pf2eMelee.img;
            weapon.sourceId = null;
            weapon.quantity = 1;

            weapon.group = null;
            weapon.baseItem = null;

            weapon.isStowed = false;
            weapon.isEquipped = true;
            weapon.hands = 0;

            const reload = WeaponTransformer.findTraitValue(weapon, "reload");
            if (reload !== null) {
                weapon.reloadActions = reload;
                weapon.expend = 1;
            } else {
                weapon.reloadActions = null;
                weapon.expend = null;
            }

            weapon.compatibleAmmunition = (
                weapon.isRepeating
                    ? (weapon.actor.itemTypes.ammo ?? weapon.actor.itemTypes.consumable)
                        .filter(ammunition => ammunition.system.uses.max > 1)
                    : [
                        ...weapon.actor.itemTypes.weapon.filter(weapon => weapon.system.usage.canBeAmmo),
                        ...(weapon.actor.itemTypes.ammo ?? weapon.actor.itemTypes.consumable)
                            .filter(ammunition => ammunition.system.uses.max === 1)
                    ]
            )
                .filter(ammunition => !ammunition.isStowed)
                .filter(ammunition => ammunition.system.quantity > 0)
                .map(ammunition => this.transformAmmunition(ammunition))
                .map(ammunition => InventoryAmmunitionTransformer.transform(ammunition));
        }

        weapon.isCapacity = false;

        if (weapon.reloadActions === null) {
            weapon.capacity = null;
        } else {
            weapon.isCapacity = false;

            // Calculate the weapon's capacity by either the presence of a Capacity or Double Barrel trait
            const capacity = WeaponTransformer.findTraitValue(weapon, "capacity");
            if (capacity != null) {
                weapon.isCapacity = true;
                weapon.capacity = capacity;
            } else if (weapon.hasTrait("double-barrel")) {
                weapon.capacity = 2;
            } else {
                weapon.capacity = 1;
            }
        }

        if (pf2eItem.type === "weapon") {
            // We only want this if the original item is a weapon, not if it's a melee with a linked weapon
            const selectedAmmoId = pf2eWeapon.system.selectedAmmoId;
            if (selectedAmmoId) {
                weapon.selectedInventoryAmmunition = weapon.compatibleAmmunition.find(compatible => compatible.id === selectedAmmoId) || null;
            }
        } else {
            // Use the flag set by the NPC Weapon System
            const ammunitionId = Util.getFlag(pf2eItem, "ammunitionId");
            if (ammunitionId) {
                weapon.selectedInventoryAmmunition = weapon.compatibleAmmunition.find(compatible => compatible.id === ammunitionId) || null;
            } else {
                // Pick some compatible ammunition
                weapon.selectedInventoryAmmunition = weapon.compatibleAmmunition.length ? weapon.compatibleAmmunition[0] : null;
            }
        }

        weapon.loadedAmmunition = [];

        // We only consider the weapon to be loaded if there's any ammunition selected
        if (weapon.selectedInventoryAmmunition) {
            if (weapon.isRepeating) {
                // Always consider the selected ammunition as loaded
                const ammunition = new Magazine();

                // Create a copy of the selected ammunition to act as a dummy loaded magazine
                weapon.selectedInventoryAmmunition.copyData(ammunition);

                ammunition.weapon = weapon;
                ammunition.linkedAmmunition = weapon.selectedInventoryAmmunition;

                ammunition.autoEject = true;
                ammunition.isHeld = false;
                ammunition.quantity = 1;

                weapon.selectedInventoryAmmunition.quantity -= ammunition.quantity;

                weapon.loadedAmmunition.push(ammunition);
                weapon.selectedLoadedAmmunition = ammunition;
            } else if (weapon.capacity > 1) {
                const loadedEffect = Util.getEffect(weapon, LOADED_EFFECT_ID);
                if (loadedEffect || !Configuration.preventFiringWithoutLoading(weapon.actor)) {
                    const ammunition = new CapacityAmmunition();
                    weapon.selectedInventoryAmmunition.copyData(ammunition);

                    ammunition.weapon = weapon;
                    ammunition.linkedAmmunition = weapon.selectedInventoryAmmunition;
                    ammunition.loadedEffect = loadedEffect;

                    ammunition.autoEject = true;
                    ammunition.isHeld = false;

                    if (loadedEffect) {
                        /** @type {CapacityFlags} */
                        const flags = Util.getFlags(loadedEffect);
                        ammunition.quantity = flags.loadedChambers;
                    } else {
                        // If we don't actually have a loaded effect, consider one round loaded into the weapon
                        ammunition.quantity = 1;
                    }

                    weapon.selectedInventoryAmmunition.quantity -= ammunition.quantity;

                    weapon.loadedAmmunition.push(ammunition);

                    // If this is a capacity weapon, check if we have a loaded chamber
                    if (weapon.isCapacity) {
                        const chamberLoadedEffect = Util.getEffect(weapon, CHAMBER_LOADED_EFFECT_ID);
                        if (chamberLoadedEffect || !Configuration.preventFiringWithoutLoading(weapon.actor)) {
                            weapon.selectedLoadedAmmunition = ammunition;
                        }
                    }
                }
            } else {
                const loadedEffect = Util.getEffect(weapon, LOADED_EFFECT_ID);
                if (loadedEffect || !Configuration.preventFiringWithoutLoading(weapon.actor)) {
                    const ammunition = new StandardAmmunition();

                    weapon.selectedInventoryAmmunition.copyData(ammunition);

                    ammunition.weapon = weapon;
                    ammunition.linkedAmmunition = weapon.selectedInventoryAmmunition;
                    ammunition.loadedEffect = loadedEffect;

                    ammunition.autoEject = true;
                    ammunition.isHeld = false;
                    ammunition.quantity = 1;

                    weapon.selectedInventoryAmmunition.quantity -= ammunition.quantity;

                    weapon.loadedAmmunition.push(ammunition);
                }
            }
        }

        return weapon;
    }

    /**
     * @param {WeaponPF2e | ConsumablePF2e | AmmoPF2e} pf2eAmmunition 
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

        ammunition.autoEject = true;

        return ammunition;
    }
}
