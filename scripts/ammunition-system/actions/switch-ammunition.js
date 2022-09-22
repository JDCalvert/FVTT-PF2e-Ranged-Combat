import { ItemSelectDialog } from "../../utils/item-select-dialog.js";
import { getControlledActorAndToken, showWarning } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";

export async function switchAmmunition() {
    const { actor } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getSingleWeapon(
        getWeapons(actor, weapon => weapon.usesAmmunition, "You have no weapons that use ammunition.")
    );
    if (!weapon) {
        return;
    }

    const availableAmmunition = actor.itemTypes.consumable
        .filter(item => item.consumableType === "ammo" && !item.isStowed)
        .filter(ammo => ammo.isAmmoFor(weapon.value));
    if (!availableAmmunition.length) {
        showWarning("You have no ammunition equipped.");
        return;
    }

    const ammunitionMap = new Map();
    if (weapon.ammunition) {
        availableAmmunition.findSplice(ammo => ammo.id === weapon.ammunition.id);
        ammunitionMap.set("Current", [weapon.ammunition]);
    };
    if (availableAmmunition.length) {
        ammunitionMap.set("Equipped", availableAmmunition);
    }

    const newAmmo = await ItemSelectDialog.getItem(
        "Ammunition Select",
        "Select the ammunition to switch to.",
        ammunitionMap
    );

    if (!newAmmo) {
        return;
    }

    await actor.updateEmbeddedDocuments(
        "Item",
        [
            {
                _id: weapon.id,
                system: {
                    selectedAmmoId: newAmmo.id
                }
            }
        ]
    );
}
