import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { HookManager } from "../utils/hook-manager.js";
import { getEffectFromActor, getFlag, preventFiringWithoutLoading, showWarning, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { CHAMBER_LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { getSelectedAmmunition, isFullyLoaded, isLoaded } from "./utils.js";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.check." + key, data);

export function initialiseFireWeaponCheck() {
    HookManager.registerCheck("weapon-attack", checkLoaded);
}

/**
 * @param {Weapon} weapon 
 */
async function checkLoaded({ weapon }) {
    if (useAdvancedAmmunitionSystem(weapon.actor)) {
        // For repeating weapons, check that a magazine is loaded
        if (weapon.isRepeating) {
            if (!checkLoadedMagazine(weapon)) {
                return false;
            }
        }

        // For reloadable weapons, check that the weapon is loaded
        if (weapon.requiresLoading) {
            if (!await checkLoadedRound(weapon)) {
                return false;
            }
        }

        // For non-repeating weapons that don't require loading, we need to have enough
        // ammunition in our selected stack to fire
        if (weapon.usesAmmunition && !weapon.isRepeating && !weapon.requiresLoading) {
            if (!checkAmmunition(weapon)) {
                return false;
            }
        }
    } else {
        // Check the weapon has ammunition to fire
        if (weapon.requiresAmmunition) {
            if (!checkAmmunition(weapon)) {
                return false;
            }
        }

        // If Prevent Firing Weapon if not Loaded is enabled, check the weapon is loaded
        if (preventFiringWithoutLoading(weapon.actor) && weapon.requiresLoading) {
            if (!await checkLoadedRound(weapon)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Check if the weapon has a magazine loaded with at least one shot remaining
 */
function checkLoadedMagazine(weapon) {
    const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);

    // Check the weapon has a magazine loaded
    if (!magazineLoadedEffect) {
        showWarning(format("magazineNotLoaded", { weapon: weapon.name }));
        return false;
    }

    // Check the magazine has at least one round remaining
    if (getFlag(magazineLoadedEffect, "remaining") < 1) {
        showWarning(format("magazineEmpty", { weapon: weapon.name }));
        return false;
    }

    return true;
}

/**
 * Check the weapon has a round loaded
 */
async function checkLoadedRound(weapon) {
    if (!isLoaded(weapon)) {
        showWarning(format("weaponNotLoaded", { weapon: weapon.name }));
        return false;
    }

    if (weapon.isCapacity) {
        if (!checkChamberLoaded(weapon)) {
            return false;
        }
    }

    if (weapon.isFiringBothBarrels && !isFullyLoaded(weapon)) {
        showWarning(format("bothBarrelsNotLoaded", { weapon: weapon.name }));
        return false;
    }

    if (useAdvancedAmmunitionSystem(weapon.actor) && weapon.isDoubleBarrel && !weapon.isFiringBothBarrels) {
        const selectedAmmunition = await getSelectedAmmunition(weapon, "fire");
        if (!selectedAmmunition) {
            return false;
        }

        weapon.selectedAmmunition = selectedAmmunition;
    }

    return true;
}

function checkChamberLoaded(weapon) {
    if (!getEffectFromActor(weapon.actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)) {
        showWarning(format("chamberNotLoaded", { weapon: weapon.name }));
        return false;
    }

    return true;
}

function checkAmmunition(weapon) {
    const ammunition = weapon.ammunition;
    if (!ammunition) {
        showWarning(format("noAmmunitionSelected", { weapon: weapon.name }));
        return false;
    } else if (ammunition.quantity < 1) {
        showWarning(format("noAmmunitionRemaining", { weapon: weapon.name }));
        return false;
    } else if (weapon.isFiringBothBarrels && ammunition.quantity < 2) {
        showWarning(format("bothBarrelsNotEnough", { weapon: weapon.name }));
        return false;
    }

    return true;
}
