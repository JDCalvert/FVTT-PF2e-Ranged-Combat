import { showWarning } from "../utils/utils.js";
import { findGroupStacks } from "./change-carry-type.js";
import { useAdvancedThrownWeaponSystem } from "./utils.js";

/**
 * Prevent rolling an attack with a weapon if the stack size is 0, the weapon is not drawn, or the weapon is a
 * dropped version of another weapon (and that weapon still exists)
 */
export async function checkThrownWeapon(weapon) {
    if (!useAdvancedThrownWeaponSystem(weapon.actor)) {
        return true;
    }

    // Find a weapon in the target weapon's group which is equipped
    const groupStacks = findGroupStacks(weapon);
    const equippedWeapons = groupStacks.filter(stack => stack.isEquipped);
    if (!equippedWeapons.length) {
        showWarning(`${weapon.name} is not equipped!`);
        return false;
    }

    if (!equippedWeapons.filter(stack => stack.quantity).length) {
        showWarning(`You have no ${weapon.name} left!`);
        return false;
    }

    return true;
};
