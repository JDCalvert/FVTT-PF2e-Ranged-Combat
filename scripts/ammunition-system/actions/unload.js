import { getControlledActorAndToken, getEffectFromActor, getFlag, getItem, postInChat, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "../constants.js";
import { removeAmmunition } from "../utils.js";

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
    const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect && !magazineLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is not loaded!`);
        return;
    }

    if (useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            if (loadedEffect) {
                updates.remove(loadedEffect);
            }
            if (magazineLoadedEffect) {
                await unloadMagazine(actor, magazineLoadedEffect, updates);
                postInChat(
                    actor,
                    magazineLoadedEffect.img,
                    `${token.name} unloads ${getFlag(magazineLoadedEffect, "ammunitionName")} from their ${weapon.name}.`,
                    "Interact",
                    "1"
                );
            }
        } else {
            unloadAmmunition(actor, weapon, updates);
            postInChat(
                actor,
                loadedEffect.img,
                `${token.name} unloads ${getFlag(loadedEffect, "ammunitionName")} from their ${weapon.name}.`,
                "Interact",
                "1"
            );
        }
    } else {
        removeAmmunition(actor, weapon, updates);
        postInChat(
            actor,
            loadedEffect.img,
            `${token.name} unloads their ${weapon.name}`,
            "Interact",
            "1"
        );
    }

    updates.handleUpdates();
}

function getLoadedWeapon(actor) {
    return getWeapon(
        actor,
        weapon => {
            if (weapon.isRepeating) {
                return getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            } else if (weapon.requiresLoading) {
                return getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            }
            return false;
        },
        "You have no loaded weapons."
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
        updates.update(() => {
            ammunitionItem.update({
                "data.quantity": ammunitionItem.quantity + 1
            });
        });
    } else if (ammunitionRemaining > 0) {
        // The magazine still has some ammunition left, create a new item with the remaining ammunition
        const itemSourceId = getFlag(magazineLoadedEffect, "ammunitionSourceId");
        const ammunitionSource = await getItem(itemSourceId);
        ammunitionSource.data.charges.value = ammunitionRemaining;
        updates.add(ammunitionSource);
    }

    // Finally, remove the existing effect
    updates.remove(magazineLoadedEffect);

    // If the weapon was loaded, then remove the loaded status as well
    const weaponId = getFlag(magazineLoadedEffect, "targetId");
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weaponId);
    if (loadedEffect) {
        updates.remove(loadedEffect);
    }
}

export async function unloadAmmunition(actor, weapon, updates) {
    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    const loadedItemId = getFlag(loadedEffect, "ammunitionItemId");
    const loadedSourceId = getFlag(loadedEffect, "ammunitionSourceId");

    // Try to find either the stack the loaded ammunition came from, or another stack of the same ammunition
    const ammunitionItem = actor.items.find(item => item.id === loadedItemId && !item.isStowed)
        || actor.items.find(item => item.sourceId === loadedSourceId && !item.isStowed);

    if (ammunitionItem) {
        // We still have the stack the ammunition originally came from, or another that's the same.
        // Add the currently loaded ammunition to the stack
        updates.update(() => {
            ammunitionItem.update({
                "data.quantity": ammunitionItem.quantity + 1
            });
        });
    } else {
        // Create a new stack with one piece of ammunition in it
        const ammunitionSource = await getItem(loadedSourceId);
        ammunitionSource.data.quantity = 1;
        updates.add(ammunitionSource);
    }

    removeAmmunition(actor, weapon, updates);
}
