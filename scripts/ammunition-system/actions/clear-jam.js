import { Weapon } from "../../types/pf2e-ranged-combat/weapon.js";
import { Updates } from "../../utils/updates.js";
import { getControlledActor, getEffectFromActor } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { JAMMED_EFFECT_ID } from "../constants.js";
import { isWeaponJammed } from "../utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.clearJam." + key);

export async function clearJam() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    const weapon = await getWeapon(
        actor,
        isWeaponJammed,
        localize("warningNoJammedWeapons")
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);
    await performClearJam(weapon, updates);
    updates.handleUpdates();
}

/**
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
export async function performClearJam(weapon, updates) {
    const jammedEffect = getEffectFromActor(weapon.actor, JAMMED_EFFECT_ID, weapon.id);
    if (jammedEffect) {
        updates.delete(weapon);
    }
}
