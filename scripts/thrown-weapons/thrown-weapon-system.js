import { AuxiliaryActions } from "./auxiliary-actions.js";
import { CarryTypeProcessor } from "./change-carry-type.js";
import { ThrownWeaponCheck } from "./throw-weapon-check.js";
import { ThrownWeaponProcessor } from "./throw-weapon-processor.js";

export class AdvancedThrownWeaponSystem {
    static initialise() {
        AuxiliaryActions.initialise();
        CarryTypeProcessor.initialise();
        
        ThrownWeaponCheck.initialise();
        ThrownWeaponProcessor.initialise();
    }
}
