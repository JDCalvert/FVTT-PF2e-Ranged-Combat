import { WeaponAttackCheckParams } from "../hook-manager/types/weapon-attack-check.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { Util } from "../utils/utils.js";
import { findGroupStacks, useAdvancedThrownWeaponSystem } from "./utils.js";

export class ThrownWeaponCheck {
    static initialise() {
        HookManager.registerCheck("weapon-attack", checkThrownWeapon);
    }
}

/**
 * Prevent rolling an attack with a weapon if the stack size is 0, the weapon is not drawn, or the weapon is a
 * dropped version of another weapon (and that weapon still exists)
 * 
 * @param {WeaponAttackCheckParams} data
 */
async function checkThrownWeapon({ weapon }) {
    if (!useAdvancedThrownWeaponSystem(weapon.actor)) {
        return true;
    }

    // If the weapon isn't thrown, then we don't need to do anything
    const isThrownWeapon = weapon.isRanged && Array.from(weapon.traits).some(trait => trait.startsWith("thrown"));
    if (!isThrownWeapon) {
        return true;
    }

    // This functionality is only relevant for weapons with a linked physical weapon, so return true if there isn't one
    const pf2eWeapon = weapon.pf2eWeapon;
    if (!pf2eWeapon) {
        return true;
    }

    // Find a weapon in the target weapon's group which is equipped
    const groupStacks = findGroupStacks(pf2eWeapon);
    const equippedWeapons = groupStacks.filter(stack => stack.isEquipped);
    if (!equippedWeapons.length) {
        Util.warn(game.i18n.format("pf2e-ranged-combat.thrownWeapons.warningNotEquipped", { weapon: weapon.name }));
        return false;
    }

    if (!equippedWeapons.filter(stack => stack.quantity).length) {
        Util.warn(game.i18n.format("pf2e-ranged-combat.thrownWeapons.warningNoAmmoLeft", { weapon: weapon.name }));
        return false;
    }

    return true;
};
