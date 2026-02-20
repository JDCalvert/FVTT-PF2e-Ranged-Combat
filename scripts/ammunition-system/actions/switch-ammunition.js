import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { AmmunitionSystem, WeaponSystem } from "../../weapons/system.js";

export class SwitchAmmunition {
    /**
     * @param {string} key 
     * @param {object} data 
     * 
     * @returns {string}
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`actions.switchAmmunition.${key}`, data);
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: weapon => weapon.expend > 0
            },
            "switch",
            SwitchAmmunition.localize("warningNoWeaponUsesAmmunition", { actor: actor.name })
        );
        if (!weapon) {
            return;
        }

        const ammunition = await AmmunitionSystem.chooseCompatibleAmmunition(weapon, "switch");
        if (!ammunition) {
            return;
        }

        const updates = new Updates(actor);
        weapon.setSelectedAmmunition(ammunition, updates);
        updates.commit();

        Hooks.callAll("pf2eRangedCombatSwitchAmmunition", actor, weapon);
    }
}
