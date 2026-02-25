import { AlchemicalCrossbow } from "./actions/alchemical-crossbow.js";
import { ClearJam } from "./ammunition-system/actions/clear-jam.js";
import { ConsolidateAmmunition } from "./ammunition-system/actions/consolidate-ammunition.js";
import { NextChamber } from "./ammunition-system/actions/next-chamber.js";
import { Reload } from "./ammunition-system/actions/reload.js";
import { SwitchAmmunition } from "./ammunition-system/actions/switch-ammunition.js";
import { Unload } from "./ammunition-system/actions/unload.js";
import { AmmunitionHandlingSystem } from "./ammunition-system/ammunition-system.js";
import { Configuration } from "./config/config.js";
import { ChatCore } from "./core/chat.js";
import { Core } from "./core/core.js";
import { AlchemicalShot } from "./feats/alchemical-shot.js";
import { CrossbowAce } from "./feats/crossbow-ace.js";
import { CrossbowCrackShot } from "./feats/crossbow-crack-shot.js";
import { FakeOut } from "./feats/fake-out.js";
import { RiskyReload } from "./feats/risky-reload.js";
import { SwordAndPistol } from "./feats/sword-and-pistol.js";
import { huntPrey } from "./hunt-prey/hunt-prey.js";
import { initialiseHuntPrey } from "./hunt-prey/hunted-prey-hook.js";
import { linkCompanion } from "./hunt-prey/link-companion.js";
import { NPCWeaponConfiguration } from "./npc-weapon-system/npc-weapon-system.js";
import { AdvancedThrownWeaponSystem as ThrownWeaponSystem } from "./thrown-weapons/thrown-weapon-system.js";
import { runMigrations } from "./utils/migrations/migration.js";

Hooks.on(
    "init",
    () => {
        CONFIG.pf2eRangedCombat = {
            silent: false,
            chatHook: true
        };

        // Main drivers of the module
        Configuration.initialise();
        Core.initialise();
        ChatCore.initialise();

        // Ammunition and Thrown Weapon systems
        AmmunitionHandlingSystem.initialise();
        ThrownWeaponSystem.initialise();

        // Hunt Prey
        initialiseHuntPrey();

        // Feats
        AlchemicalShot.initialise();
        CrossbowAce.initialise();
        CrossbowCrackShot.initialise();
        FakeOut.initialise();
        RiskyReload.initialise();
        SwordAndPistol.initialise();

        // Other actions
        AlchemicalCrossbow.initialise();

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
            loadAlchemicalCrossbow: AlchemicalCrossbow.load,
            unloadAlchemicalCrossbow: AlchemicalCrossbow.unload,
            alchemicalShot: AlchemicalShot.action,
            npcWeaponConfiguration: NPCWeaponConfiguration.show
        };
    }
);

Hooks.on(
    "ready",
    () => {
        runMigrations();
    }
);
