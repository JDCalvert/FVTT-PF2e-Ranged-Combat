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
                name: game.i18n.localize("pf2e-ranged-combat.config.schema-version.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.schema-version.hint"),
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
                name: game.i18n.localize("pf2e-ranged-combat.config.post-full-action.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.post-full-action.hint"),
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
                name: game.i18n.localize("pf2e-ranged-combat.config.post-full-ammunition.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.post-full-ammunition.hint"),
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
                name: game.i18n.localize("pf2e-ranged-combat.config.prevent-fire.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.prevent-fire.hint"),
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
                name: game.i18n.localize("pf2e-ranged-combat.config.advanced-ammunition.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.advanced-ammunition.hint"),
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
                name: game.i18n.localize("pf2e-ranged-combat.config.advanced-thrown-weapon.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.advanced-thrown-weapon.hint"),
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
                name: game.i18n.localize("pf2e-ranged-combat.config.required-permission.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.required-permission.hint"),
                scope: "world",
                config: true,
                type: Number,
                choices: {
                    0: game.i18n.localize("pf2e-ranged-combat.config.required-permission.none"),
                    1: game.i18n.localize("pf2e-ranged-combat.config.required-permission.limited"),
                    2: game.i18n.localize("pf2e-ranged-combat.config.required-permission.observer"),
                    3: game.i18n.localize("pf2e-ranged-combat.config.required-permission.owner")
                },
                default: 0
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "hideTokenIcons",
            {
                name: game.i18n.localize("pf2e-ranged-combat.config.hide-token.name"),
                hint: game.i18n.localize("pf2e-ranged-combat.config.hide-token.hint"),
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
