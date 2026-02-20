import { initialiseAlchemicalCrossbow, loadAlchemicalCrossbow, unloadAlchemicalCrossbow } from "./actions/alchemical-crossbow.js";
import { alchemicalShot, initialiseAlchemicalShot } from "./actions/alchemical-shot.js";
import { ClearJam } from "./actions/clear-jam.js";
import { ConsolidateAmmunition } from "./ammunition-system/actions/consolidate-ammunition.js";
import { NextChamber } from "./ammunition-system/actions/next-chamber.js";
import { Reload } from "./ammunition-system/actions/reload.js";
import { SwitchAmmunition } from "./ammunition-system/actions/switch-ammunition.js";
import { Unload } from "./ammunition-system/actions/unload.js";
import { AmmunitionHandlingSystem } from "./ammunition-system/ammunition-system.js";
import { initialiseChatMessageHooks } from "./chat-message-hook.js";
import { Configuration } from "./config/config.js";
import { Core } from "./core/core.js";
import { initialiseCrossbowAce } from "./feats/crossbow-ace.js";
import { initialiseCrossbowCrackShot } from "./feats/crossbow-crack-shot.js";
import { FakeOut } from "./feats/fake-out.js";
import { RiskyReload } from "./feats/risky-reload.js";
import { initialiseSwordAndPistol } from "./feats/sword-and-pistol.js";
import { huntPrey } from "./hunt-prey/hunt-prey.js";
import { initialiseHuntPrey } from "./hunt-prey/hunted-prey-hook.js";
import { linkCompanion } from "./hunt-prey/link-companion.js";
import { npcWeaponConfiguration } from "./npc-weapon-system/npc-weapon-system.js";
import { AdvancedThrownWeaponSystem } from "./thrown-weapons/thrown-weapon-system.js";
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

        Configuration.initialise();

        Core.initialise();
        AmmunitionHandlingSystem.initialise();
        ClearJam.initialise();

        initialiseHuntPrey();
        initialiseChatMessageHooks();

        // AdvancedThrownWeaponSystem.initialise();

        initialiseCrossbowCrackShot();
        initialiseCrossbowAce();
        initialiseAlchemicalCrossbow();
        initialiseAlchemicalShot();
        initialiseSwordAndPistol();

        FakeOut.initialise();
        RiskyReload.initialise();

        game.pf2eRangedCombat = {
            reload: Reload.action,
            unload: Unload.action,
            clearJam: ClearJam.action,
            switchAmmunition: SwitchAmmunition.action,
            nextChamber: NextChamber.action,
            reloadMagazine: Reload.actionMagazine,
            consolidateRepeatingWeaponAmmunition: ConsolidateAmmunition.action,
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
