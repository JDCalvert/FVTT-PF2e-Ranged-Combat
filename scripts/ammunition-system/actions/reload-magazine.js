import { getControlledActorAndToken, getEffectFromActor, getFlag, getItem, postInChat, setEffectTarget, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { MAGAZINE_LOADED_EFFECT_ID, RELOAD_MAGAZINE_IMG } from "../constants.js";
import { triggerCrossbowReloadEffects } from "../utils.js";
import { unloadMagazine } from "./unload.js";

/**
 * Replace the magazine in a repeating weapon.
 * - If no new magazine is selected, only remove the current magazine.
 * - If no new magazine is selected and there is no current magazine, show an error.
 * - If a new magazine is selected and it is different to, or has different remaining ammunition to, the current magazine:
 *     - Remove the existing magazine, if there is one (one action)
 *     - Load the new magazine (two actions)
 */
export async function reloadMagazine() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (!useAdvancedAmmunitionSystem(actor)) {
        if (actor.type === "character") {
            ui.notifications.warn("PF2e Ranged Combat - Magazine Reload can only be used if the Advanced Ammunition System is enabled.");
            return;
        } else if (actor.type === "npc") {
            ui.notifications.warn("PF2e Ranged Combat - Magazine Reload is currently not supported for NPCs.");
            return;
        }
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.isRepeating,
        "You have no repeating weapons.",
        weapon => !getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id)
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    // If we have no ammunition selected, or we have none left in the stack, we can't reload
    const ammo = weapon.ammunition;
    if (!ammo) {
        ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
        return;
    } else if (ammo.quantity < 1) {
        ui.notifications.warn(`You don't have enough ammunition to reload ${weapon.name}.`);
        return;
    }

    let numActions = 0;

    // Find if the weapon is already loaded with a magazine. If it is, and there's some ammo left in it,
    // we'll put it back in our inventory
    const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (magazineLoadedEffect) {
        const magazineRemaining = getFlag(magazineLoadedEffect, "remaining");
        const magazineCapacity = getFlag(magazineLoadedEffect, "capacity");

        const magazineSourceId = getFlag(magazineLoadedEffect, "ammunitionSourceId");
        const selectedAmmunitionSourceId = ammo.sourceId;

        if (magazineRemaining === magazineCapacity && magazineSourceId === selectedAmmunitionSourceId) {
            // The current magazine is full, and the selected ammunition is the same
            ui.notifications.warn(`${weapon.name} is already loaded with a full magazine.`);
            return;
        } else if (magazineRemaining === ammo.charges.current && magazineSourceId === selectedAmmunitionSourceId) {
            // The current magazine is the same, and has the same remaining ammunition, as the new one
            ui.notifications.warn(`${weapon.name}'s current magazine is already loaded with as much ammunition as ${ammo.name}`);
            return;
        } else {
            // We actually want to reload, either for a magazine with more ammunition remaining, or for a different type of ammunition
            numActions++;
            await unloadMagazine(actor, magazineLoadedEffect, updates);
        }
    }

    // Get a magazine from the existing ammunition and create an effect to represent that magazine
    const magazineLoadedEffectSource = await getItem(MAGAZINE_LOADED_EFFECT_ID);
    setEffectTarget(magazineLoadedEffectSource, weapon);

    const magazineLoadedEffectFlags = magazineLoadedEffectSource.flags["pf2e-ranged-combat"];
    magazineLoadedEffectFlags.name = `${magazineLoadedEffectSource.name} (${ammo.name})`;
    magazineLoadedEffectFlags.capacity = ammo.charges.max;
    magazineLoadedEffectFlags.remaining = ammo.charges.current;
    magazineLoadedEffectFlags.ammunitionName = ammo.name;
    magazineLoadedEffectFlags.ammunitionImg = ammo.img;
    magazineLoadedEffectFlags.ammunitionItemId = ammo.id;
    magazineLoadedEffectFlags.ammunitionSourceId = ammo.sourceId;

    magazineLoadedEffectSource.name = `${magazineLoadedEffectSource.name} (${ammo.name}) (${ammo.charges.current}/${ammo.charges.max})`;

    updates.add(magazineLoadedEffectSource);

    await triggerCrossbowReloadEffects(actor, weapon, updates);

    numActions += 2;

    // Remove that magazine from the stack
    updates.update(async () => {
        await ammo.update({
            "data.quantity": ammo.quantity - 1,
            "data.charges.value": ammo.charges.max,
        });
    });

    await postInChat(
        actor,
        RELOAD_MAGAZINE_IMG,
        `${token.name} loads their ${weapon.name} with ${ammo.name} (${ammo.charges.current}/${ammo.charges.max}).`,
        "Interact",
        String(numActions)
    );

    await updates.handleUpdates();
}
