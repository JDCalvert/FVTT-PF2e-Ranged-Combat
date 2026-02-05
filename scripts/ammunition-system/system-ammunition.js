import { Section } from "../../lib/lib-item-select-dialog-types/types.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eWeapon } from "../types/pf2e/weapon.js";
import { showWarning } from "../utils/utils.js";
import * as ItemSelect from "../utils/item-select-dialog.js";
import { PF2eItem } from "../types/pf2e/item.js";
import { Updates } from "../utils/updates.js";

const localize = key => game.i18n.localize(`pf2e-ranged-combat.ammunitionSystem.${key}`);
const format = (key, params) => game.i18n.format(`pf2e-ranged-combat.ammunitionSystem.${key}`, params);

export class SystemAmmunition {

    /**
     * @param {PF2eActor} actor 
     */
    static async reload(actor) {
        const weapon = await this.getWeapon(
            actor,
            {
                priority: weapon => this.calculateRemainingCapacity(weapon) > 0 && this.findCompatibleAmmunition(weapon).length > 0
            },
            "actions.reload.warningNoReloadableWeapons"
        );
        if (!weapon) {
            return;
        }

        const remainingCapacity = this.calculateRemainingCapacity(weapon);
        if (remainingCapacity <= 0) {
            showWarning(format("actions.reload.warningAlreadyFullyLoaded", { weapon: weapon.name }));
            return;
        }

        const ammunition = await this.getCompatibleAmmunition(weapon);
        if (!ammunition) {
            return;
        }

        const updates = new Updates(actor);

        updates.update(ammunition, { "system.quantity": ammunition.system.quantity - 1 });

        const subitems = weapon.system.subitems;

        // Try to find a matching item
        const matchingAmmunition = subitems.find(subitem => subitem.system.slug === ammunition.system.slug);
        if (matchingAmmunition) {
            matchingAmmunition.system.quantity++;
        } else {
            const ammunitionSource = ammunition.toObject();
            ammunitionSource.system.quantity = 1;
            ammunitionSource.sort = subitems.length;

            subitems.push(ammunitionSource);
        }

        updates.update(weapon, { "system.subitems": subitems });

        updates.handleUpdates();
    }

    /**
     * @param {PF2eActor} actor
     */
    static async unload(actor) {
        // Find a weapon that is currently loaded
        const weapon = await this.getWeapon(
            actor,
            {
                required: weapon => this.calculateLoadedRounds(weapon) > 0
            },
            "actions.unload.noLoadedWeapons"
        );

        if (!weapon) {
            return;
        }

        let ammunition;

        const loadedAmmunition = this.getLoadedAmmunition(weapon);
        if (loadedAmmunition.length === 1) {
            ammunition = loadedAmmunition[0];
        } else {
            ammunition = await ItemSelect.getItem(
                `Unload Ammunition (${weapon.name})`,
                `Select ammunition to unload from ${weapon.name}.`,
                [
                    new Section(
                        localize("ammunitionSelect.header.loadedAmmunition"),
                        loadedAmmunition.map(ItemSelect.buildChoice)
                    )
                ]
            );
        }

        if (!ammunition) {
            return;
        }

        const updates = new Updates(actor);

        const subitems = weapon.system.subitems;

        // Either reduce the quantity of the ammunition, or delete it if the current quantity is 1.
        if (ammunition.system.quantity > 1) {
            const ammunitionItem = subitems.find(item => item.system.slug === ammunition.system.slug);
            ammunitionItem.system.quantity--;
        } else {
            subitems.findSplice(item => item.system.slug === ammunition.system.slug);
            for (const item of subitems) {
                if (item.sort > ammunition.sort) {
                    item.sort--;
                }
            }
        }

        updates.update(weapon, { "system.subitems": subitems });

        // Try to find an existing stack of the unloaded ammunition in the actor's inventory. If none is found, create a new stack
        const existingStack = [
            ...actor.itemTypes.weapon,
            ...actor.itemTypes.ammo
        ]
            .filter(item => !item.isStowed)
            .find(item => item.system.slug === ammunition.system.slug);
        if (existingStack) {
            updates.update(existingStack, { "system.quantity": existingStack.quantity + 1 });
        } else {
            const ammunitionSource = ammunition.toObject();
            updates.create(ammunitionSource);
        }

        updates.handleUpdates();
    }

    /**
     * Find a single weapon that can be reloaded. If multiple weapons are found, offer a choice of weapon.
     * 
     * @param {PF2eActor} actor
     * @param {{
     *      required: (weapon: PF2eWeapon) => bool
     *      priority: (weapon: PF2eWeapon) => bool
     * }} predicates Predicates to determine which weapons will be available for selection, or automatically selected
     * @param {string} noWeaponsMessage The message to show if there are no weapons that satisfy the main predicate
     * 
     * @returns {Promise<PF2eWeapon | null>}
     */
    static async getWeapon(
        actor,
        predicates = {},
        noWeaponsMessage
    ) {
        // Find all wielded or worn weapons that have capacity
        const weapons = actor.itemTypes.weapon
            .filter(weapon => weapon.system.ammo?.capacity)
            .filter(weapon => !weapon.isStowed)
            .filter(predicates.required ?? (_ => true));

        if (!weapons.length) {
            showWarning(localize(noWeaponsMessage));
            return null;
        }

        if (weapons.length === 1) {
            // If we only found one weapon that met the conditions, choose that one automatically
            return weapons[0];
        } else {
            // Prioritise equipped weapons that have some capacity left
            const priorityWeapons = weapons
                .filter(weapon => weapon.isEquipped)
                .filter(predicates.priority ?? (_ => true));

            if (priorityWeapons.length === 1) {
                return priorityWeapons[0];
            }
        }

        /** @type Section<PF2eWeapon> */
        const sections = [];
        const equippedWeapons = weapons.filter(weapon => weapon.isEquipped);
        if (equippedWeapons.length) {
            sections.push(
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.equipped"),
                    equippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        const unequippedWeapons = weapons.filter(weapon => !weapon.isEquipped);
        if (unequippedWeapons.length) {
            sections.push(
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.worn"),
                    unequippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        return ItemSelect.getItem("Weapon Select", "Select a Weapon", sections);
    }

    /**
     * Find any ammunition that is compatible with the weapon. If multiple are found, offer a choice.
     * 
     * @param {PF2eWeapon} weapon 
     * @returns {Promise<PF2eItem | null>} The selected ammunition, if any was found and selected.
     */
    static async getCompatibleAmmunition(weapon) {
        const ammunition = this.findCompatibleAmmunition(weapon);

        if (!ammunition.length) {
            showWarning(game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.reload.warningNoCompatibleAmmunition"));
            return null;
        }

        if (ammunition.length === 1) {
            return ammunition[0];
        }

        return ItemSelect.getItem(
            `Ammunition Select (${weapon.name})`,
            `Select ammunition to load into ${weapon.name}.`,
            [
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.worn"),
                    ammunition.map(ItemSelect.buildChoice)
                )
            ]
        );
    }

    /**
     * Calculate the remaining capacity of the weapon.
     * 
     * @param {PF2eWeapon} weapon
     * @returns {number}
     */
    static calculateRemainingCapacity(weapon) {
        return weapon.system.ammo.capacity - this.calculateLoadedRounds(weapon);
    }

    /**
     * @param {PF2eWeapon} weapon 
     */
    static calculateLoadedRounds(weapon) {
        return this.getLoadedAmmunition(weapon)
            .map(item => item.system.quantity)
            .reduce((current, quantity) => current + quantity, 0);
    }

    /**
     * @param {PF2eWeapon} weapon
     * @returns {PF2eItem[]}
     */
    static getLoadedAmmunition(weapon) {
        return weapon.subitems.contents.filter(item => item.isAmmoFor(weapon));
    }

    /**
     * @param {PF2eWeapon} weapon
     */
    static findCompatibleAmmunition(weapon) {
        return [
            ...weapon.actor.itemTypes.weapon,
            ...weapon.actor.itemTypes.ammo
        ]
            .filter(ammo => ammo.system.quantity > 0)
            .filter(ammo => !ammo.isStowed)
            .filter(ammo => ammo.isAmmoFor(weapon));
    }
}

