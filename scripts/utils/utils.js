import { Configuration } from "../config/config.js";
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
        // If we have one character sheet open, use that actor
        /** @type {ActorPF2e[]} */
        const sheetActors = Object.values(ui.windows).map(window => window.actor).filter(actor => !!actor);
        if (sheetActors.length === 1) {
            return sheetActors[0];
        }

        // If we have a single token controlled, use its actor
        const controlledTokens = canvas.tokens.controlled;
        if (controlledTokens.length) {
            if (controlledTokens.length === 1) {
                const actor = controlledTokens[0].actor;
                if (actor) {
                    return actor;
                }
            }
        }

        // If we have a character assigned, use that one
        const actor = game.user.character;
        if (actor) {
            return actor;
        }

        Util.warn(localize("singleCharacterSelected"));
        return null;
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
     * Get a specific item from the actor, identified by its source ID
     * 
     * @param {ActorPF2e} actor
     * @param {string} sourceId
     * 
     * @returns {ItemPF2e}
     */
    static getItem(actor, sourceId) {
        return actor.items.find(item => item.sourceId === sourceId);
    }

    /**
     * Find a non-stowed item on the actor, preferably matching the passed item ID, but fall back on an item
     * with the same source ID if one cannot be found.
     * 
     * @param {ActorPF2e} actor
     * @param {string} itemId 
     * @param {string} sourceId
     * 
     * @returns {ItemPF2e}
     */
    static findItem(actor, itemId, sourceId) {
        return actor.items.find(item => item.id === itemId)
            || actor.items.find(item => item.sourceId === sourceId);
    }

    /**
     * Find an effect on the weapon's actor with the given sourceId that is for this weapon
     * 
     * @param {Weapon} weapon
     * @param {string} sourceId
     */
    static getEffect(weapon, sourceId) {
        return Util.getEffectFromActor(weapon.actor, sourceId, weapon.id);
    }

    /**
     * Get an effect currently on the actor with the specified source ID and target
     * 
     * @param {ActorPF2e} actor
     * @param {string} sourceId
     * @param {string} targetId
     */
    static getEffectFromActor(actor, sourceId, targetId) {
        return actor.itemTypes.effect.find(effect =>
            effect.sourceId === sourceId
            && (Util.getFlag(effect, "targetId") === targetId || effect.flags.pf2e.rulesSelections.weapon === targetId)
            && !effect.isExpired
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
     * @param {EffectPF2eSource} effectSource
     * @param {string} choiceFlag 
     * @param {any} choiceValue 
     * @param {string} [label]
     */
    static setChoice(effectSource, choiceFlag, choiceValue, label = null) {
        if (label) {
            effectSource.name = `${effectSource.name} (${label})`;
        }

        foundry.utils.mergeObject(
            effectSource,
            {
                flags: {
                    pf2e: {
                        rulesSelections: {}
                    }
                }
            }
        );

        effectSource.flags.pf2e.rulesSelections[choiceFlag] = choiceValue;

        // Remove the ChoiceSet rule since we've already made it
        effectSource.system.rules.findSplice(rule => rule.key === "ChoiceSet" && rule.flag === choiceFlag);
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
            if (Configuration.isUsingApplicationV2()) {
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

    /**
     * If the actor doesn't have at least one token that's in combat, then a duration of 0 will be immediately expired
     * To prevent this, set the duration to 1 round
     * 
     * @param {ActorPF2e} actor
     * @param {EffectPF2eSource} effectSource
     */
    static ensureDuration(actor, effectSource) {
        if (!Util.isInCombat(actor) && effectSource.system.duration.value === 0) {
            effectSource.system.duration.value = 1;
        }
    }

    /**
     * Determine if the actor has some token that's in combat
     * 
     * @param {ActorPF2e} actor 
     * @returns {boolean}
     */
    static isInCombat(actor) {
        return actor.getActiveTokens().some(token => token.inCombat);
    }

    /**
     * @param {ItemPF2e} item 
     * @returns 
     */
    static getAttackPopout(item) {
        if (!item.actor) {
            return null;
        }

        return Object.values(item.actor.apps).find(window => window.constructor.name === "AttackPopout" && window.options.strikeItemId === item.id);
    }
}
