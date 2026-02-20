import { AuxiliaryActions } from "./auxiliary-actions.js";
import { FireWeaponCheck } from "./fire-weapon-check.js";
import { FireWeaponProcessor } from "./fire-weapon-processor.js";

export class AmmunitionHandlingSystem {
    static initialise() {
        AuxiliaryActions.initialise();
        FireWeaponCheck.initalise();
        FireWeaponProcessor.initialise();
        //initialiseAmmunitionEffects();
    }
}
