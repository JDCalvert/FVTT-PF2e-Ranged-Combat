import { CHAMBER_LOADED_EFFECT_ID, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { InventoryAmmunitionTransformer } from "../ammunition-transformer/inventory.js";
import { Ammunition, InventoryAmmunition, LoadedAmmunition, Weapon } from "../types.js";
import { WeaponTransformer } from "./base.js";

class LocalWeapon extends Weapon {
    /**
     * Reference to the system item
     * @type {WeaponPF2e | MeleePF2e}
     */
    pf2eItem;

    /**
     * Transform a generic piece of ammunition to loaded ammunition
     * 
     * @param {Ammunition} ammunition
     * @returns {LoadedAmmunition} loadedAmmunition
     */
    transformLoadedAmmunition(ammunition) {
        const newAmmunition = this.isRepeating
            ? new Magazine()
            : this.capacity > 1
                ? new CapacityAmmunition()
                : new StandardAmmunition();

        ammunition.copyData(newAmmunition);

        newAmmunition.weapon = this;

        return newAmmunition;
    }

    /**
     * @override
     * 
     * @param {LoadedAmmunition} ammunition
     * @param {Updates} updates
     */
    async createAmmunition(ammunition, updates) {
        const newAmmunition = this.transformLoadedAmmunition(ammunition);
        this.loadedAmmunition.push(newAmmunition);

        // The loaded effect for capacity weapons holds multiple stacks of ammunition,
        // so there might already be one.
        if (this.capacity > 0) {
            /** @type {CapacityAmmunition} */ (newAmmunition).loadedEffect = Util.getEffect(this, LOADED_EFFECT_ID);
        }

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
     * @override
     * @param {LoadedAmmunition} ammunition 
     * @param {Updates} updates 
     */
    async setNextChamber(ammunition, updates) {
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

        foundry.utils.mergeObject(
            chamberLoadedSource,
            {
                name: `${chamberLoadedSource.name} (${ammunition.name})`,
                flags: {
                    "pf2e-ranged-combat": {
                        ammunition: {
                            name: ammunition.name,
                            img: ammunition.img,
                            id: ammunition.id,
                            sourceId: ammunition.sourceId
                        }
                    }
                }
            }
        );

        updates.create(chamberLoadedSource);
    }
}

/**
 * @extends {LoadedAmmunition<LocalWeapon>}
 */
class AdvancedLoadedAmmunition extends LoadedAmmunition {

}

class Magazine extends AdvancedLoadedAmmunition {
    /** @type {ItemPF2e} */
    magazineLoadedEffect;

    /**
     * @param {Updates} updates 
     */
    async create(updates) {
        const magazineLoadedEffectSource = await Util.getSource(MAGAZINE_LOADED_EFFECT_ID);
        Util.setEffectTarget(magazineLoadedEffectSource, this.weapon);
        foundry.utils.mergeObject(
            magazineLoadedEffectSource,
            {
                "name": `${magazineLoadedEffectSource.name} (${this.remainingUses}/${this.maxUses})`,
                "img": this.img,
                "system.description.value": `${magazineLoadedEffectSource.system.description.value}<p>@UUID[${this.sourceId}]</p>`,
                "flags.pf2e-ranged-combat": {
                    "name": magazineLoadedEffectSource.name,
                    "capacity": this.maxUses,
                    "remaining": this.remainingUses,
                    "ammunitionName": this.name,
                    "ammunitionImg": this.img,
                    "ammunitionItemId": this.id,
                    "ammunitionSourceId": this.sourceId
                }
            }
        );

        updates.create(magazineLoadedEffectSource);
    }

    /**
     * @param {Updates} updates 
     */
    save(updates) {
        const flags = Util.getFlags(this.magazineLoadedEffect);
        flags.remaining = this.remainingUses;

        updates.update(
            this.magazineLoadedEffect,
            {
                "name": `${flags.name} (${this.remainingUses}/${this.maxUses})`,
                "flags.pf2e-ranged-combat": flags
            }
        );
    }

    /**
     * @param {Updates} updates
     */
    onDelete(updates) {
        updates.delete(this.magazineLoadedEffect);
    }
}

class CapacityAmmunition extends AdvancedLoadedAmmunition {
    /** @type {ItemPF2e} */
    loadedEffect;

    /**
     * @param {Updates} updates 
     */
    async create(updates) {
        const effectAmmunition = {
            name: this.name,
            img: this.img,
            id: this.id,
            sourceId: this.sourceId,
            quantity: this.quantity
        };

        if (this.loadedEffect) {
            /** @type {CapacityFlags} */
            const flags = Util.getFlags(this.loadedEffect);

            flags.loadedChambers += this.quantity;
            flags.ammunition.push(effectAmmunition);

            updates.update(
                this.loadedEffect,
                {
                    "name": buildCapacityLoadedEffectName(flags),
                    "system.description.value": buildCapacityLoadedEffectDescription(flags),
                    "flags.pf2e-ranged-combat": flags
                }
            );
        } else {
            // Create a new loaded effect with this ammunition loaded
            const loadedEffectSource = await Util.getSource(LOADED_EFFECT_ID);
            Util.setEffectTarget(loadedEffectSource, this.weapon);

            /** @type {CapacityFlags} */
            const flags = {
                originalName: loadedEffectSource.name,
                originalDescription: loadedEffectSource.system.description.value,
                capacity: this.weapon.capacity,
                loadedChambers: this.quantity,
                ammunition: [effectAmmunition]
            };

            foundry.utils.mergeObject(loadedEffectSource, this.buildUpdates(flags));

            updates.create(loadedEffectSource);
        }
    }

    /**
     * @param {Updates} updates 
     */
    save(updates) {
        /** @type {CapacityFlags} */
        const flags = Util.getFlags(this.loadedEffect);

        const matchingAmmunition = flags.ammunition.find(loaded => loaded.id === this.id);
        if (!matchingAmmunition) {
            // This shouldn't happen
            return;
        }

        matchingAmmunition.quantity = this.quantity;

        updates.update(this.loadedEffect, this.buildUpdates(flags));
    }

    /**
     * @param {Updates} updates
     */
    onDelete(updates) {
        /** @type {CapacityFlags} */
        const flags = Util.getFlags(this.loadedEffect);

        flags.ammunition.findSplice(loaded => loaded.id === this.id);

        if (flags.ammunition.length > 0) {
            updates.update(this.loadedEffect, this.buildUpdates(flags));
        } else {
            updates.delete(this.loadedEffect);
        }
    }

    /**
     * @param {CapacityFlags} flags
     * @returns the information to update on the loaded effect
     */
    buildUpdates(flags) {
        flags.loadedChambers = 0;
        for (const ammunition of flags.ammunition) {
            flags.loadedChambers += ammunition.quantity;
        }

        return {
            "name": buildCapacityLoadedEffectName(flags),
            "system.description.value": buildCapacityLoadedEffectDescription(flags),
            "flags.pf2e-ranged-combat": flags
        };
    }
}

class StandardAmmunition extends AdvancedLoadedAmmunition {
    /** @type {ItemPF2e} */
    loadedEffect;

    /**
     * @param {Updates} updates
     */
    async create(updates) {
        const loadedEffectSource = await Util.getSource(LOADED_EFFECT_ID);
        Util.setEffectTarget(loadedEffectSource, this.weapon);

        loadedEffectSource.system.description.value += `<p>@UUID[${this.sourceId}]</p>`;

        foundry.utils.mergeObject(
            loadedEffectSource,
            {
                "img": this.img,
                "flags.pf2e-ranged-combat": {
                    "ammunition": {
                        name: this.name,
                        img: this.img,
                        id: this.id,
                        sourceId: this.sourceId
                    }
                }
            }
        );

        updates.create(loadedEffectSource);
    }

    /**
     * There are no updates to be done with this type of ammunition, so leave it alone
     * 
     * @param {Updates} updates
     */
    save(updates) {
    }

    /**
     * @param {Updates} updates
     */
    onDelete(updates) {
        updates.delete(this.loadedEffect);
    }
}

/**
 * Transformer used for "character" actors using Foundry v12 and the advanced
 * ammunition system.
 */
export class AdvancedWeaponSystemTransformer extends WeaponTransformer {
    /**
     * @param {ActorPF2e} actor
     * @returns {boolean}
     */
    isForActor(actor) {
        if (actor.type === "character") {
            return game.settings.get("pf2e-ranged-combat", "advancedAmmunitionSystemPlayer");
        } else if (actor.type === "npc") {
            return Util.getFlag(actor, "enableAdvancedAmmunitionSystem");
        } else {
            return false;
        }
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
        const weapon = new LocalWeapon();

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
                .map(ammunition => this.transformAmmunition(weapon, ammunition))
                .map(ammunition => InventoryAmmunitionTransformer.transform(ammunition));
        } else {
            weapon.img = pf2eMelee.img;

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
                .map(ammunition => this.transformAmmunition(weapon, ammunition))
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
            }
        }

        weapon.loadedAmmunition = [];

        if (weapon.isRepeating) {
            // Look for the Magazine Loaded effect
            const magazineLoadedEffect = Util.getEffect(weapon, MAGAZINE_LOADED_EFFECT_ID);
            if (magazineLoadedEffect) {
                const flags = Util.getFlags(magazineLoadedEffect);

                const ammunition = new Magazine();

                ammunition.id = flags.ammunitionItemId;
                ammunition.img = flags.ammunitionImg;
                ammunition.sourceId = flags.ammunitionSourceId;
                ammunition.name = flags.ammunitionName;

                ammunition.weapon = weapon;
                ammunition.quantity = 1;
                ammunition.hasUses = true;
                ammunition.maxUses = flags.capacity;
                ammunition.remainingUses = flags.remaining;
                ammunition.autoEject = false;
                ammunition.allowDestroy = true;

                ammunition.magazineLoadedEffect = magazineLoadedEffect;

                weapon.loadedAmmunition.push(ammunition);
                weapon.selectedLoadedAmmunition = ammunition;
            }
        } else if (weapon.capacity > 1) {
            // Look for the Loaded effect
            const loadedEffect = Util.getEffect(weapon, LOADED_EFFECT_ID);
            if (loadedEffect) {
                const flags = Util.getFlags(loadedEffect);

                for (const effectAmmunition of flags.ammunition) {
                    const ammunition = new CapacityAmmunition();

                    ammunition.id = effectAmmunition.id;
                    ammunition.img = effectAmmunition.img;
                    ammunition.sourceId = effectAmmunition.sourceId;
                    ammunition.name = effectAmmunition.name;

                    ammunition.weapon = weapon;
                    ammunition.quantity = effectAmmunition.quantity;
                    ammunition.hasUses = false;
                    ammunition.maxUses = 1;
                    ammunition.remainingUses = 1;
                    ammunition.autoEject = true;
                    ammunition.allowDestroy = true;

                    ammunition.loadedEffect = loadedEffect;

                    weapon.loadedAmmunition.push(ammunition);
                }

                if (weapon.isCapacity) {
                    const chamberLoadedEffect = Util.getEffect(weapon, CHAMBER_LOADED_EFFECT_ID);
                    if (chamberLoadedEffect) {
                        weapon.selectedLoadedAmmunition = weapon.loadedAmmunition
                            .find(loaded => loaded.id === Util.getFlag(chamberLoadedEffect, "ammunition").id);
                    }
                }
            }
        } else {
            // Look for the Loaded effect
            const loadedEffect = Util.getEffect(weapon, LOADED_EFFECT_ID);
            if (loadedEffect) {
                const flags = Util.getFlags(loadedEffect);

                const ammunition = new StandardAmmunition();

                ammunition.id = flags.ammunition.id;
                ammunition.img = flags.ammunition.img;
                ammunition.sourceId = flags.ammunition.sourceId;
                ammunition.name = flags.ammunition.name;

                ammunition.weapon = weapon;
                ammunition.quantity = 1;
                ammunition.hasUses = false;
                ammunition.maxUses = 1;
                ammunition.remainingUses = 1;
                ammunition.autoEject = true;
                ammunition.allowDestroy = true;

                ammunition.loadedEffect = loadedEffect;

                weapon.loadedAmmunition.push(ammunition);
                weapon.selectedLoadedAmmunition = ammunition;
            }
        }

        return weapon;
    }

    /**
     * @param {Weapon} weapon
     * @param {WeaponPF2e | ConsumablePF2e | AmmoPF2e} pf2eAmmunition
     * @returns {Ammunition}
     */
    transformAmmunition(weapon, pf2eAmmunition) {
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

        ammunition.autoEject = !weapon.isRepeating;

        return ammunition;
    }
}

/**
 * @param {CapacityFlags} flags
 * @returns {string}
 */
function buildCapacityLoadedEffectName(flags) {
    return `${flags.originalName} (${flags.loadedChambers}/${flags.capacity})`;
}

/**
 * @param {CapacityFlags} flags
 * @returns {string}
 */
function buildCapacityLoadedEffectDescription(flags) {
    return flags.ammunition
        .map(ammunition => `<p>@UUID[${ammunition.sourceId}] x${ammunition.quantity}</p>`)
        .reduce(
            (previous, current) => previous + current,
            flags.originalDescription
        );
}
