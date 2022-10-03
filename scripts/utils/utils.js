export class Updates {
    constructor(actor) {
        this.actor = actor;
        this.itemsToAdd = [];
        this.itemsToRemove = [];
        this.itemsToUpdate = [];
        this.floatyTextToShow = [];
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

    floatyText(text, up) {
        this.floatyTextToShow.push({ text, up });
    }

    hasChanges() {
        return this.itemsToAdd.length || this.itemsToUpdate.length || this.itemsToRemove.length;
    }

    async handleUpdates() {
        for (const update of this.itemsToUpdate) {
            await update();
        }

        await this.actor.deleteEmbeddedDocuments("Item", [...new Set(this.itemsToRemove)].map(item => item.id));
        await this.actor.createEmbeddedDocuments("Item", this.itemsToAdd);

        let i = 0;
        for (const floatyText of this.floatyTextToShow) {
            const tokens = this.actor.getActiveTokens();
            setTimeout(
                () => {
                    for (const token of tokens) {
                        floatyText.up
                            ? token.showFloatyText({ create: { name: floatyText.text } })
                            : token.showFloatyText({ upadte: { name: floatyText.text } });
                    }
                },
                i * 300
            );
            i++;
        }
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

    showWarning("You must have a single character selected.");
    return { actor: null, token: null };
}

/**
 * Find exactly one targeted token
 */
export function getTarget(notifyNoToken = true) {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));
    if (!targetTokens.length) {
        if (notifyNoToken) showWarning("No target selected.");
    } else if (targetTokens.length > 1) {
        if (notifyNoToken) showWarning("You must have only one target selected.");
    } else {
        return targetTokens[0];
    }

    return null;
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
export function getItemFromActor(actor, sourceId) {
    return actor.items.find(item => item.getFlag("core", "sourceId") === sourceId);
}

/**
 * Get an effect currently on the actor with the specified source ID and target
 */
export function getEffectFromActor(actor, sourceId, targetId) {
    return actor.itemTypes.effect.find(effect =>
        effect.getFlag("core", "sourceId") === sourceId
        && getFlag(effect, "targetId") === targetId
        && !effect.isExpired
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

export function setEffectTarget(effectSource, item, adjustName = true) {
    if (adjustName) {
        effectSource.name = `${effectSource.name} (${item.name})`;
    }

    effectSource.flags = {
        ...effectSource.flags,
        "pf2e-ranged-combat": {
            ...effectSource.flags?.["pf2e-ranged-combat"],
            targetId: item.id
        },
        pf2e: {
            ...effectSource.flags?.pf2e,
            rulesSelections: {
                ...effectSource.flags?.pf2e?.rulesSelections,
                weapon: item.id
            }
        }
    }

    // Remove the "effect target" rule so we skip the popup
    const rules = effectSource.system.rules;
    rules.findSplice(rule => rule.key === "ChoiceSet");
}

export function setChoice(effectSource, choiceFlag, choiceValue, label = null) {
    if (label) {
        effectSource.name = `${effectSource.name} (${label})`;
    }
    effectSource.flags.pf2e ??= {};
    effectSource.flags.pf2e.rulesSelections ??= {};
    effectSource.flags.pf2e.rulesSelections[choiceFlag] = choiceValue;

    // Remove the ChoiceSet rule since we've already made it
    effectSource.system.rules.findSplice(rule => rule.key === "ChoiceSet" && rule.flag === choiceFlag);
}

/**
 * If the actor doesn't have at least one token that's in combat, then a duration of 0 will be immediately expired
 * To prevent this, set the duration to 1 round
 */
export function ensureDuration(actor, effectSource) {   
    if (!actor.getActiveTokens().some(token => token.inCombat) && effectSource.system.duration.value === 0) {
        effectSource.system.duration.value = 1;
    }
}

export async function postActionInChat(action) {
    if (game.settings.get("pf2e-ranged-combat", "postFullAction")) {
        await action.toMessage();
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

export function getFlags(item) {
    return item.flags["pf2e-ranged-combat"];
}

export function getFlag(item, flagName) {
    return item.flags["pf2e-ranged-combat"]?.[flagName];
}
