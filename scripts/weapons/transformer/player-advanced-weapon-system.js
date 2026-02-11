import { LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { CapacityLoadedEffect } from "../../types/pf2e-ranged-combat/loaded-effect.js";
import { PF2eActor } from "../../types/pf2e/actor.js";
import { PF2eItem } from "../../types/pf2e/item.js";
import { PF2eWeapon } from "../../types/pf2e/weapon.js";
import { Updates } from "../../utils/updates.js";
import { getEffectFromActor, getFlags, getItem, setEffectTarget } from "../../utils/utils.js";
import { Ammunition, Weapon } from "../types.js";
import { WeaponTransformer } from "./base.js";

class LocalWeapon extends Weapon {
    /**
     * Transform a generic piece of ammunition to loaded ammunition
     * 
     * @param {Ammunition} ammunition
     * @param {PF2eItem} effect The effect representing the ammunition being loaded into the weapon
     * 
     * @returns {LoadedAmmunition} loadedAmmunition
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

    /**
     * @override
     * 
     * @param {Ammunition} ammunition
     * @param {Updates} updates
     */
    async createAmmunition(ammunition, updates) {
        const newAmmunition = this.transformLoadedAmmunition(ammunition);
        this.loadedAmmunition.push(newAmmunition);

        // The loaded effect for capacity weapons holds multiple stacks of ammunition,
        // so there might already be one.
        if (this.capacity > 0) {
            newAmmunition.loadedEffect = getEffectFromActor(this.actor, LOADED_EFFECT_ID, this.weapon.id);
        }

        await newAmmunition.create(updates);
    }
}

class Magazine extends Ammunition {
    /** @type {PF2eItem} */
    magazineLoadedEffect;

    /**
     * @param {Updates} updates 
     */
    async create(updates) {
        const magazineLoadedEffectSource = await getItem(MAGAZINE_LOADED_EFFECT_ID);
        setEffectTarget(magazineLoadedEffectSource, this.weapon);
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
        const flags = getFlags(this.magazineLoadedEffect);
        flags.remaining = this.remainingUses;

        updates.update(
            this.magazineLoadedEffect,
            {
                "name": `${flags.name} (${this.remainingUses}/${this.capacity})`,
                "flags.pf2e-ranged-combat": flags
            }
        );
    }

    /**
     * @param {Updates} updates
     */
    delete(updates) {
        updates.delete(this.magazineLoadedEffect);
    }
}

class CapacityAmmunition extends Ammunition {
    /** @type {PF2eItem} */
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
            /** @type {CapacityLoadedEffect} */
            const flags = getFlags(this.loadedEffect);

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
            const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
            setEffectTarget(loadedEffectSource, this.weapon);

            /** @type {CapacityLoadedEffect} */
            const flags = {
                originalName: loadedEffectSource.name,
                originalDescription: loadedEffectSource.description,
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
        /** @type {CapacityLoadedEffect} */
        const flags = getFlags(this.loadedEffect);

        const matchingAmmunition = flags.ammunition.find(loaded => loaded.id === this.id);
        if (!matchingAmmunition) {
            // This shouldn't happen
            return;
        }

        matchingAmmunition.quantity = this.quantity;

        updates.update(this.buildUpdates(flags));
    }

    /**
     * @param {Updates} updates
     */
    delete(updates) {
        /** @type {CapacityLoadedEffect} */
        const flags = getFlags(this.loadedEffect);

        flags.ammunition.findSplice(loaded => loaded.id === this.id);

        updates.update(this.buildUpdates(flags));
    }

    /**
     * @param {CapacityLoadedEffect} flags
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

class StandardAmmunition extends Ammunition {
    /** @type {PF2eItem} */
    loadedEffect;

    /**
     * @param {Updates} updates
     */
    async create(updates) {
        const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
        setEffectTarget(loadedEffectSource, this.weapon);

        loadedEffectSource.system.description.value += `<p>@UUID[${ammunition.sourceId}]</p>`;

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
     * @param {Updates} delete
     */
    delete(updates) {
        updates.delete(this.loadedEffect);
    }
}

/**
 * Transformer used for "character" actors using Foundry v12 and the advanced
 * ammunition system.
 */
export class AdvancedWeaponSystemPlayerTransformer extends WeaponTransformer {
    /** 
     * @override
     * 
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
        const weapon = new LocalWeapon();

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

        if (weapon.isRepeating) {
            // Look for the Magazine Loaded effect
            const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (magazineLoadedEffect) {
                const flags = getFlags(magazineLoadedEffect);

                const ammunition = new Magazine();

                ammunition.id = flags.ammunitionItemId;
                ammunition.img = flags.ammunitionImg;
                ammunition.sourceId = flags.ammunitionSourceId;
                ammunition.name = flags.ammunitionName;

                ammunition.weapon = this;
                ammunition.quantity = 1;
                ammunition.hasUses = true;
                ammunition.maxUses = flags.capacity;
                ammunition.remainingUses = flags.remaining;

                ammunition.magazineLoadedEffect = magazineLoadedEffect;

                weapon.loadedAmmunition.push(ammunition);
            }
        } else if (weapon.capacity > 1) {
            // Look for the Loaded effect
            const loadedEffect = getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                const flags = getFlags(loadedEffect);

                for (const effectAmmunition of flags.ammunition) {
                    const ammunition = new CapacityAmmunition();

                    ammunition.id = effectAmmunition.id;
                    ammunition.img = effectAmmunition.img;
                    ammunition.sourceId = effectAmmunition.sourceId;
                    ammunition.name = effectAmmunition.name;

                    ammunition.weapon = this;
                    ammunition.quantity = effectAmmunition.quantity;
                    ammunition.hasUses = false;
                    ammunition.maxUses = 1;
                    ammunition.remainingUses = 1;

                    ammunition.loadedEffect = loadedEffect;

                    weapon.loadedAmmunition.push(ammunition);
                }
            }
        } else {
            // Look for the Loaded effect
            const loadedEffect = getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                const flags = getFlags(loadedEffect);

                const ammunition = new StandardAmmunition();

                ammunition.id = flags.ammunition.id;
                ammunition.img = flags.ammunition.img;
                ammunition.sourceId = flags.ammunition.sourceId;
                ammunition.name = flags.ammunition.name;

                ammunition.weapon = this;
                ammunition.quantity = 1;
                ammunition.hasUses = false;
                ammunition.maxUses = 1;
                ammunition.remainingUses = 1;

                ammunition.loadedEffect = loadedEffect;

                weapon.loadedAmmunition.push(ammunition);
            }
        }

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
     * @param {PF2eWeapon | PF2eAmmo} pf2eAmmunition
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

/**
 * @param {CapacityLoadedEffect} flags
 * @returns {string}
 */
function buildCapacityLoadedEffectName(flags) {
    return `${flags.originalName} (${flags.loadedChambers}/${flags.capacity})`;
}

/**
 * @param {CapacityLoadedEffect} flags
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
