import { Option, Section } from "../../../lib/lib-item-select-dialog-types/types.js";
import { ItemSelect } from "../../utils/item-select-dialog.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { AmmunitionSystem, WeaponSystem } from "../../weapons/system.js";
import { InventoryAmmunition, Weapon } from "../../weapons/types.js";
import { UNLOAD_IMG } from "../constants.js";

/**
 * @enum {number}
 */
export const SetSelected = {
    DefaultNo: 1,
    DefaultYes: 2,
    Always: 3
};

/**
 * @typedef {object} ChooseAmmunitionOptions
 * @property {{predicate: (ammunition: InventoryAmmunition) => boolean, warningMessage?: string}} [filter]
 * @property {SetSelected} [setSelected]
 * @property {boolean} [allowDeselect]
 * @property {boolean} [allowAutoSelect]
 */

export class SwitchAmmunition {
    /**
     * @param {string} key 
     * @param {object} data 
     * 
     * @returns {string}
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`actions.switchAmmunition.${key}`, data);
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: weapon => weapon.expend > 0
            },
            "switchAmmunition",
            SwitchAmmunition.localize("warningNoWeaponUsesAmmunition", { actor: actor.name })
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);

        const ammunition = await SwitchAmmunition.chooseAmmunition(
            weapon,
            updates,
            AmmunitionSystem.localize(`select.action.switch`),
            {
                setSelected: SetSelected.Always,
                allowDeselect: true
            }
        );

        updates.commit();

        // Only call the hook if we actually changed or cleared the selected ammunition
        if (ammunition) {
            Hooks.callAll("pf2eRangedCombatSwitchAmmunition", actor, weapon);
        }
    }

    /**
     * Display a choice of all the ammunition compatible with the weapon, as well as the option to clear the selected ammunition
     * 
     * @param {Weapon} weapon 
     * @param {Updates} updates
     * @param {string} message Message to display at the top of the dialog
     * @param {ChooseAmmunitionOptions} options
     * 
     * @returns {Promise<InventoryAmmunition | null>}
     */
    static async chooseAmmunition(weapon, updates, message, options) {
        if (!weapon.compatibleAmmunition.length) {
            Util.warn(AmmunitionSystem.localize("warning.noCompatibleAmmunition", { actor: weapon.actor.name, weapon: weapon.name }));
            return null;
        }

        // Apply the filter given in options, if any
        let compatibleAmmunition = weapon.compatibleAmmunition.filter(options?.filter?.predicate ?? (_ => true));
        if (!compatibleAmmunition.length) {
            Util.warn(options.filter?.warningMessage ?? AmmunitionSystem.localize("select.warning.noneValid", { weapon: weapon.name }));
            return null;
        }

        const selectedAmmunition = compatibleAmmunition.findSplice(ammunition => ammunition === weapon.selectedInventoryAmmunition);
        if (selectedAmmunition && options.allowAutoSelect) {
            return selectedAmmunition;
        }

        if (compatibleAmmunition.length === 1 && options.allowAutoSelect) {
            return compatibleAmmunition[0];
        }

        /** @type {Section<InventoryAmmunition>[]} */
        const sections = [];

        // Display the currently-selected ammunition in its own category
        if (selectedAmmunition) {
            sections.push(
                new Section(
                    AmmunitionSystem.localize("select.header.current"),
                    [AmmunitionSystem.buildChoice(selectedAmmunition)]
                )
            );
        }

        const heldAmmunition = compatibleAmmunition.filter(ammunition => ammunition.isHeld);
        if (heldAmmunition.length > 0) {
            sections.push(
                new Section(
                    WeaponSystem.localize("carried.held"),
                    heldAmmunition.map(AmmunitionSystem.buildChoice)
                )
            );
        }

        const wornAmmunition = compatibleAmmunition.filter(ammunition => !ammunition.isHeld);
        if (wornAmmunition.length > 0) {
            sections.push(
                new Section(
                    WeaponSystem.localize("carried.worn"),
                    wornAmmunition.map(AmmunitionSystem.buildChoice)
                )
            );
        }

        // Allow the option to clear the selected ammunition
        if (selectedAmmunition && options.allowDeselect) {
            const clearAmmunitionItem = new InventoryAmmunition();
            clearAmmunitionItem.id = "clear";
            clearAmmunitionItem.name = AmmunitionSystem.localize("select.option.clear");
            clearAmmunitionItem.img = UNLOAD_IMG;

            sections.push(new Section(AmmunitionSystem.localize("select.header.clear"), [ItemSelect.buildChoice(clearAmmunitionItem)]));
        }

        /** @type {Option[]} */
        const selectOptions = [];
        if (options.setSelected === SetSelected.DefaultNo || options.setSelected === SetSelected.DefaultYes) {
            selectOptions.push(
                {
                    id: "set-as-ammunition",
                    label: AmmunitionSystem.localize("select.option.setAsAmmunition"),
                    value: options.setSelected === SetSelected.DefaultYes
                }
            );
        }

        const result = await ItemSelect.getItemWithOptions(
            AmmunitionSystem.localize("select.titleWithWeapon", { weapon: weapon.name }),
            message,
            sections,
            selectOptions
        );
        if (!result) {
            return null;
        }

        // If we chose to clear the selected ammunition, do so and return nothing
        if (result.choice.id === "clear") {
            weapon.setSelectedAmmunition(null, updates);
        } else if (options.setSelected === SetSelected.Always || result.options["set-as-ammunition"]) {
            weapon.setSelectedAmmunition(result.choice.item, updates);
        }

        return result.choice.item;
    }
}
