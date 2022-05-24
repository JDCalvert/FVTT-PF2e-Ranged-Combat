import { getEffectFromActor, getFlag } from "../utils/utils.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, LOADED_EFFECT_ID } from "./constants.js";

/**
 * Check if the weapon is fully loaded, returning the warning message to display
 */
export function isFullyLoaded(actor, weapon) {
    let roundsLoaded = 0;

    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    if (loadedEffect) {
        if (weapon.capacity) {
            roundsLoaded += getFlag(loadedEffect, "loadedChambers");
        } else {
            roundsLoaded++;
        }
    }

    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        roundsLoaded++;
    }

    if (weapon.capacity) {
        return roundsLoaded >= weapon.capacity;
    } else {
        return roundsLoaded;
    }
}

/**
 * Remove a piece of ammunition from the weapon.
 */
export function removeAmmunition(actor, weapon, updates) {
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect) {
        return;
    }

    if (weapon.capacity) {
        const loadedChambers = getFlag(loadedEffect, "loadedChambers") - 1;
        if (loadedChambers > 0) {
            updates.update(async () =>
                await loadedEffect.update({
                    "name": `${getFlag(loadedEffect, "name")} (${loadedChambers}/${loadedCapacity})`,
                    "flags.pf2e-ranged-combat.loadedChambers": loadedChambers,
                })
            );
            updates.floatyText(`${getFlag(loadedEffect, "name")} (${loadedChambers}/${loadedCapacity})`, false);
        } else {
            updates.update(() => loadedEffect.update({ "name": `${getFlag(loadedEffect, "name")} (0/${loadedCapacity})` }));
            updates.remove(loadedEffect);
            clearLoadedChamber(actor, weapon, updates);
        }
    } else {
        updates.remove(loadedEffect);
        clearLoadedChamber(actor, weapon, updates);
    }
}

export function clearLoadedChamber(actor, weapon, updates) {
    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (chamberLoadedEffect) {
        updates.remove(chamberLoadedEffect);
    }
}
