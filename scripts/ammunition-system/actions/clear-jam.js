import { AuxiliaryActionHookParams } from "../../core/auxiliary-actions.js";
import { buildAuxiliaryAction } from "../../core/auxiliary-actions.js";
import { CLEAR_JAM_IMG, JAMMED_EFFECT_ID } from "../constants.js";
import { Chat } from "../../utils/chat.js";
import { HookManager } from "../../hook-manager/hook-manager.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { Weapon } from "../../weapons/types.js";
import { AmmunitionSystem, WeaponSystem } from "../../weapons/system.js";

export class ClearJam {
    /**
     * @param {string} key 
     * @param {object} data 
     * 
     * @return {string}
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`actions.clearJam.${key}`, data);
    }

    static initialise() {
        HookManager.register(
            "auxiliary-actions",
            /** @type {(args: AuxiliaryActionHookParams) => void} */
            (args) => {
                const { actor, weapon, pf2eWeapon, auxiliaryActions } = args;

                if (ClearJam.isJammed(weapon)) {
                    auxiliaryActions.push(
                        buildAuxiliaryAction(
                            pf2eWeapon,
                            ClearJam.localize("actionName"),
                            "interact",
                            1,
                            "1",
                            2,
                            async () => {
                                const updates = new Updates(actor);
                                await ClearJam.perform(weapon, updates);
                                updates.commit();
                            }
                        )
                    );
                }
            }
        );
    }

    /**
     * Check if the weapon is jammed
     * 
     * @param {Weapon} weapon
     */
    static isJammed(weapon) {
        return !!Util.getEffect(weapon, JAMMED_EFFECT_ID);
    }

    /**
     * Check if the weapon is jammed, showing a warning if it is.
     * 
     * @param {Weapon} weapon
     * @returns {boolean} true if the weapon is jammed
     */
    static checkJammed(weapon) {
        if (ClearJam.isJammed(weapon)) {
            Util.warn(AmmunitionSystem.localize("jammed.weaponJammed", { weapon: weapon.name }));
            return true;
        }

        return false;
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: ClearJam.isJammed
            },
            "generic",
            ClearJam.localize("warningNoJammedWeapons", { actor: Util.getPreferredName(actor) })
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);
        await ClearJam.perform(weapon, updates);
        updates.commit();
    }

    /**
     * @param {Weapon} weapon 
     * @param {Updates} updates 
     */
    static async perform(weapon, updates) {
        const jammedEffect = Util.getEffect(weapon, JAMMED_EFFECT_ID);
        if (jammedEffect) {
            updates.delete(jammedEffect);

            await Chat.postInteract(
                weapon.actor,
                CLEAR_JAM_IMG,
                ClearJam.localize("clearJamMessage", { actor: Util.getPreferredName(weapon.actor), weapon: weapon.name }),
                {
                    actionSymbol: "1"
                }
            );
        }
    }
}
