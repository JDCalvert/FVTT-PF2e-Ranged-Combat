import { ItemSelectDialog } from "../../utils/item-select-dialog.js";
import { getControlledActorAndToken, showWarning, Updates } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";

export async function switchAmmunition() {
    const { actor } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getWeapon(actor, weapon => weapon.usesAmmunition, "You have no weapons that use ammunition.");
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    await selectAmmunition(
        weapon,
        updates,
        `You have no equipped ammunition compatible with your ${weapon.name}.`,
        "Select the ammunition to switch to.",
        true,
        true
    );

    updates.handleUpdates();
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
        .filter(item => item.consumableType === "ammo" && !item.isStowed)
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
            ammunitionMap.set("Current", [currentAmmunition]);
        }
    };
    if (availableAmmunitionChoices.length) {
        ammunitionMap.set("Equipped", availableAmmunitionChoices);
    }

    const result = await ItemSelectDialog.getItemWithOptions(
        "Ammunition Select",
        selectNewMessage,
        ammunitionMap,
        alwaysSetAsAmmunition
            ? []
            : [
                {
                    id: "set-as-ammunition",
                    label: "Set as ammunition",
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
