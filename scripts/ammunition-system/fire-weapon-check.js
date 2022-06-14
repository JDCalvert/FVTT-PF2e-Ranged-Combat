import { getEffectFromActor, getFlag, showWarning, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { isFiringBothBarrels } from "./actions/fire-both-barrels.js";
import { CHAMBER_LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { isFullyLoaded, isLoaded } from "./utils.js";

export function checkLoaded(actor, weapon) {
    if (useAdvancedAmmunitionSystem(actor)) {
        // For repeating weapons, check that a magazine is loaded
        if (weapon.isRepeating) {
            if (!checkLoadedMagazine(actor, weapon)) {
                return false;
            }
        }

        // For reloadable weapons, check that the weapon is loaded
        if (weapon.requiresLoading) {
            if (!checkLoadedRound(actor, weapon)) {
                return false;
            }
        }

        // For non-repeating weapons that don't require loading, we need to have enough
        // ammunition in our selected stack to fire
        if (weapon.usesAmmunition && !weapon.isRepeating && !weapon.requiresLoading) {
            if (!checkAmmunition(actor, weapon)) {
                return false;
            }
        }
    } else {
        // Check the weapon has ammunition to fire
        if (weapon.usesAmmunition) {
            if (!checkAmmunition(actor, weapon)) {
                return false;
            }
        }

        // If Prevent Firing Weapon if not Loaded is enabled, check the weapon is loaded
        if (game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded") && weapon.requiresLoading) {
            if (!checkLoadedRound(actor, weapon)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Check if the weapon has a magazine loaded with at least one shot remaining
 */
function checkLoadedMagazine(actor, weapon) {
    const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);

    // Check the weapon has a magazine loaded
    if (!magazineLoadedEffect) {
        showWarning(`${weapon.name} has no magazine loaded!`);
        return false;
    }

    // Check the magazine has at least one round remaining
    if (getFlag(magazineLoadedEffect, "remaining") < 1) {
        showWarning(`${weapon.name}'s magazine is empty!`);
        return false;
    }

    return true;
}

/**
 * Check the weapon has a round loaded
 */
function checkLoadedRound(actor, weapon) {
    if (!isLoaded(actor, weapon)) {
        showWarning(`${weapon.name} is not loaded!`);
        return false;
    }

    if (weapon.isCapacity) {
        if (!checkChamberLoaded(actor, weapon)) {
            return false;
        }
    }

    if (isFiringBothBarrels(actor, weapon) && !isFullyLoaded(actor, weapon)) {
        showWarning(`${weapon.name} does not have both barrels loaded!`);
        return false;
    }

    return true;
}

function checkChamberLoaded(actor, weapon) {
    if (!getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)) {
        showWarning(`${weapon.name}'s current chamber is not loaded!`);
        return false;
    }

    return true;
}

function checkAmmunition(actor, weapon) {
    const ammunition = weapon.ammunition;
    if (!ammunition) {
        showWarning(`${weapon.name} has no ammunition selected!`);
        return false;
    } else if (ammunition.quantity < 1) {
        showWarning(`${weapon.name} has no ammunition remaining!`);
        return false;
    } else if (isFiringBothBarrels(actor, weapon) && ammunition.quantity < 2) {
        showWarning(`${weapon.name} does not have enough ammunition to fire both barrels!`);
        return false;
    }

    return true;
}
