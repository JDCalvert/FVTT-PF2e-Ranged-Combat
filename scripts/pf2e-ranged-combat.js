import { initialiseAlchemicalCrossbow, loadAlchemicalCrossbow, unloadAlchemicalCrossbow } from "./actions/alchemical-crossbow.js";
import { alchemicalShot, initialiseAlchemicalShot } from "./actions/alchemical-shot.js";
import { initialiseAdvancedWeaponSystem } from "./advanced-weapon-system/initialise.js";
import { conjureBullet } from "./ammunition-system/actions/conjure-bullet.js";
import { consolidateRepeatingWeaponAmmunition } from "./ammunition-system/actions/consolidate-ammunition.js";
import { nextChamber } from "./ammunition-system/actions/next-chamber.js";
import { reloadMagazine } from "./ammunition-system/actions/reload-magazine.js";
import { fullyReload, reload, reloadNPCs } from "./ammunition-system/actions/reload.js";
import { switchAmmunition } from "./ammunition-system/actions/switch-ammunition.js";
import { unload } from "./ammunition-system/actions/unload.js";
import { initialiseAmmunitionEffects } from "./ammunition-system/ammunition-effects.js";
import { initialiseFireWeaponCheck } from "./ammunition-system/fire-weapon-check.js";
import { initialiseFireWeaponHandler } from "./ammunition-system/fire-weapon-handler.js";
import { initialiseChatMessageHooks } from "./chat-message-hook.js";
import { initialiseCrossbowAce } from "./feats/crossbow-ace.js";
import { initialiseCrossbowCrackShot } from "./feats/crossbow-crack-shot.js";
import { initialiseFakeOut } from "./feats/fake-out.js";
import { initialiseSwordAndPistol } from "./feats/sword-and-pistol.js";
import { huntPrey } from "./hunt-prey/hunt-prey.js";
import { initialiseHuntPrey } from "./hunt-prey/hunted-prey-hook.js";
import { linkCompanion } from "./hunt-prey/link-companion.js";
import { npcWeaponConfiguration } from "./npc-weapon-system/npc-weapon-system.js";
import { initialiseCarryTypeHandler } from "./thrown-weapons/change-carry-type.js";
import { initialiseThrownWeaponCheck } from "./thrown-weapons/throw-weapon-check.js";
import { initialiseThrownWeaponHandler } from "./thrown-weapons/throw-weapon-handler.js";
import { runMigrations } from "./utils/migrations/migration.js";

export const postToChatConfig = {
    none: 0,
    simple: 1,
    full: 2
};

Hooks.on(
    "init",
    () => {
        CONFIG.pf2eRangedCombat = {
            silent: false,
            chatHook: true
        };

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
            "fakeOutDC",
            {
                name: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.config.dc.name"),
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
            "doNotShowWarningAgain",
            {
                name: "",
                default: false,
                type: Boolean,
                scope: "client",
                config: false
            }
        );

        initialiseAdvancedWeaponSystem();
        initialiseHuntPrey();
        initialiseChatMessageHooks();

        initialiseFireWeaponCheck();
        initialiseThrownWeaponCheck();

        initialiseFireWeaponHandler();
        initialiseThrownWeaponHandler();
        initialiseCarryTypeHandler();

        initialiseAmmunitionEffects();
        initialiseCrossbowCrackShot();
        initialiseCrossbowAce();
        initialiseAlchemicalCrossbow();
        initialiseAlchemicalShot();
        initialiseSwordAndPistol();
        initialiseFakeOut();

        game.pf2eRangedCombat = {
            reload,
            unload,
            switchAmmunition,
            nextChamber,
            conjureBullet,
            reloadMagazine,
            reloadNPCs,
            fullyReload,
            consolidateRepeatingWeaponAmmunition,
            huntPrey,
            linkCompanion,
            loadAlchemicalCrossbow,
            unloadAlchemicalCrossbow,
            alchemicalShot,
            npcWeaponConfiguration
        };
    }
);

Hooks.on(
    "ready",
    () => {
        runMigrations();
    }
);
