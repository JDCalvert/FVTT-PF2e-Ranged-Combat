import { Chat } from "../../utils/chat.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { Weapon } from "../../weapons/types.js";
import { AmmunitionSystem, WeaponSystem } from "../../weapons/system.js";
import { CHAMBER_LOADED_EFFECT_ID, SELECT_NEXT_CHAMBER_IMG } from "../constants.js";

export class NextChamber {

    /**
     * @param {string} key 
     * @param {object} data
     * 
     * @returns {string} 
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`actions.nextChamber.${key}`, data);
    }

    /**
     * @param {Weapon} weapon
     * @returns {boolean}
     */
    static shouldShowAuxiliaryAction(weapon) {
        if (weapon.isStowed) {
            return false;
        }

        if (!weapon.isCapacity) {
            return false;
        }

        // Can't switch chamber if not loaded
        if (weapon.loadedAmmunition.length === 0) {
            return false;
        }

        // Can always switch chamber if none selected
        if (!weapon.selectedLoadedAmmunition) {
            return true;
        }

        // Can only switch chamber if there's a different chamber to switch to
        return weapon.loadedAmmunition.length > 1;
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: weapon => !weapon.isStowed && weapon.isCapacity,
                priority: weapon => weapon.isEquipped && weapon.loadedAmmunition.length > 0 && !Util.getEffect(weapon, CHAMBER_LOADED_EFFECT_ID)
            },
            "generic",
            NextChamber.localize("noCapacityWeapons")
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);
        await NextChamber.perform(weapon, updates);
        updates.commit();
    }

    /**
     * @param {Weapon} weapon 
     * @param {Updates} updates 
     * 
     * @returns {Promise<void>}
     */
    static async perform(weapon, updates) {
        const ammunition = await AmmunitionSystem.chooseLoadedAmmunition(
            weapon,
            "switch",
            [
                {
                    header: "current",
                    predicate: ammunition => weapon.selectedLoadedAmmunition === ammunition
                }
            ]
        );
        if (!ammunition) {
            return;
        }

        // If the ammunition chosen is already selected, don't continue
        if (weapon.selectedLoadedAmmunition === ammunition) {
            NextChamber.localize(
                weapon.loadedAmmunition.length === 1
                    ? "warningAlreadySelected"
                    : "warningAlreadyLoaded",
                { weapon: weapon.name, ammunition: ammunition.name }
            );
            return;
        }

        await weapon.setNextChamber(ammunition, updates);
        Chat.postInteract(
            weapon.actor,
            SELECT_NEXT_CHAMBER_IMG,
            NextChamber.localize(
                weapon.loadedAmmunition.length === 1
                    ? "chatMessageSelectNextChamber"
                    : "chatMessageSelectChamber",
                {
                    actor: weapon.actor.name,
                    weapon: weapon.name,
                    ammunition: ammunition.name
                }
            ),
            {
                actionSymbol: "1"
            }
        );

        Hooks.callAll("pf2eRangedCombatNextChamber", weapon.actor, weapon);
    }
}
