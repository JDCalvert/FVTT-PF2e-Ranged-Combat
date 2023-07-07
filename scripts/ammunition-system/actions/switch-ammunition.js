import { ItemSelectDialog } from "../../utils/item-select-dialog.js";
import { getControlledActorAndToken, showWarning, Updates } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.switchAmmunition." + key);
const localizeDialog = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.ammunitionSelect." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.switchAmmunition." + key, data);

export async function switchAmmunition() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
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
        format("warningNoCompatibleAmmunitionAvailable", { weapon: weapon }),
        localizeDialog("action.switch"),
        true,
        true
    );

    updates.handleUpdates();
    Hooks.callAll("pf2eRangedCombatSwitchAmmunition", actor, token, weapon);
}

export async function selectAmmunition(
    weapon,
    updates,
    nonAvailableMessage,
    selectNewMessage,
    defaultSetAsAmmunition,
    alwaysSetAsAmmunition
) {
    const availableAmmunition = weapon.actor.itemTypes.consumable
        .filter(item => item.isAmmunition && !item.isStowed)
        .filter(ammo => ammo.quantity > 0)
        .filter(ammo => weapon.isAmmunitionForWeapon(ammo));

    if (!availableAmmunition.length) {
        showWarning(nonAvailableMessage);
        return;
    }

    const availableAmmunitionChoices = availableAmmunition.map(
        ammunition => {
            return {
                id: ammunition.id,
                name: `${ammunition.name} (${ammunition.quantity})`,
                img: ammunition.img
            };
        }
    );

    const ammunitionMap = new Map();
    if (weapon.ammunition) {
        const currentAmmunition = availableAmmunitionChoices.findSplice(ammo => ammo.id === weapon.ammunition.id);
        if (currentAmmunition) {
            ammunitionMap.set(localizeDialog("header.current"), [currentAmmunition]);
        }
    };
    if (availableAmmunitionChoices.length) {
        ammunitionMap.set(localizeDialog("header.equipped"), availableAmmunitionChoices);
    }

    const result = await ItemSelectDialog.getItemWithOptions(
        localizeDialog("title"),
        selectNewMessage,
        ammunitionMap,
        alwaysSetAsAmmunition
            ? []
            : [
                {
                    id: "set-as-ammunition",
                    label: localizeDialog("option.setAsAmmunition"),
                    defaultValue: defaultSetAsAmmunition
                }
            ]
    );

    if (!result) {
        return;
    }

    const selectedAmmunition = availableAmmunition.find(ammunition => ammunition.id === result.item.id);

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
