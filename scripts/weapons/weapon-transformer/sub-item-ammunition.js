import { CHAMBER_LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { InventoryAmmunitionTransformer } from "../ammunition-transformer/inventory.js";
import { Ammunition, InventoryAmmunition, LoadedAmmunition, Weapon } from "../types.js";
import { WeaponTransformer } from "./base.js";

class SubItemWeapon extends Weapon {

    /**
     * Reference to the actual weapon
     * 
     * @type {WeaponPF2e}
     */
    pf2eWeapon;

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
        const loadedAmmunition = this.transformLoadedAmmunition(ammunition);
        this.loadedAmmunition.push(loadedAmmunition);

        await loadedAmmunition.create(updates);
    }

    /**
     * @param {InventoryAmmunition | null} ammunition
     * @param {Updates} updates
     */
    setSelectedAmmunition(ammunition, updates) {
        this.selectedInventoryAmmunition = ammunition;

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
        // If we already have a chamber loaded, remove that effect
        const chamberLoadedEffect = Util.getEffect(this, CHAMBER_LOADED_EFFECT_ID);
        if (chamberLoadedEffect) {
            updates.delete(chamberLoadedEffect);
        }

        const chamberLoadedSource = await Util.getSource(CHAMBER_LOADED_EFFECT_ID);
        Util.setEffectTarget(chamberLoadedSource, this);

        foundry.utils.mergeObject(
            chamberLoadedSource,
            {
                name: `${chamberLoadedSource.name} (${ammunition.name})`,
                flags: {
                    "pf2e-ranged-combat": {
                        name: ammunition.name,
                        img: ammunition.img,
                        id: ammunition.id,
                        sourceId: ammunition.sourceId
                    }
                }
            }
        );

        updates.create(chamberLoadedSource);

        // Move the chosen ammunition to the front of the sub-items list
        const subitems = this.pf2eWeapon.system.subitems;
        subitems.unshift(subitems.findSplice(subitem => subitem._id === ammunition.id));
        for (let i = 0; i < subitems.length; i++) {
            subitems[i].sort = i;
        }

        updates.update(this, { "system.subitems": subitems });
    }
}

export class SubItemAmmunition extends LoadedAmmunition {
    /** @type {WeaponPF2e} */
    pf2eWeapon;

    /**
     * @override
     * @param {Updates} updates
     */
    async create(updates) {
        const subitems = this.pf2eWeapon.system.subitems;

        const ammunitionSource = /** @type {SubItem} */ (await Util.getSource(this.sourceId));
        ammunitionSource.system.quantity = this.quantity;
        ammunitionSource.sort = subitems.length;
        if (this.hasUses) {
            ammunitionSource.system.uses.value = this.remainingUses;
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
    onDelete(updates) {
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
     * @param {ActorPF2e} actor
     * @returns {boolean}
     */
    isForActor(actor) {
        return foundry.utils.isNewerVersion(game.system.version, "7.7") && actor.type === "character";
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

        weapon.group = pf2eWeapon.system.group;
        weapon.baseItem = pf2eWeapon.system.baseItem;

        weapon.isStowed = pf2eWeapon.isStowed;
        weapon.isEquipped = pf2eWeapon.isEquipped;

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

        const capacity = WeaponTransformer.findTraitValue(pf2eWeapon, "capacity");
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

        const selectedAmmunitionId = Util.getFlag(pf2eWeapon, "ammunitionId");
        if (selectedAmmunitionId) {
            weapon.selectedInventoryAmmunition = weapon.compatibleAmmunition.find(compatible => compatible.id === selectedAmmunitionId);
        }

        // Find the weapon's sub-items that are ammunition, transform them into
        // generic ammunition, and then into loaded ammunition
        weapon.loadedAmmunition = pf2eWeapon.subitems.contents
            .filter(item => item.isAmmoFor(pf2eWeapon))
            .map(ammo => this.transformAmmunition(ammo))
            .map(ammo => weapon.transformLoadedAmmunition(ammo));

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
