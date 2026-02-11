import { Choice, Section } from "../../../lib/lib-item-select-dialog-types/types.js";
import { Weapon } from "../../types/pf2e-ranged-combat/weapon.js";
import { PF2eConsumable } from "../../types/pf2e/consumable.js";
import { ItemSelect } from "../../utils/item-select-dialog.js";
import { Updates } from "../../utils/updates.js";
import { getControlledActorAndToken, isUsingSystemAmmunitionSystem, showWarning } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.switchAmmunition." + key);
const localizeDialog = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.ammunitionSelect." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.switchAmmunition." + key, data);

export async function switchAmmunition() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (isUsingSystemAmmunitionSystem(actor)) {
        ui.notifications.warn(game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.disabled"));
        return;
    }

    const weapon = await getWeapon(actor, weapon => weapon.usesAmmunition, localize("warningNoWeaponUsesAmmunition"));
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    await selectAmmunition(
        weapon,
        updates,
        format("warningNoCompatibleAmmunitionAvailable", { weapon: weapon.name }),
        localizeDialog("action.switch"),
        true,
        true
    );

    updates.handleUpdates();
    Hooks.callAll("pf2eRangedCombatSwitchAmmunition", actor, token, weapon);
}

/**
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @param {string} nonAvailableMessage 
 * @param {string} selectNewMessage 
 * @param {boolean} defaultSetAsAmmunition 
 * @param {boolean} alwaysSetAsAmmunition 
 * @returns 
 */
export async function selectAmmunition(
    weapon,
    updates,
    nonAvailableMessage,
    selectNewMessage,
    defaultSetAsAmmunition,
    alwaysSetAsAmmunition
) {
    const consumableAmmunition = weapon.actor.itemTypes.consumable
        .filter(item => item.isAmmo && !item.isStowed)
        .filter(ammo => ammo.quantity > 0 || !ammo.system.uses.autoDestroy)
        .filter(ammo => weapon.isAmmunitionForWeapon(ammo));

    const weaponAmmunition = weapon.actor.itemTypes.weapon
        .filter(item => !item.isStowed)
        .filter(item => item.quantity > 0)
        .filter(item => weapon.isAmmunitionForWeapon(item));

    const availableAmmunition = consumableAmmunition.concat(weaponAmmunition);

    if (!availableAmmunition.length) {
        showWarning(nonAvailableMessage);
        return;
    }

    const availableAmmunitionChoices = availableAmmunition.map(
        ammunition => {
            return new Choice(
                ammunition.id,
                `${ammunition.name} (${ammunition.quantity})`,
                ammunition.img,
                ammunition
            );
        }
    );

    /** @type Section<PF2eConsumable>[] */
    const sections = [];

    if (weapon.ammunition) {
        const currentAmmunition = availableAmmunitionChoices.findSplice(ammo => ammo.id === weapon.ammunition.id);
        if (currentAmmunition) {
            sections.push(
                new Section(localizeDialog("header.current"), [currentAmmunition])
            );
        }
    };
    if (availableAmmunitionChoices.length) {
        sections.push(new Section(localizeDialog("header.equipped"), availableAmmunitionChoices));
    }

    const result = await ItemSelect.getItemWithOptions(
        localizeDialog("title"),
        selectNewMessage,
        sections,
        alwaysSetAsAmmunition
            ? []
            : [
                {
                    id: "set-as-ammunition",
                    label: localizeDialog("option.setAsAmmunition"),
                    value: defaultSetAsAmmunition
                }
            ]
    );

    if (!result) {
        return;
    }

    const selectedAmmunition = availableAmmunition.find(ammunition => ammunition.id === result.choice.id);

    if (alwaysSetAsAmmunition || result.options["set-as-ammunition"]) {
        updates.update(
            weapon,
            {
                system: {
                    selectedAmmoId: selectedAmmunition.id
                }
            }
        );
    }

    return selectedAmmunition;
}
