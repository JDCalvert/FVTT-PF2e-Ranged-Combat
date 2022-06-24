import { showWarning } from "../utils/utils.js";
import { removeDroppedState } from "./utils.js";

/**
 * Prevent rolling an attack with a weapon if the stack size is 0, the weapon is not drawn, or the weapon is a
 * dropped version of another weapon (and that weapon still exists)
 */
export async function checkThrownWeapon(weapon) {
    if (!game.settings.get("pf2e-ranged-combat", "advancedThrownWeaponSystemPlayer")) {
        return true;
    }

    const itemFlags = weapon.value.data.flags["pf2e-ranged-combat"];
    const droppedFrom = itemFlags?.droppedFrom;
    if (droppedFrom) {
        const originalWeapon = weapon.actor.items.find(item => item.id === droppedFrom.id);
        if (originalWeapon) {
            showWarning(`This weapon represents a dropped version of ${originalWeapon.name} and cannot be used to attack.`);
            return false;
        } else {
            // The original weapon couldn't be found, so remove the droppedFrom flag and the name suffix
            const updatedWeapon = await removeDroppedState(weapon.value);
            weapon.value = updatedWeapon;
            weapon.name = updatedWeapon.name;
        }
    }

    if (weapon.value.quantity === 0) {
        showWarning(`You have no ${weapon.name} left!`);
        return false;
    }

    if (!weapon.isEquipped) {
        showWarning(`${weapon.name} is not equipped!`);
        return false;
    }

    return true;
};
