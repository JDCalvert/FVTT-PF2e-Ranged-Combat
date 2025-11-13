import { buildAuxiliaryAction } from "../advanced-weapon-system/util.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getEffectFromActor, getFlag, getFlags, getItemFromActor, render, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { performConjureBullet } from "./actions/conjure-bullet.js";
import { performNextChamber } from "./actions/next-chamber.js";
import { performReloadMagazine } from "./actions/reload-magazine.js";
import { performReload } from "./actions/reload.js";
import { isWeaponLoaded, performUnload } from "./actions/unload.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURE_BULLET_ACTION_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { getLoadedAmmunitions, isFullyLoaded, isWeaponJammed } from "./utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.names." + key);

export function initialiseAuxiliaryActions() {
    HookManager.register(
        "auxiliary-actions",
        args => {
            const { auxiliaryActions, pf2eWeapon, weapon, actor, token } = args;

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

            // Conjure Bullet
            if (canConjureBullet(weapon)) {
                auxiliaryActions.push(
                    buildAuxiliaryAction(
                        pf2eWeapon,
                        game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.conjureBullet.chatActionName"),
                        "interact",
                        1,
                        "1",
                        1,
                        async () => performConjureBullet(actor, token, weapon)
                    )
                );
            }
        }
    );
}

/**
 * @param {Weapon} weapon 
 * @returns boolean
 */
function canReload(weapon) {
    if (!weapon.requiresLoading) {
        return false;
    }

    if (isWeaponJammed(weapon)) {
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

    if (isWeaponJammed(weapon)) {
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

    const loadedAmmunitions = getLoadedAmmunitions(weapon);
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

/**
 * @param {Weapon} weapon 
 * @returns 
 */
function canConjureBullet(weapon) {
    const conjureBulletAction = getItemFromActor(weapon.actor, CONJURE_BULLET_ACTION_ID);
    if (!conjureBulletAction) {
        return false;
    }

    if (!canReload(weapon)) {
        return false;
    }

    const conjuredRoundEffect = getEffectFromActor(weapon.actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        return false;
    }

    return true;
}
