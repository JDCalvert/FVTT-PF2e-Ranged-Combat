import { CROSSBOW_ACE_EFFECT_ID, CROSSBOW_ACE_FEAT_ID, CROSSBOW_CRACK_SHOT_EFFECT_ID, CROSSBOW_CRACK_SHOT_FEAT_ID, getEffectFromActor, getFlag, getItem, getItemFromActor, setEffectTarget, showWarning, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, LOADED_EFFECT_ID } from "./constants.js";

/**
 * Check if the weapon is fully loaded and, if it is, show a warning
 */
export function checkFullyLoaded(actor, weapon) {
    const weaponFullyLoaded = isFullyLoaded(actor, weapon);
    if (weaponFullyLoaded) {
        if (weapon.capacity) {
            showWarning(`${weapon.name} is already fully loaded.`);
        } else {
            showWarning(`${weapon.name} is already loaded.`);
        }
    }
    return weaponFullyLoaded;
}

export function isLoaded(actor, weapon) {
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);

    return !!loadedEffect || !!conjuredRoundEffect;
}

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
        return !!roundsLoaded;
    }
}

export function getSelectedAmmunition(actor, weapon) {
    const ammunitions = [];

    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    if (loadedEffect) {
        const loadedAmmunitions = getFlag(loadedEffect, "ammunition");
        ammunitions.push(...loadedAmmunitions);
    }

    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        ammunitions.push(
            {
                name: "Conjured Round",
                img: conjuredRoundEffect.img,
                id: "conjuredRound",
                sourceId: "conjuredRound"
            }
        )
    }

    if (ammunitions > 1) {
        return await ItemSelectDialog.getItem("Ammunition Select", "Select which ammunition to switch to.", ammunitions);
    } else {
        return ammunitions[0];
    }
}

/**
 * Remove a piece of ammunition from the weapon.
 */
export function removeAmmunition(actor, weapon, updates, ammunitionToRemove = 1) {
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect) {
        return;
    }

    if (weapon.capacity) {
        const loadedChambers = getFlag(loadedEffect, "loadedChambers") - ammunitionToRemove;
        const loadedCapacity = getFlag(loadedEffect, "capacity");
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
    }
}

export function clearLoadedChamber(actor, weapon, updates) {
    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (chamberLoadedEffect) {
        updates.remove(chamberLoadedEffect);
    }
}

export async function triggerCrossbowReloadEffects(actor, token, weapon, updates) {
    const crossbowFeats = [
        { featId: CROSSBOW_ACE_FEAT_ID, effectId: CROSSBOW_ACE_EFFECT_ID },
        { featId: CROSSBOW_CRACK_SHOT_FEAT_ID, effectId: CROSSBOW_CRACK_SHOT_EFFECT_ID }
    ];

    // Handle crossbow effects that trigger on reload
    if (weapon.isCrossbow && weapon.isEquipped) {
        for (const crossbowFeat of crossbowFeats) {
            const featId = crossbowFeat.featId;
            const effectId = crossbowFeat.effectId;

            if (getItemFromActor(actor, featId)) {
                // Remove any existing effects
                const existing = getEffectFromActor(actor, effectId, weapon.id);
                if (existing) {
                    updates.remove(existing);
                }

                // Add the new effect
                const effect = await getItem(effectId);
                setEffectTarget(effect, weapon);
                effect.flags["pf2e-ranged-combat"].fired = false;
                if (!token.inCombat) {
                    effect.data.duration.value = 1;
                }

                updates.add(effect);
            }
        }
    }
}

/**
 * For weapons with a capacity of more than one, build the 
 */
export function buildLoadedEffectName(loadedEffect) {
    const ammunitions = getFlag(loadedEffect, "ammunition");

    // We're not tracking specific ammunition, either because it's for a repeating weapon or
    // we're using the simple ammunition system
    if (!ammunitions || !ammunitions.length) {
        return loadedEffect.name;
    }

    const loadedChambers = getFlag(loadedChambers, "loadedChambers");
    const capacity = getFlag(loadedEffect, "capacity");
    const originalName = getFlag(loadedEffect, "originalName");

    // We have exactly one type of ammunition, so the name is 
    if (ammunitions.length === 1) {
        const ammunition = ammunitions[0];
        return `${originalName} (${ammunition.name}) (${ammunition.quantity}/${capacity})`;
    } else {
        const ammunitionsDescription = ammunitions.map(ammunition => `${ammunition.name} x${ammunition.quantity}`).join(", ");
        return `${originalName} (${ammunitionsDescription}) (${loadedChambers}/${capacity})`;
    }
}
