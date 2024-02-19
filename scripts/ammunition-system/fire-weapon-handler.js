import { Ammunition } from "../types/pf2e-ranged-combat/ammunition.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eConsumable } from "../types/pf2e/consumable.js";
import { Updates, findItemOnActor, getEffectFromActor, getFlag, postInChat, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { isFiringBothBarrels } from "./actions/fire-both-barrels.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, CONJURE_BULLET_IMG, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { clearLoadedChamber, removeAmmunition, removeAmmunitionAdvancedCapacity, updateAmmunitionQuantity } from "./utils.js";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem." + key, data);

/**
 * Handle firing a weapon, including updating/removing loaded effects and consuming ammunition.
 * 
 * @param {PF2eActor} actor
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @returns 
 */
export function fireWeapon(actor, weapon, updates) {
    // If the weapon doesn't use ammunition, we don't need to do anything else
    if (!weapon.usesAmmunition) {
        return;
    }

    // If the actor has a flag to say they shouldn't consume ammo, don't do anything
    if (actor.getRollOptions().includes("skip-use-ammunition")) {
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

/**
 * Handle firing a weapon with the advanced ammunition system disabled.
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
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

/**
 * Handle firing a repeating weapon with the advanced ammunition system enabled.
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
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

    if (shouldPostFullAmmunition(ammunition)) {
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

/**
 * Handle firing a reloadable weapon.
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
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
        postAmmunition(actor, getFlag(loadedEffect, "ammunition"));
    }
}

/**
 * Handle firing a capacity weapon
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function fireWeaponCapacity(actor, weapon, updates) {
    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    updates.delete(chamberLoadedEffect);

    const chamberAmmunition = getFlag(chamberLoadedEffect, "ammunition");

    consumeAmmunition(actor, weapon, chamberAmmunition, updates);
}

/**
 * Handle firing a double-barrel weapon.
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function fireWeaponDoubleBarrel(actor, weapon, updates) {
    if (isFiringBothBarrels(actor, weapon)) {
        // Fire the conjured round, if there is one
        consumeConjuredRound(actor, weapon, updates);

        // Fire all the loaded ammunition
        const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
        const loadedAmmunitions = getFlag(loadedEffect, "ammunition");
        for (const loadedAmmunition of loadedAmmunitions) {
            postAmmunition(actor, loadedAmmunition);
        }

        updates.delete(loadedEffect);
    } else {
        consumeAmmunition(actor, weapon, weapon.selectedAmmunition, updates);
    }
}

/**
 * Handle consuming ammunition after firing the weapon.
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @param {number} ammunitionToFire 
 */
function fireWeaponAmmunition(actor, weapon, updates, ammunitionToFire = 1) {
    const ammunition = weapon.ammunition;
    if (!ammunition) {
        return;
    }

    updateAmmunitionQuantity(updates, ammunition, -ammunitionToFire);

    if (shouldPostFullAmmunition(ammunition)) {
        ammunition.toMessage();
    } else {
        postInChat(actor, ammunition.img, format("fireWeapon", { actor: actor.name, ammunition: ammunition.name }));
    }
}

/**
 * Consume the given ammunition from a capacity weapon.
 * 
 * @param {PF2eActor} actor 
 * @param {Weapon} weapon 
 * @param {PF2eConsumable} ammunition
 * @param {Updates} updates
 */
function consumeAmmunition(actor, weapon, ammunition, updates) {
    if (ammunition.sourceId === CONJURED_ROUND_ITEM_ID) {
        consumeConjuredRound(actor, weapon, updates);
    } else {
        removeAmmunitionAdvancedCapacity(actor, weapon, ammunition, updates);
        postAmmunition(actor, ammunition);
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

/**
 * Post to chat that some ammunition has been fired.
 * 
 * @param {PF2eActor} actor 
 * @param {Ammunition} ammunition 
 */
function postAmmunition(actor, ammunition) {
    const ammunitionItem = findItemOnActor(actor, ammunition.id, ammunition.sourceId);
    if (shouldPostFullAmmunition(ammunitionItem)) {
        ammunitionItem.toMessage();
    } else {
        postInChat(actor, ammunition.img, format("fireWeapon", { actor: actor.name, ammunition: ammunition.name }));
    }
}

/**
 * Determine whether we should post the full ammunition or a summary.
 * 
 * @param {PF2eConsumable} ammunitionItem The ammunition being fired
 * @returns {boolean} true if we should post the full ammunition
 */
function shouldPostFullAmmunition(ammunitionItem) {
    return ammunitionItem && ammunitionItem.level > 0 && game.settings.get("pf2e-ranged-combat", "postFullAmmunition");
}
