import { ItemSelectDialog } from "../utils/item-select-dialog.js";
import { getEffectFromActor, getFlag, getFlags, showWarning } from "../utils/utils.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, LOADED_EFFECT_ID } from "./constants.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem." + key)
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem." + key, data)

/**
 * Check if the weapon is fully loaded and, if it is, show a warning
 */
export function checkFullyLoaded(actor, weapon) {
    const weaponFullyLoaded = isFullyLoaded(actor, weapon);
    if (weaponFullyLoaded) {
        if (weapon.capacity) {
            showWarning(format("utils.warningFullyLoaded", { weapon: weapon.name }));
        } else {
            showWarning(format("utils.warningLoaded", { weapon: weapon.name }));
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

export async function getSelectedAmmunition(actor, weapon, action) {
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
                name: localize("actions.conjureBullet.conjuredRound"),
                img: conjuredRoundEffect.img,
                id: CONJURED_ROUND_ITEM_ID,
                sourceId: CONJURED_ROUND_ITEM_ID
            }
        );
    }

    if (ammunitions.length > 1) {
        return await ItemSelectDialog.getItem(
            localize("ammunitionSelect.title"),
            localize(`ammunitionSelect.action.${action}`),
            new Map([[localize("ammunitionSelect.header.loadedAmmunition"), ammunitions]])
        );
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
            updates.update(
                loadedEffect,
                {
                    "name": `${getFlag(loadedEffect, "name")} (${loadedChambers}/${loadedCapacity})`,
                    "flags.pf2e-ranged-combat.loadedChambers": loadedChambers,
                }
            );
            updates.floatyText(`${getFlag(loadedEffect, "name")} (${loadedChambers}/${loadedCapacity})`, false);
        } else {
            updates.update(loadedEffect, { "name": `${getFlag(loadedEffect, "name")} (0/${loadedCapacity})` });
            updates.delete(loadedEffect);
            clearLoadedChamber(actor, weapon, null, updates);
        }
    } else {
        updates.delete(loadedEffect);
    }
}

export function removeAmmunitionAdvancedCapacity(actor, weapon, ammunition, updates) {
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    const loadedFlags = getFlags(loadedEffect);

    loadedFlags.loadedChambers--;

    const loadedAmmunition = loadedFlags.ammunition.find(ammunitionType => ammunitionType.sourceId === ammunition.sourceId);
    loadedAmmunition.quantity--;
    if (loadedAmmunition.quantity === 0) {
        loadedFlags.ammunition.findSplice(ammunition => ammunition.id === loadedAmmunition.id);
        clearLoadedChamber(actor, weapon, loadedAmmunition, updates);
    }

    // If the weapon is still loaded, update the effect, otherwise remove it
    if (loadedFlags.ammunition.length) {
        updates.update(
            loadedEffect,
            {
                "flags.pf2e-ranged-combat": loadedFlags,
                "name": buildLoadedEffectName(loadedEffect)
            }
        );
        updates.floatyText(`${getFlag(loadedEffect, "originalName")} ${loadedAmmunition.name} (${loadedFlags.loadedChambers}/${loadedFlags.capacity})`, false);
    } else {
        updates.update(
            loadedEffect,
            {
                "name": `${getFlag(loadedEffect, "originalName")} ${loadedAmmunition.name} (0/${loadedFlags.capacity})`
            }
        );
        updates.delete(loadedEffect);
    }
}

export function clearLoadedChamber(actor, weapon, ammunition, updates) {
    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (chamberLoadedEffect) {
        if (ammunition) {
            const chamberAmmunition = getFlag(chamberLoadedEffect, "ammunition");
            if (chamberAmmunition.sourceId === ammunition.sourceId) {
                updates.delete(chamberLoadedEffect);
            }
        } else {
            updates.delete(chamberLoadedEffect);
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

    const capacity = getFlag(loadedEffect, "capacity");
    const originalName = getFlag(loadedEffect, "originalName");

    // We have exactly one type of ammunition, so the name is 
    if (ammunitions.length === 1) {
        const ammunition = ammunitions[0];
        return `${originalName} (${ammunition.name}) (${ammunition.quantity}/${capacity})`;
    } else {
        const ammunitionCount = ammunitions.map(ammunition => ammunition.quantity).reduce((current, next) => current + next);
        const ammunitionsDescription = ammunitions.map(ammunition => `${ammunition.name} x${ammunition.quantity}`).join(", ");
        return `${originalName} (${ammunitionsDescription}) (${ammunitionCount}/${capacity})`;
    }
}
