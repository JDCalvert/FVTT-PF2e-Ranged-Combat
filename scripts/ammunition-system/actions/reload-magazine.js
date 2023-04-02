import { handleReload } from "../../feats/crossbow-feats.js";
import { getControlledActorAndToken, getEffectFromActor, getFlag, getItem, postInChat, setEffectTarget, showWarning, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { MAGAZINE_LOADED_EFFECT_ID, RELOAD_MAGAZINE_IMG } from "../constants.js";
import { selectAmmunition } from "./switch-ammunition.js";
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
            showWarning(game.i18n.localize("pf2e-ranged-combat.ammunition-system.actions.reload-magazine.character-warning"));
            return;
        } else if (actor.type === "npc") {
            showWarning(game.i18n.localize("pf2e-ranged-combat.ammunition-system.actions.reload-magazine.npc-warning"));
            return;
        }
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.isRepeating,
        game.i18n.localize("pf2e-ranged-combat.ammunition-system.actions.reload-magazine.no-repeating"),
        weapon => {
            const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            return !magazineLoadedEffect || !getFlag(magazineLoadedEffect, "remaining");
        }
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    // If we have no ammunition selected, or we have none left in the stack, we can't reload
    const ammo = await getAmmunition(weapon, updates);
    if (!ammo) {
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
            showWarning(`${weapon.name} is already loaded with a full magazine.`); /*Localization?*/
            return;
        } else if (magazineRemaining === ammo.system.charges.value && magazineSourceId === selectedAmmunitionSourceId) {
            // The current magazine is the same, and has the same remaining ammunition, as the new one
            showWarning(`${weapon.name}'s current magazine is already loaded with as much ammunition as ${ammo.name}`); /*Localization?*/
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

    magazineLoadedEffectSource.flags["pf2e-ranged-combat"] = {
        ...magazineLoadedEffectSource.flags["pf2e-ranged-combat"],
        name: `${magazineLoadedEffectSource.name} (${ammo.name})`,
        capacity: ammo.system.charges.max,
        remaining: ammo.system.charges.value,
        ammunitionName: ammo.name,
        ammunitionImg: ammo.img,
        ammunitionItemId: ammo.id,
        ammunitionSourceId: ammo.sourceId
    };

    magazineLoadedEffectSource.name = `${magazineLoadedEffectSource.name} (${ammo.name}) (${ammo.system.charges.value}/${ammo.system.charges.max})`;

    updates.create(magazineLoadedEffectSource);

    await handleReload(weapon, updates);

    numActions += 2;

    // Remove that magazine from the stack
    updates.update(
        ammo,
        {
            system: {
                quantity: ammo.quantity - 1,
                charges: {
                    value: ammo.system.charges.max
                }            
            }
        }
    );

    await postInChat(
        actor,
        RELOAD_MAGAZINE_IMG,
        `${token.name} loads their ${weapon.name} with ${ammo.name} (${ammo.system.charges.value}/${ammo.system.charges.max}).`, /*Localization?*/
        game.i18n.localize("pf2e-ranged-combat.basic-terms.interact"),
        String(numActions)
    );

    updates.handleUpdates();
    Hooks.callAll("pf2eRangedCombatReloadMagazine", actor, token, weapon);
}

async function getAmmunition(weapon, updates) {
    const ammunition = weapon.ammunition;
    
    if (!ammunition) {
        return await selectAmmunition(
            weapon,
            updates,
            `You have no equipped ammunition compatible with your ${weapon.name}.`, /*Localization?*/
            `You have no ammunition selected for your ${weapon.name}.</p><p>Select the ammunition to load.`, /*Localization?*/
            false,
            false
        )
    } else if (ammunition.quantity < 1) {
        return await selectAmmunition(
            weapon,
            updates,
            `You don't have enough ammunition to reload your ${weapon.name}.`, /*Localization?*/
            `Your selected ammunition for your ${weapon.name} is empty.</p><p>Select new ammunition to load.`, /*Localization?*/
            true,
            false
        )
    } else {
        return ammunition;
    }
}
