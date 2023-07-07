import { getControlledActorAndToken, getEffectFromActor, getFlag, getFlags, getItem, postInChat, showWarning, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "../constants.js";
import { clearLoadedChamber, getSelectedAmmunition, isLoaded, removeAmmunition, removeAmmunitionAdvancedCapacity } from "../utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.unload." + key)
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.unload." + key, data)

export async function unload() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getLoadedWeapon(actor);
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect && !conjuredRoundEffect && !magazineLoadedEffect) {
        showWarning(format("warningNotLoaded", { weapon: weapon.name }));
        return;
    }

    if (useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            if (loadedEffect) {
                updates.delete(loadedEffect);
            }
            if (magazineLoadedEffect) {
                await unloadMagazine(actor, magazineLoadedEffect, updates);
                postInChat(
                    actor,
                    magazineLoadedEffect.img,
                    format("tokenUnloadsAmmunitionFromWeapon", { token: token.name, ammunition: getFlag(magazineLoadedEffect, "ammunitionName"), weapon: weapon.name }),
                    game.i18n.localize("PF2E.Actions.Interact.Title"),
                    "1"
                );
            }
        } else if (weapon.capacity) {
            const ammunition = await getSelectedAmmunition(actor, weapon, "unload");
            if (!ammunition) {
                return;
            }

            if (ammunition.sourceId === CONJURED_ROUND_ITEM_ID) {
                const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
                updates.delete(conjuredRoundEffect);
                clearLoadedChamber(actor, weapon, ammunition, updates);
            } else {
                moveAmmunitionToInventory(actor, ammunition, updates);
                removeAmmunitionAdvancedCapacity(actor, weapon, ammunition, updates);
            }
            postInChat(
                actor,
                ammunition.img,
                format("tokenUnloadsAmmunitionFromWeapon", { token: token.name, ammunition: ammunition.name, weapon: weapon.name }),
                game.i18n.localize("PF2E.Actions.Interact.Title"),
                "1"
            );
        } else {
            unloadAmmunition(actor, weapon, updates);
            postInChat(
                actor,
                loadedEffect.img,
                format("tokenUnloadsAmmunitionFromWeapon", { token: token.name, ammunition: getFlag(loadedEffect, "ammunition").name, weapon: weapon.name }),
                game.i18n.localize("PF2E.Actions.Interact.Title"),
                "1"
            );
        }
    } else {
        removeAmmunition(actor, weapon, updates);
        postInChat(
            actor,
            loadedEffect.img,
            format("tokenUnloadsWeapon", { token: token.name, weapon: weapon.name }),
            game.i18n.localize("PF2E.Actions.Interact.Title"),
            "1"
        );
    }

    updates.handleUpdates();
    Hooks.callAll("pf2eRangedCombatUnload", actor, token, weapon);
}

function getLoadedWeapon(actor) {
    return getWeapon(
        actor,
        weapon => {
            if (useAdvancedAmmunitionSystem(actor) && weapon.isRepeating) {
                return getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            } else if (weapon.requiresLoading) {
                return isLoaded(actor, weapon);
            }
            return false;
        },
        localize("noLoadedWeapons")
    );
}

/**
 * Remove the magazine effect and add the remaining ammunition back to the actor
 */
export async function unloadMagazine(actor, magazineLoadedEffect, updates) {
    const ammunitionCapacity = getFlag(magazineLoadedEffect, "capacity");
    const ammunitionRemaining = getFlag(magazineLoadedEffect, "remaining");

    const ammunitionItemId = getFlag(magazineLoadedEffect, "ammunitionItemId");
    const ammunitionItem = actor.items.find(item => item.id === ammunitionItemId && !item.isStowed);

    if (ammunitionRemaining === ammunitionCapacity && ammunitionItem) {
        // We found the original stack of ammunition this
        updates.update(ammunitionItem, { "system.quantity": ammunitionItem.quantity + 1 });
    } else if (ammunitionRemaining > 0) {
        // The magazine still has some ammunition left, create a new item with the remaining ammunition
        const itemSourceId = getFlag(magazineLoadedEffect, "ammunitionSourceId");
        const ammunitionSource = await getItem(itemSourceId);
        ammunitionSource.system.charges.value = ammunitionRemaining;
        updates.create(ammunitionSource);
    }

    // Finally, remove the existing effect
    updates.delete(magazineLoadedEffect);

    // If the weapon was loaded, then remove the loaded status as well
    const weaponId = getFlag(magazineLoadedEffect, "targetId");
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weaponId);
    if (loadedEffect) {
        updates.delete(loadedEffect);
    }
}

export async function unloadAmmunition(actor, weapon, updates) {
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    const loadedAmmunition = getFlag(loadedEffect, "ammunition");

    moveAmmunitionToInventory(actor, loadedAmmunition, updates);
    removeAmmunition(actor, weapon, updates);
}

export async function moveAmmunitionToInventory(actor, ammunition, updates) {
    // Try to find either the stack the loaded ammunition came from, or another stack of the same ammunition
    const ammunitionItem = actor.items.find(item => item.id === ammunition.id && !item.isStowed)
        || actor.items.find(item => item.sourceId === ammunition.sourceId && !item.isStowed);

    if (ammunitionItem) {
        // We still have the stack the ammunition originally came from, or another that's the same.
        // Add the currently loaded ammunition to the stack
        updates.update(ammunitionItem, { "system.quantity": ammunitionItem.quantity + 1 });
    } else {
        // Create a new stack with one piece of ammunition in it
        const ammunitionSource = await getItem(ammunition.sourceId);
        ammunitionSource.system.quantity = 1;
        updates.create(ammunitionSource);
    }
}
