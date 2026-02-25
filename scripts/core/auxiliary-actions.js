import { Weapon } from "../weapons/types.js";

export class AuxiliaryActionHookParams {
    /** @type {AuxiliaryAction[]} */
    auxiliaryActions;

    /** @type {ActorPF2e} */
    actor;

    /** @type {WeaponPF2e} */
    pf2eWeapon;

    /** @type {Weapon} */
    weapon;
}

/**
 * @param {WeaponPF2e} weapon
 * @param {string} action
 * @param {string} actionType
 * @param {number} numActions
 * @param {string} glyph
 * @param {number} hands
 * @param {() => void} callback
 *
 * @returns {AuxiliaryAction}
 */
export function buildAuxiliaryAction(
    weapon,
    action,
    actionType,
    numActions,
    glyph,
    hands,
    callback
) {
    return {
        actor: weapon.actor,
        weapon: weapon,
        action: actionType,
        hands: hands,
        actions: numActions,
        label: action,
        glyph: glyph,
        execute: callback
    };
}

