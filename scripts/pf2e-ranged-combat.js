import { initialiseAlchemicalCrossbow, loadAlchemicalCrossbow, unloadAlchemicalCrossbow } from "./actions/alchemical-crossbow.js";
import { alchemicalShot, initialiseAlchemicalShot } from "./actions/alchemical-shot.js";
import { initialiseAdvancedWeaponSystem } from "./advanced-weapon-system/initialise.js";
import { clearJam, initialiseClearJam } from "./actions/clear-jam.js";
import { conjureBullet } from "./ammunition-system/actions/conjure-bullet.js";
import { consolidateRepeatingWeaponAmmunition } from "./ammunition-system/actions/consolidate-ammunition.js";
import { nextChamber } from "./ammunition-system/actions/next-chamber.js";
import { reloadMagazine } from "./ammunition-system/actions/reload-magazine.js";
import { fullyReload, reload, reloadNPCs } from "./ammunition-system/actions/reload.js";
import { switchAmmunition } from "./ammunition-system/actions/switch-ammunition.js";
import { unload } from "./ammunition-system/actions/unload.js";
import { initialiseAmmunitionSystem } from "./ammunition-system/ammunition-system.js";
import { initialiseChatMessageHooks } from "./chat-message-hook.js";
import { initialiseConfigurationSettings } from "./config/config.js";
import { initialiseCrossbowAce } from "./feats/crossbow-ace.js";
import { initialiseCrossbowCrackShot } from "./feats/crossbow-crack-shot.js";
import { initialiseFakeOut } from "./feats/fake-out.js";
import { initialiseRiskyReload } from "./feats/risky-reload.js";
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

        initialiseConfigurationSettings();

        initialiseClearJam();
        initialiseAmmunitionSystem();
        initialiseAdvancedWeaponSystem();
        initialiseHuntPrey();
        initialiseChatMessageHooks();

        initialiseThrownWeaponCheck();

        initialiseThrownWeaponHandler();
        initialiseCarryTypeHandler();

        initialiseCrossbowCrackShot();
        initialiseCrossbowAce();
        initialiseAlchemicalCrossbow();
        initialiseAlchemicalShot();
        initialiseSwordAndPistol();
        initialiseFakeOut();
        initialiseRiskyReload();

        game.pf2eRangedCombat = {
            reload,
            unload,
            clearJam,
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
