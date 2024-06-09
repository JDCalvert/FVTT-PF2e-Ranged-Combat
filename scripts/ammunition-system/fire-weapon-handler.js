import { postToChatConfig } from "../config.js";
import { Ammunition } from "../types/pf2e-ranged-combat/ammunition.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eConsumable } from "../types/pf2e/consumable.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { findItemOnActor, getEffectFromActor, getFlag, postMessage, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, CONJURE_BULLET_IMG, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { clearLoadedChamber, removeAmmunition, removeAmmunitionAdvancedCapacity, updateAmmunitionQuantity } from "./utils.js";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem." + key, data);

export function initialiseFireWeaponHandler() {
    HookManager.register("weapon-attack", fireWeapon);
}

/**
 * Handle firing a weapon, including updating/removing loaded effects and consuming ammunition.
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @returns 
 */
function fireWeapon({ updates, weapon }) {
    // If the weapon doesn't use ammunition, we don't need to do anything else
    if (!weapon.usesAmmunition) {
        return;
    }

    // If the actor has a flag to say they shouldn't consume ammo, don't do anything
    if (weapon.actor.getRollOptions().includes("skip-use-ammunition")) {
        return;
    }

    if (useAdvancedAmmunitionSystem(weapon.actor)) {
        if (weapon.isRepeating) {
            fireWeaponRepeating(weapon, updates);
        } else if (weapon.requiresLoading) {
            fireWeaponReloadable(weapon, updates);
        } else {
            fireWeaponAmmunition(weapon, updates);
        }
    } else {
        fireWeaponSimple(weapon, updates);
    }
}

/**
 * Handle firing a weapon with the advanced ammunition system disabled.
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function fireWeaponSimple(weapon, updates) {
    if (weapon.isCapacity) {
        clearLoadedChamber(weapon, null, updates);
    }

    let ammunitionToFire = 1;
    if (weapon.isFiringBothBarrels) {
        ammunitionToFire++;
    }

    const consumedConjuredRound = consumeConjuredRound(weapon, updates);
    if (consumedConjuredRound) {
        ammunitionToFire--;
    }

    if (ammunitionToFire) {
        fireWeaponAmmunition(weapon, updates, ammunitionToFire);
        removeAmmunition(weapon, updates, ammunitionToFire);
    }
}

/**
 * Handle firing a repeating weapon with the advanced ammunition system enabled.
 * 
 * @param {Weapon} weapon
 * @param {Updates} updates
 */
function fireWeaponRepeating(weapon, updates) {
    const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
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
    removeAmmunition(weapon, updates);

    // Post in chat saying some ammunition was used
    const ammunitionItemId = getFlag(magazineLoadedEffect, "ammunitionItemId");
    const ammunitionSourceId = getFlag(magazineLoadedEffect, "ammunitionSourceId");
    const ammunition = findItemOnActor(weapon.actor, ammunitionItemId, ammunitionSourceId);

    postAmmunition(
        ammunition,
        () => postMessage(
            weapon.actor,
            getFlag(magazineLoadedEffect, "ammunitionImg"),
            game.i18n.format(
                "pf2e-ranged-combat.ammunitionSystem.fireWeaponRepeating",
                {
                    actor: weapon.actor.name,
                    ammunition: getFlag(magazineLoadedEffect, "ammunitionName"),
                    remaining: magazineRemaining,
                    capacity: magazineCapacity
                }
            )
        )
    );

    if (ammunition) {
        HookManager.call("ammunition-fire", { weapon, ammunition, updates });
    }
}

/**
 * Handle firing a reloadable weapon.
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function fireWeaponReloadable(weapon, updates) {
    if (weapon.isCapacity) {
        fireWeaponCapacity(weapon, updates);
    } else if (weapon.isDoubleBarrel) {
        fireWeaponDoubleBarrel(weapon, updates);
    } else {
        const firedConjuredRound = consumeConjuredRound(weapon, updates);
        if (firedConjuredRound) {
            return;
        }

        const loadedEffect = getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);
        updates.delete(loadedEffect);
        handleFireAmmunition(weapon, getFlag(loadedEffect, "ammunition"), updates);
    }
}

/**
 * Handle firing a capacity weapon
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function fireWeaponCapacity(weapon, updates) {
    const chamberLoadedEffect = getEffectFromActor(weapon.actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    updates.delete(chamberLoadedEffect);

    const chamberAmmunition = getFlag(chamberLoadedEffect, "ammunition");

    consumeAmmunition(weapon, chamberAmmunition, updates);
}

/**
 * Handle firing a double-barrel weapon.
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function fireWeaponDoubleBarrel(weapon, updates) {
    if (weapon.isFiringBothBarrels) {
        // Fire the conjured round, if there is one
        consumeConjuredRound(weapon, updates);

        // Fire all the loaded ammunition
        const loadedEffect = getEffectFromActor(weapon.actor, LOADED_EFFECT_ID, weapon.id);
        const loadedAmmunitions = getFlag(loadedEffect, "ammunition");
        for (const loadedAmmunition of loadedAmmunitions) {
            handleFireAmmunition(weapon, loadedAmmunition, updates);
        }

        updates.delete(loadedEffect);
    } else {
        consumeAmmunition(weapon, weapon.selectedAmmunition, updates);
    }
}

/**
 * Handle consuming ammunition after firing the weapon.
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 * @param {number} ammunitionToFire 
 */
function fireWeaponAmmunition(weapon, updates, ammunitionToFire = 1) {
    const ammunition = weapon.ammunition;
    if (!ammunition) {
        return;
    }

    updateAmmunitionQuantity(updates, ammunition, -ammunitionToFire);

    postAmmunition(
        ammunition,
        () => postMessage(weapon.actor, ammunition.img, format("fireWeapon", { actor: weapon.actor.name, ammunition: ammunition.name }))
    );

    HookManager.call("ammunition-fire", { weapon, ammunition, updates });
}

/**
 * Consume the given ammunition from a capacity weapon.
 * 
 * @param {Weapon} weapon 
 * @param {PF2eConsumable} ammunition
 * @param {Updates} updates
 */
function consumeAmmunition(weapon, ammunition, updates) {
    if (ammunition.sourceId === CONJURED_ROUND_ITEM_ID) {
        consumeConjuredRound(weapon, updates);
    } else {
        removeAmmunitionAdvancedCapacity(weapon.actor, weapon, ammunition, updates);
        handleFireAmmunition(weapon, ammunition, updates);
    }
}

function consumeConjuredRound(weapon, updates) {
    const conjuredRoundEffect = getEffectFromActor(weapon.actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        updates.delete(conjuredRoundEffect);
        postAmmunition(
            null,
            () => postMessage(
                weapon.actor,
                CONJURE_BULLET_IMG,
                format(
                    "fireConjuredRound",
                    {
                        actor: weapon.actor.name
                    }
                )
            )
        );
    }
    return !!conjuredRoundEffect;
}

/**
 * Post to chat that some ammunition has been fired.
 * 
 * @param {Weapon} weapon 
 * @param {Ammunition} ammunition 
 * @param {Updates} updates
 */
function handleFireAmmunition(weapon, ammunition, updates) {
    const pf2eAmmunition = findItemOnActor(weapon.actor, ammunition.id, ammunition.sourceId);

    postAmmunition(
        pf2eAmmunition,
        () => postMessage(weapon.actor, ammunition.img, format("fireWeapon", { actor: weapon.actor.name, ammunition: ammunition.name }))
    );

    if (pf2eAmmunition) {
        HookManager.call(
            "ammunition-fire",
            {
                weapon,
                ammunition: pf2eAmmunition,
                updates
            }
        );
    }
}

/**
 * Determine whether we should post the full ammunition or a summary.
 * 
 * @param {Weapon} weapon The weapon the ammunition was fired from
 * @param {PF2eConsumable | null} ammunition The ammunition being fired
 * @param {() => void} simpleMessageFunction Function to post a simple message
 * 
 * @returns {boolean} true if we should post the full ammunition
 */
function postAmmunition(ammunition, simpleMessageFunction) {
    const settingValue = game.settings.get("pf2e-ranged-combat", "postAmmunitionToChat");

    if (ammunition && ammunition.level > 0 && settingValue == postToChatConfig.full) {
        ammunition.toMessage();
    } else if (settingValue) {
        simpleMessageFunction();
    }
}
