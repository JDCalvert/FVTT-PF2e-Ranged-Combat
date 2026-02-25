/**
 * @enum {number}
 */
export const ChatLevel = {
    none: 0,
    simple: 1,
    full: 2
};

const localize = (path) => game.i18n.localize(`pf2e-ranged-combat.config.category.${path}`);

export class Configuration {
    /**
     * @param {string} key 
     * @returns {string}
     */
    static localize(key) {
        return game.i18n.localize(`pf2e-ranged-combat.config.${key}`);
    }

    static initialise() {
        game.settings.register(
            "pf2e-ranged-combat",
            "schemaVersion",
            {
                name: Configuration.localize("schemaVersion.name"),
                hint: Configuration.localize("schemaVersion.hint"),
                scope: "world",
                config: false,
                type: Number,
                default: null
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "postActionToChat",
            {
                name: Configuration.localize("postActionToChat.name"),
                hint: Configuration.localize("postActionToChat.hint"),
                scope: "world",
                config: true,
                type: Number,
                choices: {
                    0: Configuration.localize("postToChat.none"),
                    1: Configuration.localize("postToChat.simple"),
                    2: Configuration.localize("postToChat.full")
                },
                default: ChatLevel.simple
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "postAmmunitionToChat",
            {
                name: Configuration.localize("postAmmunitionToChat.name"),
                hint: Configuration.localize("postAmmunitionToChat.hint"),
                scope: "world",
                config: true,
                type: Number,
                choices: {
                    0: Configuration.localize("postToChat.none"),
                    1: Configuration.localize("postToChat.simple"),
                    2: Configuration.localize("postToChat.full")
                },
                default: ChatLevel.simple
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "requiredPermissionToShowMessages",
            {
                name: Configuration.localize("requiredPermissionToShowMessages.name"),
                hint: Configuration.localize("requiredPermissionToShowMessages.hint"),
                scope: "world",
                config: true,
                type: Number,
                choices: {
                    0: game.i18n.localize("OWNERSHIP.NONE"),
                    1: game.i18n.localize("OWNERSHIP.LIMITED"),
                    2: game.i18n.localize("OWNERSHIP.OBSERVER"),
                    3: game.i18n.localize("OWNERSHIP.OWNER")
                },
                default: 0
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "preventFireNotLoaded",
            {
                name: Configuration.localize("preventFireNotLoaded.name"),
                hint: Configuration.localize("preventFireNotLoaded.hint"),
                scope: "world",
                config: !Configuration.isPlayerCharactersUsingSubItemAmmunitionSystem(),
                type: Boolean,
                default: true
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "advancedAmmunitionSystemPlayer",
            {
                name: Configuration.localize("advancedAmmunitionSystemPlayer.name"),
                hint: Configuration.localize("advancedAmmunitionSystemPlayer.hint"),
                scope: "world",
                config: !Configuration.isPlayerCharactersUsingSubItemAmmunitionSystem(),
                type: Boolean,
                default: true
            }
        );


        game.settings.register(
            "pf2e-ranged-combat",
            "preventFireNotLoadedNPC",
            {
                name: Configuration.localize("preventFireNotLoaded.name"),
                hint: Configuration.localize("preventFireNotLoaded.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: false
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "ammunitionEffectsEnable",
            {
                name: game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.effect.config.enable.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.effect.config.enable.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: true
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "ammunitionEffectsWarningLevel",
            {
                name: game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.effect.config.warningLevel.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.effect.config.warningLevel.hint"),
                scope: "client",
                config: true,
                type: Number,
                choices: {
                    0: Configuration.localize("postToChat.none"),
                    1: Configuration.localize("postToChat.simple"),
                    2: Configuration.localize("postToChat.full")
                },
                default: ChatLevel.full
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "advancedThrownWeaponSystemPlayer",
            {
                name: Configuration.localize("advancedThrownWeaponSystemPlayer.name"),
                hint: Configuration.localize("advancedThrownWeaponSystemPlayer.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: true
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "fakeOutDC",
            {
                name: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.dc.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.dc.hint"),
                scope: "world",
                config: true,
                type: Number,
                choices: {
                    15: "15",
                    20: "20",
                    0: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.dc.enemyDC")
                },
                default: 15
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "fakeOutFireWeapon",
            {
                name: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.fireWeapon.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.fireWeapon.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: false
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "hideTokenIcons",
            {
                name: Configuration.localize("hideTokenIcons.name"),
                hint: Configuration.localize("hideTokenIcons.hint"),
                scope: "client",
                config: true,
                type: Boolean,
                default: false
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "doNotShowWarningAgain",
            {
                name: "",
                default: false,
                type: Boolean,
                scope: "client",
                config: false
            }
        );

        Hooks.on(
            "renderSettingsConfig",
            (_, html) => {
                let headerTemplate;
                let htmlFind;
                if (Configuration.isUsingApplicationV2()) {
                    headerTemplate = (headerName, desc = "") => {
                        const doc = html.ownerDocument;

                        const header = doc.createElement("h3");
                        header.style["text-align"] = "center";
                        header.appendChild(doc.createTextNode(headerName));

                        const description = doc.createElement("div");
                        description.innerHTML = desc;

                        const div = doc.createElement("div");
                        div.style.border = "1px solid #a1a1a1";
                        div.style.padding = "10px";
                        div.style["text-align"] = "justify";

                        div.appendChild(header);
                        div.appendChild(description);

                        return div;
                    };
                    htmlFind = (name) => html.querySelector(`[id="settings-config-${name}"]`);
                } else {
                    headerTemplate = (headerName, desc = "") => `
                    <div style="border: 1px solid #a1a1a1; padding: 10px; text-align: justify;">
                        <h3 style="text-align: center;">${headerName}</h3>
                        ${desc}
                    </div>
                `;
                    htmlFind = (name) => html.find(`div[data-setting-id="${name}"]`);
                }


                htmlFind("pf2e-ranged-combat.postActionToChat")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            localize("chatControls.header"),
                            `
                            <p class="notes">${localize("chatControls.description.main")}</p>
                            <ul class="notes">
                                <li>${localize("chatControls.description.full")}</li>
                                <li>${localize("chatControls.description.simple")}</li>
                                <li>${localize("chatControls.description.none")}</li>
                            </ul>
                        `
                        )
                    );

                htmlFind("pf2e-ranged-combat.preventFireNotLoaded")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            localize("ammunitionSystemPlayer.header"),
                            `<p class="notes">${localize("ammunitionSystemPlayer.description")}</p>`,
                        )
                    );

                htmlFind("pf2e-ranged-combat.preventFireNotLoadedNPC")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            localize("ammunitionSystemNPC.header"),
                            `
                            <p class="notes">${localize("ammunitionSystemNPC.description.line1")}</p>
                            <p class="notes">${localize("ammunitionSystemNPC.description.line2")}</p>
                        `,
                        )
                    );

                htmlFind("pf2e-ranged-combat.ammunitionEffectsEnable")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            localize("ammunitionEffects.header"),
                            `<p class="notes">${localize("ammunitionEffects.description")}</p>`,
                        )
                    );

                htmlFind("pf2e-ranged-combat.advancedThrownWeaponSystemPlayer")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            localize("advancedThrownWeaponSystem.header"),
                            `
                            <p class="notes">${localize("advancedThrownWeaponSystem.description.line1")}</p>
                            <p class="notes">${localize("advancedThrownWeaponSystem.description.line2")}</p>
                        `,
                        )
                    );

                htmlFind("pf2e-ranged-combat.fakeOutDC")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.name"),
                            `
                            <p class="notes">${game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.description")}
                        `
                        )
                    );

                htmlFind("pf2e-ranged-combat.hideTokenIcons")
                    ?.closest(".form-group")
                    ?.before(
                        headerTemplate(
                            localize("miscellaneous.header"),
                            `<p class="notes">${localize("miscellaneous.description")}</p>`,
                        )
                    );
            }
        );
    }

    static isUsingApplicationV2() {
        return foundry.utils.isNewerVersion(game.version, "13");
    }

    /**
     * @returns {boolean}
     */
    static isPlayerCharactersUsingSubItemAmmunitionSystem() {
        return foundry.utils.isNewerVersion(game.system.version, "7.7");
    }

    /**
     * Version 7.7 of the system marks the first implementation of the sub-item ammunition system, only used for player characters.
     * 
     * @param {ActorPF2e} actor 
     * @returns {boolean}
     */
    static isUsingSubItemAmmunitionSystem(actor) {
        if (actor.type === "character") {
            return this.isPlayerCharactersUsingSubItemAmmunitionSystem();
        } else {
            return false;
        }
    }


    /**
     * @param {string} setting
     */
    static getSetting(setting) {
        return game.settings.get("pf2e-ranged-combat", setting);
    }
}
