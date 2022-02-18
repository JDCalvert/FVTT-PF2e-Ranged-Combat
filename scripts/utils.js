import { ItemSelectDialog } from "./dialog.js";
// Loaded
export const LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.nEqdxZMAHlYVXI0Z";
export const MAGAZINE_LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.vKeDaHOu3bGKSk6b";

// Reload
export const RELOAD_ACTION_ONE_ID = "Compendium.pf2e-ranged-combat.actions.MAYuLJ4bsciOXiNM";
export const RELOAD_ACTION_TWO_ID = "Compendium.pf2e-ranged-combat.actions.lqjuYBOAjDb9ACfo";
export const RELOAD_ACTION_THREE_ID = "Compendium.pf2e-ranged-combat.actions.IOhJIXBqxCuWtAgr";
export const RELOAD_ACTION_EXPLORE_ID = "Compendium.pf2e-ranged-combat.actions.t8xTgsZqOIW02suc";

// Hunt Prey
export const HUNT_PREY_FEATURE_ID = "Compendium.pf2e.classfeatures.0nIOGpHQNHsKSFKT";
export const HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.JYi4MnsdFu618hPm";
export const HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.rdLADYwOByj8AZ7r";

// Crossbow Ace
export const CROSSBOW_ACE_FEAT_ID = "Compendium.pf2e.feats-srd.CpjN7v1QN8TQFcvI";
export const CROSSBOW_ACE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.zP0vPd14V5OG9ZFv";

// Crossbow Crack Shot
export const CROSSBOW_CRACK_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.s6h0xkdKf3gecLk6";
export const CROSSBOW_CRACK_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.hG9i3aOBDZ9Bq9yi";

// Images
export const RELOAD_AMMUNITION_IMG = "modules/pf2e-ranged-combat/art/reload_ammunition.webp";
export const RELOAD_MAGAZINE_IMG = "modules/pf2e-ranged-combat/art/reload_magazine.webp";
export const UNLOAD_IMG = "modules/pf2e-ranged-combat/art/unload.webp";
export const CONSOLIDATE_AMMUNITION_IMG = "modules/pf2e-ranged-combat/art/consolidate_ammunition.webp";

/**
 * Get exactly one controlled token. If there are no tokens controlled, looks for a single
 * token belonging to the current user's character. If there are multiple tokens found,
 * returns undefined.
 */
export function getControlledToken() {
    return [canvas.tokens.controlled, game.user.character?.getActiveTokens()]
        .filter(tokens => !!tokens)
        .find(tokens => tokens.length === 1)
        ?.[0];
}

/**
 * Find exactly one targeted token
 */
export function getTarget(notifyNoToken = true) {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));
    if (!targetTokens.length) {
        if (notifyNoToken) ui.notifications.warn("No target selected.");
    } else if (targetTokens.length > 1) {
        if (notifyNoToken) ui.notifications.warn("You must have only one target selected.");
    } else {
        return targetTokens[0];
    }

    return null;
}

/**
 * Find out if the weapon uses ammunition
 */
export function usesAmmunition(item) {
    if (item.actor.type === "character") {
        return item.baseType === "blowgun" || ["firearm", "bow", "sling"].includes(item.group);
    } else if (item.actor.type === "npc") {
        return false; // TODO work this out
    } else {
        return false;
    }
}

export function getAmmunition(item) {
    if (!usesAmmunition(item)) {
        return;
    }

    if (item.actor.type === "character") {
        return item.ammo;
    } else if (item.actor.type === "npc") {
        return;
    } else {
        return;
    }
}

/**
 * Find out if a weapon requires loading (e.g. has a reload time of greater than 0)
 * 
 * @param {WeaponPF2e | MeleePF2e} item
 * @returns true if the weapon has a non-zero reload time
 */
export function requiresLoading(item) {
    return getReloadTime(item) > 0;
}

/**
 * Check if a weapon is repeating
 * @param {WeaponPF2e | MeleePF2e} item
 * @returns true if the weapon is a repeating weapon
 */
export function isRepeating(item) {
    return item.traits.has("repeating");
}

/**
 * Find the reload time of a weapon
 * @param {WeaponPF2e | MeleePF2e} item
 * @returns the reload time of the weapon, or 0 if it doesn't have one
 */
export function getReloadTime(item) {
    if (item.actor.type === "character") {
        return Number(item.reload || 0);
    } else if (item.actor.type === "npc") {
        const reloadTrait = item.data.data.traits.value.find(trait => trait.startsWith("reload-"));
        if (reloadTrait) {
            const reloadTime = reloadTrait.slice("reload-".length);
            if (reloadTime === "1-min") {
                return 30;
            } else {
                return parseInt(reloadTime);
            }
        }
    }

    return 0;
}

/**
 * Find whether the actor has the specified item
 */
export function actorHasItem(actor, sourceId) {
    return actor.items.some(item => item.getFlag("core", "sourceId") === sourceId);
}

/**
 * Get a specific item from the actor, identified by its source ID. Optionally, add it if not already present
 */
export async function getItemFromActor(actor, sourceId, addIfNotPresent = false) {
    let myItem = actor.items.find(item => item.getFlag("core", "sourceId") === sourceId);
    if (!myItem && addIfNotPresent) {
        const newItem = await getItem(sourceId);
        await actor.createEmbeddedDocuments("Item", [newItem]);
        myItem = await getItemFromActor(actor, sourceId);
    }
    return myItem;
}

/**
 * Get an effect currently on the actor with the specified source ID and target
 */
export function getEffectFromActor(actor, sourceId, targetId) {
    return actor.itemTypes.effect.find(effect =>
        effect.getFlag("core", "sourceId") === sourceId
        && effect.getFlag("pf2e-ranged-combat", "targetId") === targetId
    );
}

/**
 * Find the item with the given ID, and make a copy of it with a new ID
 */
export async function getItem(id) {
    const source = (await fromUuid(id)).toObject();
    source.flags.core ??= {};
    source.flags.core.sourceId = id;
    source._id = randomID();
    return source;
}

export function setEffectTarget(effect, weapon) {
    effect.name = `${effect.name} (${weapon.name})`;
    effect.flags["pf2e-ranged-combat"] = {
        targetId: weapon.id
    };
    effect.data.target = weapon.id;

    // Remove the "effect target" rule so we skip the popup
    const rules = effect.data.rules;
    rules.splice(rules.findIndex(rule => rule.key === "EffectTarget"), 1);
}

export async function getSingleWeapon(weapons) {
    if (!weapons.length) {
        return;
    } else if (weapons.length === 1) {
        return weapons[0];
    } else {
        return await ItemSelectDialog.getItem("Weapon Select", "Select a Weapon", weapons);
    }
}

export async function postActionInChat(actor, actionId) {
    if (game.settings.get("pf2e-ranged-combat", "postFullAction")) {
        const myAction = await getItemFromActor(actor, actionId, true);
        myAction.toMessage();
    }
}

export async function postInChat(actor, img, message, actionName = "", numActions = "") {
    const content = await renderTemplate("./systems/pf2e/templates/chat/action/content.html", { imgPath: img, message: message, });
    const flavor = await renderTemplate("./systems/pf2e/templates/chat/action/flavor.html", { action: { title: actionName, typeNumber: String(numActions) } });
    ChatMessage.create({
        type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor,
        content
    });
}

export async function handleUpdates(actor, itemsToAdd, itemsToRemove, itemsToUpdate) {
    for (const update of itemsToUpdate) {
        await update();
    }

    await actor.deleteEmbeddedDocuments("Item", itemsToRemove.map(item => item.id));
    await actor.createEmbeddedDocuments("Item", itemsToAdd);
}

/**
 * For the given actor type, check if the advanced ammunition system is enabled
 */
export function useAdvancedAmmunitionSystem(actor) {
    if (actor.type === "character") {
        return game.settings.get("pf2e-ranged-combat", "advancedAmmunitionSystemPlayer");
    } else if (actor.type === "npc") {
        return false; // Placeholder for NPC advanced ammunition system
    } else {
        return false;
    }
}
