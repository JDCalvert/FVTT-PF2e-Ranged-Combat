import { ClearJam } from "./actions/clear-jam.js";
import { AmmunitionEffects } from "./ammunition-effects.js";
import { AuxiliaryActions } from "./auxiliary-actions.js";
import { FireWeaponCheck } from "./fire-weapon-check.js";
import { FireWeaponProcessor } from "./fire-weapon-processor.js";

export class AmmunitionHandlingSystem {
    static initialise() {
        AuxiliaryActions.initialise();
        FireWeaponCheck.initalise();
        FireWeaponProcessor.initialise();
        AmmunitionEffects.initialise();

        ClearJam.initialise();
    }
}
