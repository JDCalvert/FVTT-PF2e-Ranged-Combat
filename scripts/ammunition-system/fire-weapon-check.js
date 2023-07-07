import { getEffectFromActor, getFlag, showWarning, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { isFiringBothBarrels } from "./actions/fire-both-barrels.js";
import { CHAMBER_LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { getSelectedAmmunition, isFullyLoaded, isLoaded } from "./utils.js";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.check." + key, data);

export async function checkLoaded(actor, weapon) {
    if (useAdvancedAmmunitionSystem(actor)) {
        // For repeating weapons, check that a magazine is loaded
        if (weapon.isRepeating) {
            if (!checkLoadedMagazine(actor, weapon)) {
                return false;
            }
        }

        // For reloadable weapons, check that the weapon is loaded
        if (weapon.requiresLoading) {
            if (!await checkLoadedRound(actor, weapon)) {
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
        if (weapon.requiresAmmunition) {
            if (!checkAmmunition(actor, weapon)) {
                return false;
            }
        }

        // If Prevent Firing Weapon if not Loaded is enabled, check the weapon is loaded
        if (game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded") && weapon.requiresLoading) {
            if (!await checkLoadedRound(actor, weapon)) {
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
async function checkLoadedRound(actor, weapon) {
    if (!isLoaded(actor, weapon)) {
        showWarning(format("weaponNotLoaded", { weapon: weapon.name }));
        return false;
    }

    if (weapon.isCapacity) {
        if (!checkChamberLoaded(actor, weapon)) {
            return false;
        }
    }

    if (isFiringBothBarrels(actor, weapon) && !isFullyLoaded(actor, weapon)) {
        showWarning(format("bothBarrelsNotLoaded", { weapon: weapon.name }));
        return false;
    }

    if (useAdvancedAmmunitionSystem(actor) && weapon.isDoubleBarrel && !isFiringBothBarrels(actor, weapon)) {
        const selectedAmmunition = await getSelectedAmmunition(actor, weapon, "fire");
        if (!selectedAmmunition) {
            return false;
        }

        weapon.selectedAmmunition = selectedAmmunition;
    }

    return true;
}

function checkChamberLoaded(actor, weapon) {
    if (!getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)) {
        showWarning(format("chamberNotLoaded", { weapon: weapon.name }));
        return false;
    }

    return true;
}

function checkAmmunition(actor, weapon) {
    const ammunition = weapon.ammunition;
    if (!ammunition) {
        showWarning(format("noAmmunitionSelected", { weapon: weapon.name }));
        return false;
    } else if (ammunition.quantity < 1) {
        showWarning(format("noAmmunitionRemaining", { weapon: weapon.name }));
        return false;
    } else if (isFiringBothBarrels(actor, weapon) && ammunition.quantity < 2) {
        showWarning(format("bothBarrelsNotEnough", { weapon: weapon.name }));
        return false;
    }

    return true;
}
