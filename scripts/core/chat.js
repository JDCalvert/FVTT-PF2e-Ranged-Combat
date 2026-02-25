import { Configuration } from "../config/config.js";
import { HookManager } from "../hook-manager/hook-manager.js";

export class ChatCore {
    static initialise() {
        /** @type string */
        let renderChatMessageHookName;

        /** @type {(html: any, className: string) => void} */
        let addClass;

        if (Configuration.isUsingApplicationV2()) {
            renderChatMessageHookName = "renderChatMessageHTML";
            addClass = (html, className) => html.classList.add(className);
        } else {
            renderChatMessageHookName = "renderChatMessage";
            addClass = (html, className) => html.addClass(className);
        }

        /**
         * When rendering a chat message sent by this module, give it the "hide" class
         * if the current user doesn't have the required permission level
         */
        Hooks.on(
            renderChatMessageHookName,
            (message, html) => {
                const flags = message.flags["pf2e-ranged-combat"];
                if (!flags) {
                    return;
                }

                addClass(html, "pf2e-ranged-combat");

                const actorId = flags.actorId;
                const actor = game.actors.find(actor => actor.id === actorId);
                if (actor) {
                    const hasPermission = actor.testUserPermission(game.user, game.settings.get("pf2e-ranged-combat", "requiredPermissionToShowMessages"));
                    if (!hasPermission) {
                        addClass(html, "hide");
                    }
                }
            }
        );

        /**
         * When rendering the chat log, remove any messages with the "pf2e-ranged-combat" and "hide" classes.
         * Also listen for new messages and remove any with the same conditions
         */
        if (Configuration.isUsingApplicationV2()) {
            Hooks.on(
                "renderChatLog",
                (_0, html) => {
                    const chatLog = html.querySelector(".chat-log");
                    const rangedCombatMessages = chatLog.querySelectorAll(".message.pf2e-ranged-combat");

                    for (const message of rangedCombatMessages) {
                        for (const element of message.querySelectorAll(".hide")) {
                            element.remove();
                        }
                    }

                    const observer = new MutationObserver(
                        (mutationList) => {
                            for (const mutation of mutationList) {
                                for (const node of mutation.addedNodes) {
                                    node.querySelector(".pf2e-ranged-combat")?.querySelector(".hide")?.remove();
                                }
                            }
                        }
                    );
                    observer.observe(chatLog, { childList: true });
                }
            );
        } else {
            Hooks.on(
                "renderChatLog",
                ({ }, html) => {
                    const chatLog = html.find("#chat-log");
                    const rangedCombatMessages = chatLog.find(".message.pf2e-ranged-combat");
                    rangedCombatMessages.filter(".hide").remove();

                    const observer = new MutationObserver(
                        (mutationList) => {
                            for (const mutation of mutationList) {
                                if (mutation.addedNodes.length === 0) {
                                    continue;
                                }

                                // @ts-ignore
                                $(mutation.addedNodes)
                                    .filter(".pf2e-ranged-combat")
                                    .filter(".hide")
                                    .remove();
                            }
                        }
                    );
                    observer.observe(chatLog[0], { childList: true });
                }
            );
        }

        /**
         * When we post a message for an item, check for anything that will trigger on it. If a trigger is found, do not post the post the message (the trigger
         * will post it instead, if necessary).
         */
        Hooks.on(
            "preCreateChatMessage",
            message => {
                if (!CONFIG.pf2eRangedCombat.chatHook) {
                    return true;
                }

                const actor = message.actor;
                if (!actor) {
                    return true;
                }

                const item = message.item;
                if (!item) {
                    return true;
                }

                const result = { match: false };

                HookManager.call("post-action", /** @type {PostActionHookData} */({ actor, item, result }));

                return !result.match;
            }
        );
    }
}

