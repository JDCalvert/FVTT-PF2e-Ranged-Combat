import { postToChatConfig } from "../pf2e-ranged-combat.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eToken } from "../types/pf2e/token.js";
import { showDialog } from "./dialog.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.utils." + key);

/**
 * Find a single controlled actor, either from an open character sheet, selected token, or owned actor.
 */
export function getControlledActor() {
    /** @type PF2eActor[] */
    const sheetActors = Object.values(ui.windows).map(window => window.actor).filter(actor => !!actor);
    if (sheetActors.length === 1) {
        return sheetActors[0];
    }

    return getControlledActorAndToken().actor;
}

/**
 * Find a single controlled actor and token.
 * 
 * - If there is exactly one token selected, return that token and its actor
 * - If there are no tokens selected, but the user has an owned actor with one token in the scene, return that actor and token
 * - Otherwise, show a warning and return an empty object
 * 
 * @returns {{actor: PF2eActor, token: PF2eToken}|{actor: null, token: null}}
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

    showWarning(localize("singleCharacterSelected"));
    return { actor: null, token: null };
}

/**
 * @param {PF2eActor} actor 
 */
export function getPreferredName(actor) {
    // First try to find a single controlled token for this actor
    const controlledTokensForActor = canvas.tokens.controlled.filter(token => token.actor === actor);
    if (controlledTokensForActor.length === 1) {
        return controlledTokensForActor[0].name;
    }

    // Next try to find a single active token for this actor
    const tokens = actor.getActiveTokens();
    if (tokens.length === 1) {
        return tokens[0].name;
    }

    // Fall back on the actor's name
    return actor.name;
}

/**
 * Find a non-stowed item on the actor, preferably matching the passed item ID, but fall back on an item
 * with the same source ID if one cannot be found.
 * 
 * @param {PF2eActor} actor
 * @param {string} itemId 
 * @param {string} sourceId
 */
export function findItemOnActor(actor, itemId, sourceId) {
    return actor.items.find(item => item.id === itemId && !item.isStowed)
        || actor.items.find(item => item.sourceId === sourceId && !item.isStowed);
}

/**
 * Get a specific item from the actor, identified by its source ID
 * 
 * @param {PF2eActor} actor
 * @param {string} sourceId
 */
export function getItemFromActor(actor, sourceId) {
    return actor.items.find(item => item.sourceId === sourceId);
}

/**
 * Get an effect currently on the actor with the specified source ID and target
 * 
 * @param {PF2eActor} actor
 * @param {string} sourceId
 * @param {string} targetId
 */
export function getEffectFromActor(actor, sourceId, targetId) {
    return actor.itemTypes.effect.find(effect =>
        effect.sourceId === sourceId
        && (getFlag(effect, "targetId") === targetId || effect.flags.pf2e.rulesSelections.weapon === targetId)
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
    source._id = foundry.utils.randomID();
    return source;
}

export function setEffectTarget(effectSource, item, adjustName = true) {
    if (adjustName) {
        effectSource.name = `${effectSource.name} (${item.name})`;
    }

    foundry.utils.mergeObject(
        effectSource.flags,
        {
            "pf2e-ranged-combat": {
                targetId: item.id
            },
            "pf2e": {
                rulesSelections: {
                    weapon: item.id
                }
            }
        }
    );

    if (game.settings.get("pf2e-ranged-combat", "hideTokenIcons")) {
        effectSource.system.tokenIcon.show = false;
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
    if (!isInCombat(actor) && effectSource.system.duration.value === 0) {
        effectSource.system.duration.value = 1;
    }
}

/**
 * Determine if the actor has some token that's in combat
 * 
 * @param {PF2eActor} actor 
 * @returns {boolean}
 */
export function isInCombat(actor) {
    return actor.getActiveTokens().some(token => token.inCombat);
}

export async function postActionToChat(action) {
    if (game.settings.get("pf2e-ranged-combat", "postActionToChat") == postToChatConfig.full) {
        CONFIG.pf2eRangedCombat.chatHook = false;
        await action.toMessage();
        CONFIG.pf2eRangedCombat.chatHook = true;
    }
}

export async function postInteractToChat(actor, img, message, numActions) {
    if (game.settings.get("pf2e-ranged-combat", "postActionToChat")) {
        postMessage(
            actor,
            img,
            message,
            {
                actionName: game.i18n.localize("PF2E.Actions.Interact.Title"),
                numActions,
                traits: ["manipulate"]
            }
        );
    }
}

/**
 * Post a message to chat saying that something happened, only if the postActionToChat option is enabled.
 * 
 * @param {PF2eActor} actor 
 * @param {string} img 
 * @param {string} message 
 * @param {{
 *      actionName?: string,
 *      numActions?: string,
 *      traits?: string[],
 *      link? : string
 * }} params 
 */
export async function postToChat(actor, img, message, params) {
    if (game.settings.get("pf2e-ranged-combat", "postActionToChat")) {
        postMessage(actor, img, message, params);
    }
}

/**
 * Post a message to chat saying that something happened
 * 
 * @param {PF2eActor} actor 
 * @param {string} img 
 * @param {string} message 
 * @param {{
 *      actionName?: string,
 *      numActions?: string,
 *      traits?: string[],
 *      link? : string
 * }} params 
 */
export async function postMessage(actor, img, message, params = {}) {
    const flavor = await render(
        "./systems/pf2e/templates/chat/action/flavor.hbs",
        {
            action: {
                title: params.actionName || "",
                glyph: String(params.numActions || "")
            },
            traits: params.traits?.sort()?.map(trait => {
                return {
                    name: trait,
                    label: CONFIG.PF2E.featTraits[trait],
                    description: CONFIG.PF2E.traitsDescriptions[trait]
                };
            })
        }
    );

    const content = await render(
        "./systems/pf2e/templates/chat/action/content.hbs",
        {
            imgPath: img,
            message: message
        }
    );

    await ChatMessage.create(
        {
            type: CONST.CHAT_MESSAGE_STYLES.EMOTE,
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: flavor + (params.link ? `@UUID[${params.link}]` : ""),
            content,
            flags: {
                "pf2e-ranged-combat": {
                    actorId: actor.id
                }
            }
        }
    );
}

export async function render(path, data) {
    if (isUsingApplicationV2()) {
        return foundry.applications.handlebars.renderTemplate(path, data);
    } else {
        return renderTemplate(path, data);
    }
}

export function getAttackPopout(item) {
    if (!item.actor) {
        return null;
    }

    return Object.values(item.actor.apps).find(window => window.constructor.name === "AttackPopout" && window.options.strikeItemId === item.id);
}

/**
 * For the given actor type, check if the advanced ammunition system is enabled
 * 
 * @param {PF2eActor} actor
 * 
 * @returns {boolean}
 */
export function useAdvancedAmmunitionSystem(actor) {
    if (actor.type === "character") {
        return game.settings.get("pf2e-ranged-combat", "advancedAmmunitionSystemPlayer");
    } else if (actor.type === "npc") {
        return getFlag(actor, "enableAdvancedAmmunitionSystem");
    } else {
        return false;
    }
}

export function preventFiringWithoutLoading(actor) {
    if (actor.type === "character") {
        return game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded");
    } else if (actor.type === "npc") {
        return game.settings.get("pf2e-ranged-combat", "preventFireNotLoadedNPC");
    } else {
        return false;
    }
}

export function showWarning(warningMessage) {
    if (CONFIG.pf2eRangedCombat.silent) {
        return;
    }

    if (game.settings.get("pf2e-ranged-combat", "doNotShowWarningAgain")) {
        ui.notifications.warn(warningMessage);
    } else {
        let content;
        if (isUsingApplicationV2()) {
            content = `
            <p>
                ${localize("warningDialog1")} ${warningMessage}
                <br><br>
                ${localize("warningDialog2")} 
                ${localize("warningDialog3")}
            </p>
        `;
        } else {
            content = `
            <p>${localize("warningDialog1")} ${warningMessage}<p>
            <p>${localize("warningDialog2")} 
            ${localize("warningDialog3")}</p>
        `;
        }

        showDialog(
            game.i18n.localize("pf2e-ranged-combat.module-name"),
            content,
            [
                {
                    action: "ok",
                    label: localize("buttonOK"),
                },
                {
                    action: "doNotShowAgain",
                    label: localize("buttonDoNotShowAgain"),
                    callback: () => game.settings.set("pf2e-ranged-combat", "doNotShowWarningAgain", true)
                }
            ]
        );
    }
}

export function getFlags(item) {
    return item.flags["pf2e-ranged-combat"];
}

export function getFlag(item, flagName) {
    return item.flags["pf2e-ranged-combat"]?.[flagName];
}

export function isUsingApplicationV2() {
    return foundry.utils.isNewerVersion(game.version, "13");
}
