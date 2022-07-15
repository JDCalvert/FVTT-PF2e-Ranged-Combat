import { showWarning } from "../utils/utils.js";
import { useAdvancedThrownWeaponSystem } from "./utils.js";

/**
 * Prevent rolling an attack with a weapon if the stack size is 0, the weapon is not drawn, or the weapon is a
 * dropped version of another weapon (and that weapon still exists)
 */
export async function checkThrownWeapon(weapon) {
    if (!useAdvancedThrownWeaponSystem(weapon.actor)) {
        return true;
    }

    if (!weapon.isEquipped) {
        showWarning(`${weapon.name} is not equipped!`);
        return false;
    }

    if (weapon.value.quantity === 0) {
        showWarning(`You have no ${weapon.name} left!`);
        return false;
    }

    return true;
};
