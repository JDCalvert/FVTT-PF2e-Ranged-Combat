import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eWeapon } from "../types/pf2e/weapon.js";
import { Updates, getEffectFromActor, getFlag, getFlags, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { characterWeaponTransform } from "../utils/weapon-utils.js";
import { performNextChamber } from "./actions/next-chamber.js";
import { performReloadMagazine } from "./actions/reload-magazine.js";
import { performReload } from "./actions/reload.js";
import { isWeaponLoaded, performUnload } from "./actions/unload.js";
import { CHAMBER_LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { getLoadedAmmunitions, isFullyLoaded } from "./utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.names." + key);

/**
 * @param {PF2eWeapon} pf2eWeapon 
 */
export function buildAuxiliaryActions(pf2eWeapon) {
    const actor = pf2eWeapon.actor;
    const weapon = characterWeaponTransform(pf2eWeapon);

    const tokens = actor?.getActiveTokens();
    const token = tokens?.length === 1 ? tokens[0] : { name: actor.name, actor: actor };

    const auxiliaryActions = [];

    // Reload
    if (canReload(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("reload"),
                "interact",
                pf2eWeapon.reload,
                pf2eWeapon.reload,
                2,
                async () => {
                    const updates = new Updates(actor);
                    await performReload(actor, token, weapon, updates);
                    updates.handleUpdates();
                }
            )
        );
    }

    // Reload Magazine
    if (canReloadMagazine(weapon)) {
        const numActions = calculateReloadMagazineActions(weapon);

        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("reloadMagazine"),
                "interact",
                numActions,
                numActions,
                2,
                async () => performReloadMagazine(actor, token, weapon)
            )
        );
    }

    // Next Chamber
    if (canSwitchChamber(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("nextChamber"),
                "interact",
                1,
                "1",
                1,
                async () => performNextChamber(actor, token, weapon)
            )
        );
    }

    // Unload, if the weapon can be unloaded
    if (isWeaponLoaded(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("unload"),
                "interact",
                1,
                "1",
                2,
                async () => performUnload(actor, token, weapon)
            )
        );
    }

    return auxiliaryActions;
}

/**
 * @param {PF2eWeapon} weapon 
 * @param {string} action 
 * @param {string} actionType 
 * @param {number} numActions 
 * @param {string} glyph
 * @param {number} hands
 * @param {() => void} callback 
 */
function buildAuxiliaryAction(
    weapon,
    action,
    actionType,
    numActions,
    glyph,
    hands,
    callback,
) {
    return {
        weapon: weapon,
        action: actionType,
        hands: hands,
        actions: numActions,
        carryType: null,

        actor: weapon.actor,
        label: action,
        glyph: glyph,
        execute: callback
    };
}

/**
 * @param {Weapon} weapon 
 * @returns boolean
 */
function canReload(weapon) {
    if (!weapon.requiresLoading) {
        return false;
    }

    if (isFullyLoaded(weapon)) {
        return false;
    }

    if (useAdvancedAmmunitionSystem(weapon.actor)) {
        if (weapon.isRepeating) {
            const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (!magazineLoadedEffect) {
                return false;
            }

            if (getFlag(magazineLoadedEffect, "remaining") < 1) {
                return false;
            }
        } else {
            if (!weapon.ammunition) {
                return false;
            }
        }
    }

    return true;
}

/**
 * @param {Weapon} weapon
 * @returns boolean
 */
function canReloadMagazine(weapon) {
    if (!weapon.isRepeating) {
        return false;
    }

    if (!useAdvancedAmmunitionSystem(weapon.actor)) {
        return false;
    }

    if (!weapon.ammunition) {
        return false;
    }

    if (weapon.ammunition.quantity < 1) {
        return false;
    }

    const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (magazineLoadedEffect) {
        const magazineLoadedFlags = getFlags(magazineLoadedEffect);
        if (magazineLoadedFlags.ammunitionSourceId != weapon.ammunition.sourceId) {
            return true;
        }

        if (magazineLoadedFlags.remaining >= weapon.ammunition.system.uses.value) {
            return false;
        }
    }

    return true;
}

/**
 * @param {Weapon} weapon 
 * @returns number
 */
function calculateReloadMagazineActions(weapon) {
    return !!getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id) ? 3 : 2;
}

/**
 * @param {Weapon} weapon 
 * @returns number
 */
function canSwitchChamber(weapon) {
    if (!useAdvancedAmmunitionSystem(weapon.actor)) {
        return false;
    }

    if (!weapon.isCapacity) {
        return false;
    }

    const loadedAmmunitions = getLoadedAmmunitions(weapon)
    if (loadedAmmunitions.length == 0) {
        return false;
    }

    const chamberLoadedEffect = getEffectFromActor(weapon.actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (!chamberLoadedEffect) {
        return true;
    }

    if (loadedAmmunitions.length == 1) {
        return false;
    }

    return true;
}
