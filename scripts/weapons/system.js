import { Choice, Section } from "../../lib/lib-item-select-dialog-types/types.js";
import { ItemSelect } from "../utils/item-select-dialog.js";
import { Util } from "../utils/utils.js";
import { Ammunition, InventoryAmmunition, LoadedAmmunition, Weapon } from "./types.js";
import { WeaponTransformer } from "./weapon-transformer/base.js";
import { AdvancedWeaponSystemTransformer } from "./weapon-transformer/player-advanced-weapon-system.js";
import { SimpleWeaponSystemTransformer } from "./weapon-transformer/simple-ammunition-system.js";
import { SubItemTransformer } from "./weapon-transformer/sub-item-ammunition.js";

export class WeaponSystem {
    /**
     * @param {string} key 
     * @param {object} params 
     * @returns 
     */
    static localize(key, params) {
        return Util.localize(`weaponSystem.${key}`, params);
    }

    /**
     * Find a single weapon that meets the required conditions. If multiple weapons are found, offer a choice of weapon.
     * If a priority predicate is given, and exactly one weapon meets that condition, automatically return that weapon over others.
     * 
     * @param {ActorPF2e} actor
     * @param {{
     *      required?: (weapon: Weapon) => boolean
     *      priority?: (weapon: Weapon) => boolean
     * }} predicates 
     * @param {string} action The message to show above the choice of weapons
     * @param {string} noWeaponsMessage The message to show if there are no weapons that satisfy the main predicate
     * 
     * @returns {Promise<Weapon | null>}
     */
    static async getWeapon(
        actor,
        predicates,
        action,
        noWeaponsMessage
    ) {
        // Find all weapons that meet the required conditions
        const weapons = WeaponSystem.getWeapons(actor, predicates.required);
        if (!weapons.length) {
            Util.warn(noWeaponsMessage);
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

        /** @type {Section<Weapon>[]} */
        const sections = [];

        const equippedWeapons = weapons.filter(weapon => weapon.isEquipped);
        if (equippedWeapons.length) {
            sections.push(
                new Section(
                    WeaponSystem.localize("carried.equipped"),
                    equippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        const unequippedWeapons = weapons.filter(weapon => !weapon.isEquipped);
        if (unequippedWeapons.length) {
            sections.push(
                new Section(
                    WeaponSystem.localize("carried.worn"),
                    unequippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        return ItemSelect.getItem(
            WeaponSystem.localize("select.title"),
            WeaponSystem.localize(`select.action.${action}`),
            sections
        );
    }

    /**
     * Get all the actor's weapons, transformed for use by the module
     * 
     * @param {ActorPF2e} actor 
     * @param {(weapon: Weapon) => boolean} [predicate]
     * 
     * @returns {Weapon[]}
     */
    static getWeapons(actor, predicate) {
        return getTransformer(actor)
            .getWeapons(actor)
            .map(WeaponTransformer.calculateDerivedValues)
            .filter(predicate ?? (_ => true));
    }

    /**
     * Transform the given weapon for use by the module
     * 
     * @param {ActorPF2e} actor 
     * @param {WeaponPF2e | MeleePF2e} weapon 
     * 
     * @returns {Weapon}
     */
    static transformWeapon(actor, weapon) {
        const transformedWeapon = getTransformer(actor).transformWeapon(weapon);
        WeaponTransformer.calculateDerivedValues(transformedWeapon);
        return transformedWeapon;
    }
}

/**
 * @typedef {object} ChooseAmmunitionOptions
 * @property {{predicate: (ammunition: InventoryAmmunition) => boolean, warningMessage?: string}} [filter]
 * @property {{header: string, predicate: (weapon: LoadedAmmunition) => boolean}[]} [categories]
 * @property {boolean} [autoChooseSelected]
 * @property {boolean} [autoChooseOnlyOption]
 */

export class AmmunitionSystem {
    /**
     * @param {string} key 
     * @param {object} params 
     * 
     * @returns {string}
     */
    static localize(key, params) {
        return Util.localize(`ammunitionSystem.${key}`, params);
    }

    /**
     * Choose a piece of ammunition loaded into the weapon
     * 
     * @param {Weapon} weapon 
     * @param {string} action
     * @param {ChooseAmmunitionOptions} [options]
     * 
     * @returns {Promise<LoadedAmmunition | null>}
     */
    static async chooseLoadedAmmunition(weapon, action, options) {
        if (CONFIG.pf2eRangedCombat.silent) {
            return null;
        }

        if (!weapon.loadedAmmunition.length) {
            Util.warn(AmmunitionSystem.localize("check.weaponNotLoaded", { weapon: weapon.name }));
            return null;
        }

        let ammunition = weapon.loadedAmmunition.filter(options?.filter?.predicate ?? (_ => true));
        if (!ammunition.length) {
            Util.warn(options.filter.warningMessage ?? AmmunitionSystem.localize("select.warning.noneValid"));
            return null;
        }

        const selectedLoadedAmmunition = ammunition.find(loaded => loaded === weapon.selectedLoadedAmmunition);
        if (selectedLoadedAmmunition && options?.autoChooseSelected) {
            return selectedLoadedAmmunition;
        }

        if (ammunition.length === 1 && options?.autoChooseOnlyOption) {
            return ammunition[0];
        }

        /** @type {Section<LoadedAmmunition>[]} */
        const sections = [];

        if (selectedLoadedAmmunition) {
            ammunition.findSplice(loaded => loaded === selectedLoadedAmmunition);

            sections.push(
                new Section(
                    AmmunitionSystem.localize("select.header.current"),
                    [AmmunitionSystem.buildChoice(selectedLoadedAmmunition)]
                )
            );
        }

        // Go through each of the categories, find ammunition that satisfies them, and create sections
        for (const category of options?.categories ?? []) {
            const choices = ammunition.filter(category.predicate);
            if (choices.length > 0) {
                sections.push(
                    new Section(
                        AmmunitionSystem.localize(`select.header.${category.header}`),
                        choices.map(AmmunitionSystem.buildChoice)
                    )
                );
            }

            ammunition = ammunition.filter(ammunition => !category.predicate(ammunition));
        }

        // If there's any ammunition that isn't in any of the categories above, put it in the "loaded" category
        if (ammunition.length > 0) {
            sections.push(
                new Section(
                    AmmunitionSystem.localize(`select.header.loaded`),
                    ammunition.map(AmmunitionSystem.buildChoice)
                )
            );
        }

        return ItemSelect.getItem(
            AmmunitionSystem.localize("select.titleWithWeapon", { weapon: weapon.name }),
            AmmunitionSystem.localize(`select.action.${action}`),
            sections
        );
    }

    /**
     * @param {Ammunition} ammunition
     * @returns {Choice}
     */
    static buildChoice(ammunition) {
        const choice = ItemSelect.buildChoice(ammunition);

        choice.info.push(`x${ammunition.quantity}`);
        if (ammunition.maxUses > 1) {
            choice.info.push(`${ammunition.remainingUses}/${ammunition.maxUses}`);
        }

        return choice;
    }
}

const transformers = [
    new SubItemTransformer(),
    new AdvancedWeaponSystemTransformer(),
    new SimpleWeaponSystemTransformer()
];

/**
 * @param {ActorPF2e} actor 
 * @returns {WeaponTransformer}
 */
function getTransformer(actor) {
    for (const transformer of transformers) {
        if (transformer.isForActor(actor)) {
            return transformer;
        }
    }

    console.error(`No transformer for actor id=${actor.id}`);
    return null;
}
