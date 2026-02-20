import { Item, Weapon } from "../weapons/types.js";
import { showDialog } from "./dialog.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.utils." + key);

export class Util {
    /**
     * @param {string} key 
     * @param {object} params?
     */
    static localize(key, params) {
        return game.i18n.format(`pf2e-ranged-combat.${key}`, params);
    }

    /**
     * Find a single controlled actor, either from an open character sheet, selected token, or owned actor. 
     * 
     * @returns {ActorPF2e | null}
     */
    static getControlledActor() {
        /** @type ActorPF2e[] */
        const sheetActors = Object.values(ui.windows).map(window => window.actor).filter(actor => !!actor);
        if (sheetActors.length === 1) {
            return sheetActors[0];
        }

        return getControlledActorAndToken().actor;
    }

    /**
     * @param {ActorPF2e} actor 
     */
    static getPreferredName(actor) {
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
     * Find an effect on the weapon's actor with the given sourceId that is for this weapon
     * 
     * @param {Weapon} weapon
     * @param {string} sourceId
     */
    static getEffect(weapon, sourceId) {
        return weapon.actor.itemTypes.effect.find(
            effect =>
                effect.sourceId === sourceId &&
                (getFlag(effect, "targetId") === weapon.id || effect.flags.pf2e.rulesSelections.weapon === weapon.id) &&
                !effect.isExpired
        );
    }

    /**
     * @param {string} sourceId 
     * @returns {Promise<ItemPF2eSource>}
     */
    static async getSource(sourceId) {
        const source = (await fromUuid(sourceId)).toObject();
        foundry.utils.mergeObject(
            source,
            {
                _id: foundry.utils.randomID(),
                flags: {
                    core: {
                        sourceId: sourceId
                    }
                }
            }
        );
        return source;
    }

    /**
     * Set the given item as the effect's targeted item
     * 
     * @param {ItemPF2eSource} effectSource 
     * @param {Item} item 
     * @param {boolean} adjustName 
     */
    static setEffectTarget(effectSource, item, adjustName = true) {
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

    /**
     * @param {string} message 
     */
    static info(message) {
        if (CONFIG.pf2eRangedCombat.silent) {
            return;
        }

        ui.notifications.info(message);
    }

    /**
     * @param {string} message 
     */
    static warn(message) {
        if (CONFIG.pf2eRangedCombat.silent) {
            return;
        }

        if (game.settings.get("pf2e-ranged-combat", "doNotShowWarningAgain")) {
            ui.notifications.warn(message);
        } else {
            let content;
            if (isUsingApplicationV2()) {
                content = `
            <p>
                ${localize("warningDialog1")} ${message}
                <br><br>
                ${localize("warningDialog2")} 
                ${localize("warningDialog3")}
            </p>
        `;
            } else {
                content = `
            <p>${localize("warningDialog1")} ${message}<p>
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

    static isUsingApplicationV2() {
        return foundry.utils.isNewerVersion(game.version, "13");
    }

    /**
     * @param {FlagItem} item 
     */
    static getFlags(item) {
        return item.flags["pf2e-ranged-combat"];
    }

    /**
     * @param {FlagItem} item 
     * @param {string} flagName 
     */
    static getFlag(item, flagName) {
        return item.flags["pf2e-ranged-combat"]?.[flagName];
    }
}

/**
 * Find a single controlled actor, either from an open character sheet, selected token, or owned actor.
 */
export function getControlledActor() {
    return Util.getControlledActor();
}

/**
 * Find a single controlled actor and token.
 * 
 * - If there is exactly one token selected, return that token and its actor
 * - If there are no tokens selected, but the user has an owned actor with one token in the scene, return that actor and token
 * - Otherwise, show a warning and return an empty object
 * 
 * @returns {{actor: ActorPF2e, token: TokenPF2e}|{actor: null, token: null}}
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
 * Find a non-stowed item on the actor, preferably matching the passed item ID, but fall back on an item
 * with the same source ID if one cannot be found.
 * 
 * @param {ActorPF2e} actor
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
 * @param {ActorPF2e} actor
 * @param {string} sourceId
 */
export function getItemFromActor(actor, sourceId) {
    return actor.items.find(item => item.sourceId === sourceId);
}

/**
 * Get an effect currently on the actor with the specified source ID and target
 * 
 * @param {ActorPF2e} actor
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
 * @param {ActorPF2e} actor 
 * @returns {boolean}
 */
export function isInCombat(actor) {
    return actor.getActiveTokens().some(token => token.inCombat);
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
 * @param {ActorPF2e} actor
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

/**
 * @param {string} warningMessage 
 */
export function showWarning(warningMessage) {
    Util.warn(warningMessage);
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

/**
 * Version 7.7 of the system implements its own ammunition system, which is incompatible with the module's system.
 * 
 * @param {ActorPF2e} actor 
 */
export function isUsingSystemAmmunitionSystem(actor) {
    if (actor.type === "character") {
        return foundry.utils.isNewerVersion(game.system.version, "7.7");
    } else {
        return false;
    }
}
