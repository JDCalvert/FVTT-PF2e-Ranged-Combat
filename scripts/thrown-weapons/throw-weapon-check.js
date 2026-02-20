import { HookManager } from "../utils/hook-manager.js";
import { showWarning } from "../utils/utils.js";
import { findGroupStacks } from "./change-carry-type.js";
import { useAdvancedThrownWeaponSystem } from "./utils.js";

export async function initialiseThrownWeaponCheck() {
    HookManager.registerCheck("weapon-attack", checkThrownWeapon);
}

/**
 * Prevent rolling an attack with a weapon if the stack size is 0, the weapon is not drawn, or the weapon is a
 * dropped version of another weapon (and that weapon still exists)
 * 
 * @param {Weapon} weapon
 */
async function checkThrownWeapon({ weapon }) {
    if (!useAdvancedThrownWeaponSystem(weapon.actor)) {
        return true;
    }

    // Find a weapon in the target weapon's group which is equipped
    const groupStacks = findGroupStacks(weapon);
    const equippedWeapons = groupStacks.filter(stack => stack.isEquipped);
    if (!equippedWeapons.length) {
        showWarning(game.i18n.format("pf2e-ranged-combat.thrownWeapons.warningNotEquipped", { weapon: weapon.name }));
        return false;
    }

    if (!equippedWeapons.filter(stack => stack.quantity).length) {
        showWarning(game.i18n.format("pf2e-ranged-combat.thrownWeapons.warningNoAmmoLeft", { weapon: weapon.name }));
        return false;
    }

    return true;
};
