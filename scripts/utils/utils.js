// Ammunition System
export const LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.nEqdxZMAHlYVXI0Z";
export const MAGAZINE_LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.vKeDaHOu3bGKSk6b";
export const AMMUNITION_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.zVcsgX5KduyfBXRZ";

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

export class Updates {
    constructor(actor) {
        this.actor = actor;
        this.itemsToAdd = [];
        this.itemsToRemove = [];
        this.itemsToUpdate = [];
    }

    add(item) {
        this.itemsToAdd.push(item);
    }

    remove(item) {
        this.itemsToRemove.push(item);
    }

    update(update) {
        this.itemsToUpdate.push(update);
    }

    hasChanges() {
        return this.itemsToAdd.length || this.itemsToUpdate.length || this.itemsToRemove.length;
    }

    async handleUpdates() {
        for (const update of this.itemsToUpdate) {
            await update();
        }

        await this.actor.deleteEmbeddedDocuments("Item", this.itemsToRemove.map(item => item.id));
        await this.actor.createEmbeddedDocuments("Item", this.itemsToAdd);
    }
}

/**
 * Find a single controlled actor and token.
 * 
 * - If there is exactly one token selected, return that token and its actor
 * - If there are no tokens selected, but the user has an owned actor with one token in the scene, return that actor and token
 * - Otherwise, show a warning and return an empty object
 * 
 * @returns an object with `actor` and `token` fields, which are either both populated or both null
 */
export function getControlledActorAndToken() {
    const controlledTokens = canvas.tokens.controlled;
    if (controlledTokens.length) {
        if (controlledTokens.length === 1) {
            const token = controlledTokens[0];
            const actor = token?.actor;
            if (actor && token) {
                return { actor, token };
            }
        }
    } else {
        const actor = game.user.character;
        const tokens = actor?.getActiveTokens();
        const token = tokens?.length === 1 ? tokens[0] : null;
        if (actor && token) {
            return { actor, token };
        }
    }

    ui.notifications.warn("You must have a single character selected.");
    return { actor: null, token: null };
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
 * Find whether the actor has the specified item
 */
export function actorHasItem(actor, sourceId) {
    return actor.items.some(item => item.getFlag("core", "sourceId") === sourceId);
}

/**
 * Find a non-stowed item on the actor, preferably matching the passed item ID, but fall back on an item
 * with the same source ID if one cannot be found
 */
export function findItemOnActor(actor, itemId, sourceId) {
    return actor.items.find(item => item.id === itemId && !item.isStowed)
        || actor.items.find(item => item.sourceId === sourceId && !item.isStowed);
}

/**
 * Get a specific item from the actor, identified by its source ID. Optionally, add it if not already present
 */
export async function getItemFromActor(actor, sourceId, addIfNotPresent = false) {
    let item = actor.items.find(item => item.getFlag("core", "sourceId") === sourceId);
    if (!item && addIfNotPresent) {
        const newItem = await getItem(sourceId);
        await actor.createEmbeddedDocuments("Item", [newItem]);
        item = await getItemFromActor(actor, sourceId);
    }
    return item;
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

export function setEffectTarget(effect, item, adjustName = true) {
    if (adjustName) {
        effect.name = `${effect.name} (${item.name})`;
    }
    effect.flags["pf2e-ranged-combat"] = {
        targetId: item.id
    };
    effect.data.target = item.id;

    // Remove the "effect target" rule so we skip the popup
    const rules = effect.data.rules;
    rules.splice(rules.findIndex(rule => rule.key === "EffectTarget"), 1);
}

export function setChoice(effect, choiceFlag, choiceValue, label = choice) {
    effect.name = `${effect.name} (${label})`;
    effect.flags.pf2e ??= {};
    effect.flags.pf2e.rulesSelections ??= {};
    effect.flags.pf2e.rulesSelections[choiceFlag] = choiceValue;

    // Remove the ChoiceSet rule since we've already made it
    const rules = effect.data.rules;
    rules.splice(rules.findIndex(rule => rule.key === "ChoiceSet" && rule.flag === choiceFlag), 1);
}

export async function postActionInChat(actor, actionId) {
    if (game.settings.get("pf2e-ranged-combat", "postFullAction")) {
        await (await getItemFromActor(actor, actionId, true)).toMessage();
    }
}

export async function postInChat(actor, img, message, actionName = "", numActions = "") {
    const content = await renderTemplate("./systems/pf2e/templates/chat/action/content.html", { imgPath: img, message: message, });
    const flavor = await renderTemplate("./systems/pf2e/templates/chat/action/flavor.html", { action: { title: actionName, typeNumber: String(numActions) } });

    await ChatMessage.create({
        type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor,
        content,
        flags: {
            "pf2e-ranged-combat": {
                actorId: actor.id
            }
        }
    });
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

export function showWarning(warningMessage) {
    if (game.settings.get("pf2e-ranged-combat", "doNotShowWarningAgain")) {
        ui.notifications.warn(warningMessage);
    } else {
        new Dialog(
            {
                "title": "PF2e Ranged Combat",
                "content": `
                    <p>You cannot fire this weapon because: ${warningMessage}<p>
                    <p>This is a feature of the PF2e Ranged Combat module. 
                    You can learn how to use the module <a href="https://github.com/JDCalvert/FVTT-PF2e-Ranged-Combat/blob/main/README.md">here</a>.</p>
                `,
                "buttons": {
                    "ok": {
                        "label": "OK",
                    },
                    "doNotShowAgain": {
                        "label": "OK (Do not show again)",
                        "callback": () => game.settings.set("pf2e-ranged-combat", "doNotShowWarningAgain", true)
                    }
                }
            }
        ).render(true);
    }
}
