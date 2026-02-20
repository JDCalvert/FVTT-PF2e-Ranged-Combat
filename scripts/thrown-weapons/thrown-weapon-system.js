import { AuxiliaryActions } from "./auxiliary-actions.js";
import { initialiseCarryTypeHandler } from "./change-carry-type.js";
import { initialiseThrownWeaponCheck } from "./throw-weapon-check.js";
import { initialiseThrownWeaponHandler } from "./throw-weapon-handler.js";

export class AdvancedThrownWeaponSystem {
    static initialise() {
        initialiseCarryTypeHandler()
        initialiseThrownWeaponCheck();
        initialiseThrownWeaponHandler();

        AuxiliaryActions.initialise();
    }
}
