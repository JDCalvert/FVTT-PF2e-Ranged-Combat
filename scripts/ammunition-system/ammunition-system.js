import { isUsingSystemAmmunitionSystem } from "../utils/utils.js";
import { initialiseAmmunitionEffects } from "./ammunition-effects.js";
import { initialiseAuxiliaryActions } from "./auxiliary-actions.js";
import { initialiseFireWeaponCheck } from "./fire-weapon-check.js";
import { initialiseFireWeaponHandler } from "./fire-weapon-handler.js";

export function initialiseAmmunitionSystem() {
    if (isUsingSystemAmmunitionSystem()) {
        return;
    }

    initialiseFireWeaponCheck();
    initialiseFireWeaponHandler();
    initialiseAmmunitionEffects();
    initialiseAuxiliaryActions();
}
