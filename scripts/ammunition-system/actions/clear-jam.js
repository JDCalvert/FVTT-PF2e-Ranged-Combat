import { Weapon } from "../../types/pf2e-ranged-combat/weapon.js";
import { Updates } from "../../utils/updates.js";
import { getControlledActor, getEffectFromActor, getPreferredName, postInteractToChat } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { JAMMED_EFFECT_ID, CLEAR_JAM_IMG } from "../constants.js";
import { isWeaponJammed } from "../utils.js";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.clearJam." + key, data);

export async function clearJam() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    const weapon = await getWeapon(
        actor,
        isWeaponJammed,
        format("warningNoJammedWeapons", { actor: getPreferredName(actor) })
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
        updates.delete(jammedEffect);

        await postInteractToChat(
            weapon.actor,
            CLEAR_JAM_IMG,
            format("clearJamMessage", { actor: getPreferredName(weapon.actor), weapon: weapon.name }),
            "1",
        );
    }
}
