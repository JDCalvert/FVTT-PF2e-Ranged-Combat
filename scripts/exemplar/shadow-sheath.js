import { AuxiliaryActionHookParams, buildAuxiliaryAction } from "../core/auxiliary-actions.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { Util } from "../utils/utils.js";
import { Exemplar } from "./exemplar.js";

const SHADOW_SHEATH_IKON_ID = "Compendium.pf2e.classfeatures.Item.ktgzHtKoeUZ5H8KA";
const SHADOW_SHEATH_WEAPON_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.je3lgJso1WmyC81w";

export class ShadowSheath {
    /**
     * @param {string} key 
     * @param {object} data
     * @returns {string}
     */
    static localize(key, data) {
        return Exemplar.localize(`shadowSheath.${key}`, data);
    }

    static initialise() {
        HookManager.register(
            "auxiliary-actions",
            /**
             * @param {AuxiliaryActionHookParams} args
             */
            (args) => {
                const { actor, pf2eWeapon: weapon, auxiliaryActions } = args;

                // Check the actor has the Shadow Sheath ikon
                if (!Util.getItem(actor, SHADOW_SHEATH_IKON_ID)) {
                    return;
                }

                // Check this weapon is compatible with Shadow Sheath
                if (!isCompatibleWeapon(weapon)) {
                    return;
                }


                if (Util.getEffectFromActor(weapon.actor, SHADOW_SHEATH_WEAPON_EFFECT_ID, weapon.id, "shadowSheathWeapon")) {
                    
                } else {
                    // If the weapon is not currently in the Shadow Sheath, add an action to put it in
                    auxiliaryActions.push(
                        buildAuxiliaryAction(
                            weapon,
                            ShadowSheath.localize("load"),
                            "",
                            30,
                            "",
                            2,
                            async () => {
                                const updates = new Updates(actor);

                                // Remove any existing Shadow Sheath weapon designation
                                const shadowSheathEffect = Util.getItem(actor, SHADOW_SHEATH_WEAPON_EFFECT_ID);
                                if (shadowSheathEffect) {
                                    updates.delete(shadowSheathEffect);
                                }

                                // Create the new designation
                                const shadowSheathEffectSource = await Util.getSource(SHADOW_SHEATH_WEAPON_EFFECT_ID);
                                Util.setEffectTarget(shadowSheathEffectSource, weapon, true, "shadowSheathWeapon");
                                updates.create(shadowSheathEffectSource);

                                updates.commit();
                            }
                        )
                    );
                }
            }
        );
    }
}

/**
 * Check if the weapon is compatible with Shadow Sheath
 * 
 * @param {WeaponPF2e} weapon
 * @returns {boolean}
 */
function isCompatibleWeapon(weapon) {
    // Must be a thrown weapon
    if (!Array.from(weapon.system.traits.value).some(trait => trait.startsWith("thrown"))) {
        return false;
    }

    // Must be one-handed
    if (weapon.hands !== "1") {
        return false;
    }

    // Must be light bulk or less
    if (!(weapon.bulk.isLight || weapon.bulk.isNegligible)) {
        return false;
    }

    return true;
}
