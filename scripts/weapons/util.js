import { Section } from "../../lib/lib-item-select-dialog-types/types.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { ItemSelect } from "../utils/item-select-dialog.js";
import { useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { WeaponTransformer } from "./transformer/base.js";
import { AdvancedWeaponSystemPlayerTransformer } from "./transformer/player-advanced-weapon-system.js";
import { SubItemTransformer } from "./transformer/sub-item-ammunition.js";
import { Ammunition, Weapon } from "./types.js";

const localize = (key, params) => game.i18n.format(`pf2e-ranged-combat.${key}`, params);

export class WeaponUtil {
    /**
     * Find a single weapon that meets the required conditions. If multiple weapons are found, offer a choice of weapon.
     * If a priority predicate is given, and exactly one weapon meets that condition, automatically return that weapon over others.
     * 
     * @param {PF2eActor} actor
     * @param {{
     *      required: (weapon: Weapon) => bool
     *      priority: (weapon: Weapon) => bool
     * }} predicates 
     * @param {string} weaponSelectMessage The message to show above the choice of weapons
     * @param {string} noWeaponsMessage The message to show if there are no weapons that satisfy the main predicate
     * 
     * @returns {Promise<Weapon | null>}
     */
    static async getWeapon(
        actor,
        predicates = {},
        weaponSelectMessage,
        noWeaponsMessage
    ) {
        // Find all weapons that meet the required conditions
        const weapons = WeaponUtil.getWeapons(actor).filter(predicates.required ?? (_ => true));
        if (!weapons.length) {
            showWarning(noWeaponsMessage);
            return null;
        }

        // If we only found one weapon that met the conditions, choose that one automatically
        if (weapons.length === 1) {
            return weapons[0];
        }

        // If we find exactly one of those weapons that meets the priority conditions, return that one
        const priorityWeapons = weapons.filter(predicates.priority ?? (_ => true));
        if (priorityWeapons.length === 1) {
            return priorityWeapons[0];
        }

        /** @type {Section<Weapon>} */
        const sections = [];

        const equippedWeapons = weapons.filter(weapon => weapon.isEquipped);
        if (equippedWeapons.length) {
            sections.push(
                new Section(
                    localize("weaponSystem.carried.equipped"),
                    equippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        const unequippedWeapons = weapons.filter(weapon => !weapon.isEquipped);
        if (unequippedWeapons.length) {
            sections.push(
                new Section(
                    localize("weaponSystem.carried.worn"),
                    unequippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        return ItemSelect.getItem(localize("weaponSystem.weaponSelect.title"), weaponSelectMessage, sections);
    }

    /**
     * Get all the actor's weapons, transformed for use by the module
     * 
     * @param {PF2eActor} actor 
     * @returns {Weapon[]}
     */
    static getWeapons(actor) {
        return getTransformer(actor)
            .getWeapons(actor)
            .map(WeaponTransformer.calculateDerivedValues);
    }
}

/**
 * @param {PF2eActor} actor 
 * @returns {WeaponTransformer}
 */
function getTransformer(actor) {
    if (actor.type === "character" && foundry.utils.isNewerVersion(game.system.version, "7.7")) {
        return new SubItemTransformer();
    } else if (useAdvancedAmmunitionSystem(actor)) {
        return new AdvancedWeaponSystemPlayerTransformer();
    }

    return null;
}
