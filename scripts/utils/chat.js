import { postToChatConfig } from "../pf2e-ranged-combat.js";
import { Util } from "./utils.js";

/**
 * @typedef {Object} ChatMessageParams
 * @prop {string} [actionName]
 * @prop {string} [actionSymbol]
 * @prop {string} [img]
 * @prop {string} [link]
 
 * @prop {string[]} [traits]
 */

export class Chat {
    /**
     * @param {ChatMessageParams} original
     * @param {ChatMessageParams} other
     * 
     * @returns {ChatMessageParams}
     */
    static mergeParams(original, other) {
        if (!original) {
            return other;
        } else if (!other) {
            return original;
        }

        return {
            actionName: other.actionName ?? original.actionName,
            actionSymbol: other.actionSymbol ?? original.actionSymbol,
            img: other.img ?? original.img,
            link: other.link ?? original.link,
            traits: [...new Set([...(original.traits ?? []), ...(other.traits ?? [])])]
        };
    }

    /**
     * @param {ItemPF2e} action
     */
    static async postAction(action) {
        if (game.settings.get("pf2e-ranged-combat", "postActionToChat") == postToChatConfig.full) {
            CONFIG.pf2eRangedCombat.chatHook = false;
            await action.toMessage();
            CONFIG.pf2eRangedCombat.chatHook = true;
        }
    }

    /**
     * 
     * @param {ActorPF2e} actor 
     * @param {string} img 
     * @param {string} message 
     * @param {ChatMessageParams} params
     */
    static async postInteract(actor, img, message, params) {
        if (game.settings.get("pf2e-ranged-combat", "postActionToChat")) {
            Chat.postMessage(
                actor,
                img,
                message,
                Chat.mergeParams(
                    {
                        actionName: game.i18n.localize("PF2E.Actions.Interact.Title"),
                        traits: ["manipulate"]
                    },
                    params
                )
            );
        }
    }

    /**
     * Post a message to chat saying that something happened, only if the postActionToChat option is enabled.
     * 
     * @param {ActorPF2e} actor 
     * @param {string} img 
     * @param {string} message 
     * @param {ChatMessageParams} [params]
     */
    static async post(actor, img, message, params) {
        if (game.settings.get("pf2e-ranged-combat", "postActionToChat")) {
            Chat.postMessage(actor, img, message, params);
        }
    }

    /**
     * Post a message to chat saying that something happened
     * 
     * @param {ActorPF2e} actor 
     * @param {string} img 
     * @param {string} message 
     * @param {ChatMessageParams} params 
     */
    static async postMessage(actor, img, message, params = {}) {
        const flavor = await Chat.render(
            "./systems/pf2e/templates/chat/action/flavor.hbs",
            {
                action: {
                    title: params.actionName || "",
                    glyph: params.actionSymbol || ""
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

        const content = await Chat.render(
            "./systems/pf2e/templates/chat/action/content.hbs",
            {
                imgPath: params.img ?? img,
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

    /**
     * @param {string} path 
     * @param {object} data 
     * 
     * @returns {Promise<string>}
     */
    static async render(path, data) {
        if (Util.isUsingApplicationV2()) {
            return foundry.applications.handlebars.renderTemplate(path, data);
        } else {
            return renderTemplate(path, data);
        }
    }
}
