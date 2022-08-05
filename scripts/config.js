import { reload } from "./ammunition-system/actions/reload.js";
import { unload } from "./ammunition-system/actions/unload.js";
import { reloadAll } from "./ammunition-system/actions/reload.js";
import { nextChamber } from "./ammunition-system/actions/next-chamber.js";
import { conjureBullet } from "./ammunition-system/actions/conjure-bullet.js";
import { reloadMagazine } from "./ammunition-system/actions/reload-magazine.js";
import { fireBothBarrels } from "./ammunition-system/actions/fire-both-barrels.js";
import { consolidateRepeatingWeaponAmmunition } from "./ammunition-system/actions/consolidate-ammunition.js";
import { huntPrey } from "./hunt-prey/hunt-prey.js";
import { loadAlchemicalCrossbow, unloadAlchemicalCrossbow } from "./actions/alchemical-crossbow.js";
import { alchemicalShot } from "./actions/alchemical-shot.js";
import { runMigrations } from "./utils/migrations/migration.js";
import { mapNPCWeapons } from "./npc-weapon-system/npc-weapon-system.js";

Hooks.on(
    "init",
    () => {
        game.settings.register(
            "pf2e-ranged-combat",
            "schemaVersion",
            {
                name: "Schema Version",
                hint: "The current version of the data related to this module",
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
                name: "Post Full Action from Macros",
                hint: "When running macros that simulate taking actions, post the full action description to chat.",
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
                name: "Post Full Ammunition Description",
                hint: "When firing a ranged weapon, post the ammunition item to chat",
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
                name: "Prevent Firing Weapon if not Loaded",
                hint: "For weapons with a reload of at least 1, prevent attack rolls using that weapon unless you have the loaded effect for that weapon.",
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
                name: "Advanced Ammunition System (Player)",
                hint: "Track loaded ammunition for reloadable and repeating weapons. This overrides Prevent Firing Weapon if not Loaded.",
                scope: "world",
                config: true,
                type: Boolean,
                default: false
            }
        );

        game.settings.register(
            "pf2e-ranged-combat",
            "advancedThrownWeaponSystemPlayer",
            {
                name: "Advanced Thrown Weapon System (Player)",
                hint: "Handle thrown weapons being dropped after use, and require another weapon to be drawn before another attack.",
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
                name: "Minimum Permission to See Messages",
                hint: `Several functions of this module send messages to chat, for example Reloading.
                       This will hide those messages for players without the required permission over the actor performing the action.`,
                scope: "world",
                config: true,
                type: Number,
                choices: {
                    0: "None",
                    1: "Limited",
                    2: "Observer",
                    3: "Owner"
                },
                default: 0
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
            nextChamber,
            fireBothBarrels,
            conjureBullet,
            reloadMagazine,
            reloadAll,
            consolidateRepeatingWeaponAmmunition,
            huntPrey,
            loadAlchemicalCrossbow,
            unloadAlchemicalCrossbow,
            alchemicalShot,
            mapNPCWeapons
        };
    }
);

Hooks.on(
    "ready",
    () => {
        runMigrations();
    }
);
