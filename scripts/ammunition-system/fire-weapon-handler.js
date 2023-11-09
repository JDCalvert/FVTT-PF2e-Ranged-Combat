import { findItemOnActor, getEffectFromActor, getFlag, postInChat, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { isFiringBothBarrels } from "./actions/fire-both-barrels.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, CONJURE_BULLET_IMG, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { clearLoadedChamber, removeAmmunition, removeAmmunitionAdvancedCapacity, updateAmmunitionQuantity } from "./utils.js";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem." + key, data);

export function fireWeapon(actor, weapon, updates) {
    // If the weapon doesn't use ammunition, we don't need to do anything else
    if (!weapon.usesAmmunition) {
        return;
    }

    if (useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            fireWeaponRepeating(actor, weapon, updates);
        } else if (weapon.requiresLoading) {
            fireWeaponReloadable(actor, weapon, updates);
        } else {
            fireWeaponAmmunition(actor, weapon, updates);
        }
    } else {
        fireWeaponSimple(actor, weapon, updates);
    }
}

export function fireWeaponSimple(actor, weapon, updates) {
    if (weapon.isCapacity) {
        clearLoadedChamber(actor, weapon, null, updates);
    }

    let ammunitionToFire = 1;
    if (isFiringBothBarrels(actor, weapon)) {
        ammunitionToFire++;
    }

    const consumedConjuredRound = consumeConjuredRound(actor, weapon, updates);
    if (consumedConjuredRound) {
        ammunitionToFire--;
    }

    if (ammunitionToFire) {
        fireWeaponAmmunition(actor, weapon, updates, ammunitionToFire);
        removeAmmunition(actor, weapon, updates, ammunitionToFire);
    }
}

function fireWeaponRepeating(actor, weapon, updates) {
    const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    const magazineCapacity = getFlag(magazineLoadedEffect, "capacity");
    const magazineRemaining = getFlag(magazineLoadedEffect, "remaining") - 1;

    const magazineLoadedEffectName = getFlag(magazineLoadedEffect, "name");
    updates.update(
        magazineLoadedEffect,
        {
            "name": `${magazineLoadedEffectName} (${magazineRemaining}/${magazineCapacity})`,
            "flags.pf2e-ranged-combat.remaining": magazineRemaining
        }
    );
    updates.floatyText(`${getFlag(magazineLoadedEffect, "ammunitionName")} ${magazineRemaining}/${magazineCapacity}`, false);
    removeAmmunition(actor, weapon, updates);

    // Post in chat saying some ammunition was used
    const ammunitionItemId = getFlag(magazineLoadedEffect, "ammunitionItemId");
    const ammunitionSourceId = getFlag(magazineLoadedEffect, "ammunitionSourceId");
    const ammunition = findItemOnActor(actor, ammunitionItemId, ammunitionSourceId);

    if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition") && ammunition) {
        ammunition.toMessage();
    } else {
        postInChat(
            actor,
            getFlag(magazineLoadedEffect, "ammunitionImg"),
            game.i18n.format(
                "pf2e-ranged-combat.ammunitionSystem.fireWeaponRepeating",
                {
                    actor: actor.name,
                    ammunition: getFlag(magazineLoadedEffect, "ammunitionName"),
                    remaining: magazineRemaining,
                    capacity: magazineCapacity
                }
            )
        );
    }
}

function fireWeaponReloadable(actor, weapon, updates) {
    if (weapon.isCapacity) {
        fireWeaponCapacity(actor, weapon, updates);
    } else if (weapon.isDoubleBarrel) {
        fireWeaponDoubleBarrel(actor, weapon, updates);
    } else {
        const firedConjuredRound = consumeConjuredRound(actor, weapon, updates);
        if (firedConjuredRound) {
            return;
        }

        const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
        updates.delete(loadedEffect);
        postAmmunitionAndApplyEffect(actor, weapon, getFlag(loadedEffect, "ammunition"), updates);
    }
}

function fireWeaponCapacity(actor, weapon, updates) {
    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    updates.delete(chamberLoadedEffect);

    const chamberAmmunition = getFlag(chamberLoadedEffect, "ammunition");

    consumeAmmunition(actor, weapon, chamberAmmunition, updates);
}

function fireWeaponDoubleBarrel(actor, weapon, updates) {
    if (isFiringBothBarrels(actor, weapon)) {
        // Fire the conjured round, if there is one
        consumeConjuredRound(actor, weapon, updates);

        // Fire all the loaded ammunition
        const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
        const loadedAmmunitions = getFlag(loadedEffect, "ammunition");
        for (const loadedAmmunition of loadedAmmunitions) {
            postAmmunitionAndApplyEffect(actor, weapon, loadedAmmunition, updates);
        }

        updates.delete(loadedEffect);
    } else {
        consumeAmmunition(actor, weapon, weapon.selectedAmmunition, updates);
    }
}

function fireWeaponAmmunition(actor, weapon, updates, ammunitionToFire = 1) {
    const ammunition = weapon.ammunition;
    if (!ammunition) {
        return;
    }

    updateAmmunitionQuantity(updates, ammunition, -ammunitionToFire)

    if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition")) {
        ammunition.toMessage();
    } else {
        postInChat(actor, ammunition.img, format("fireWeapon", { actor: actor.name, ammunition: ammunition.name }));
    }
}

/**
 * Consume the given ammunition from a capacity weapon
 */
function consumeAmmunition(actor, weapon, ammunition, updates) {
    if (ammunition.sourceId === CONJURED_ROUND_ITEM_ID) {
        consumeConjuredRound(actor, weapon, updates);
    } else {
        removeAmmunitionAdvancedCapacity(actor, weapon, ammunition, updates);
        postAmmunitionAndApplyEffect(actor, weapon, ammunition, updates);
    }
}

function consumeConjuredRound(actor, weapon, updates) {
    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        updates.delete(conjuredRoundEffect);
        postInChat(actor, CONJURE_BULLET_IMG, format("fireConjuredRound", { actor: actor.name }));
    }
    return !!conjuredRoundEffect;
}

function postAmmunitionAndApplyEffect(actor, weapon, ammunition, updates) {
    const ammunitionItem = findItemOnActor(actor, ammunition.id, ammunition.sourceId);
    if (ammunitionItem && ammunitionItem.level > 0 && game.settings.get("pf2e-ranged-combat", "postFullAmmunition")) {
        ammunitionItem.toMessage();
    } else {
        postInChat(actor, ammunition.img, format("fireWeapon", { actor: actor.name, ammunition: ammunition.name }));
    }
}
