import { postToChatConfig } from "../pf2e-ranged-combat.js";
import { isUsingApplicationV2 } from "../utils/utils.js";

const localize = (path) => game.i18n.localize(`pf2e-ranged-combat.config.category.${path}`);

export function initialiseConfigurationSettings() {
    game.settings.register(
        "pf2e-ranged-combat",
        "schemaVersion",
        {
            name: game.i18n.localize("pf2e-ranged-combat.config.schemaVersion.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.schemaVersion.hint"),
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
            name: game.i18n.localize("pf2e-ranged-combat.config.postActionToChat.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.postActionToChat.hint"),
            scope: "world",
            config: true,
            type: Number,
            choices: {
                0: game.i18n.localize("pf2e-ranged-combat.config.postToChat.none"),
                1: game.i18n.localize("pf2e-ranged-combat.config.postToChat.simple"),
                2: game.i18n.localize("pf2e-ranged-combat.config.postToChat.full")
            },
            default: postToChatConfig.simple
        }
    );

    game.settings.register(
        "pf2e-ranged-combat",
        "postAmmunitionToChat",
        {
            name: game.i18n.localize("pf2e-ranged-combat.config.postAmmunitionToChat.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.postAmmunitionToChat.hint"),
            scope: "world",
            config: true,
            type: Number,
            choices: {
                0: game.i18n.localize("pf2e-ranged-combat.config.postToChat.none"),
                1: game.i18n.localize("pf2e-ranged-combat.config.postToChat.simple"),
                2: game.i18n.localize("pf2e-ranged-combat.config.postToChat.full")
            },
            default: postToChatConfig.simple
        }
    );

    game.settings.register(
        "pf2e-ranged-combat",
        "requiredPermissionToShowMessages",
        {
            name: game.i18n.localize("pf2e-ranged-combat.config.requiredPermissionToShowMessages.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.requiredPermissionToShowMessages.hint"),
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
            name: game.i18n.localize("pf2e-ranged-combat.config.preventFireNotLoaded.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.preventFireNotLoaded.hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true
        }
    );

    game.settings.register(
        "pf2e-ranged-combat",
        "advancedAmmunitionSystemPlayer",
        {
            name: game.i18n.localize("pf2e-ranged-combat.config.advancedAmmunitionSystemPlayer.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.advancedAmmunitionSystemPlayer.hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true
        }
    );


    game.settings.register(
        "pf2e-ranged-combat",
        "preventFireNotLoadedNPC",
        {
            name: game.i18n.localize("pf2e-ranged-combat.config.preventFireNotLoaded.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.preventFireNotLoaded.hint"),
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
                0: game.i18n.localize("pf2e-ranged-combat.config.postToChat.none"),
                1: game.i18n.localize("pf2e-ranged-combat.config.postToChat.simple"),
                2: game.i18n.localize("pf2e-ranged-combat.config.postToChat.full")
            },
            default: postToChatConfig.full
        }
    );

    game.settings.register(
        "pf2e-ranged-combat",
        "advancedThrownWeaponSystemPlayer",
        {
            name: game.i18n.localize("pf2e-ranged-combat.config.advancedThrownWeaponSystemPlayer.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.advancedThrownWeaponSystemPlayer.hint"),
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
            name: game.i18n.localize("pf2e-ranged-combat.config.hideTokenIcons.name"),
            hint: game.i18n.localize("pf2e-ranged-combat.config.hideTokenIcons.hint"),
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
            if (isUsingApplicationV2()) {
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
