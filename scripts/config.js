import { reload } from "./ammunition-system/actions/reload.js";
import { unload } from "./ammunition-system/actions/unload.js";
import { switchAmmunition } from "./ammunition-system/actions/switch-ammunition.js";
import { reloadNPCs } from "./ammunition-system/actions/reload.js";
import { nextChamber } from "./ammunition-system/actions/next-chamber.js";
import { conjureBullet } from "./ammunition-system/actions/conjure-bullet.js";
import { reloadMagazine } from "./ammunition-system/actions/reload-magazine.js";
import { fireBothBarrels } from "./ammunition-system/actions/fire-both-barrels.js";
import { consolidateRepeatingWeaponAmmunition } from "./ammunition-system/actions/consolidate-ammunition.js";
import { huntPrey } from "./hunt-prey/hunt-prey.js";
import { loadAlchemicalCrossbow, unloadAlchemicalCrossbow } from "./actions/alchemical-crossbow.js";
import { alchemicalShot } from "./actions/alchemical-shot.js";
import { runMigrations } from "./utils/migrations/migration.js";
import { npcWeaponConfiguration } from "./npc-weapon-system/npc-weapon-system.js";

Hooks.on(
    "init",
    () => {
        CONFIG.pf2eRangedCombat = {
            silent: false
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
            "postFullAction",
            {
                name: game.i18n.localize("pf2e-ranged-combat.config.postFullAction.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.postFullAction.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: true
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "postFullAmmunition",
            {
                name: game.i18n.localize("pf2e-ranged-combat.config.postFullAmmunition.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.postFullAmmunition.hint"),
                scope: "world",
                config: true,
                type: Boolean,
                default: false
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
            "doNotShowWarningAgain",
            {
                name: "",
                default: false,
                type: Boolean,
                scope: "client",
                config: false
            }
        );

        game.pf2eRangedCombat = {
            reload,
            unload,
            switchAmmunition,
            nextChamber,
            fireBothBarrels,
            conjureBullet,
            reloadMagazine,
            reloadNPCs,
            consolidateRepeatingWeaponAmmunition,
            huntPrey,
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
