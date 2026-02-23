import { HookManager } from "../../utils/hook-manager.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { Ammunition, InventoryAmmunition, LoadedAmmunition, Weapon } from "../../weapons/types.js";
import { AmmunitionSystem, WeaponSystem } from "../../weapons/system.js";
import { Chat } from "../../utils/chat.js";
import { LOADED_EFFECT_ID } from "../constants.js";

export class Unload {
    /**
     * @param {string} key 
     * @param {object} data 
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`actions.unload.${key}`, data);
    }

    /**
     * @param {Weapon} weapon 
     * @returns {boolean}
     */
    static check(weapon) {
        if (weapon.isStowed) {
            return false;
        }

        if (weapon.loadedAmmunition.length === 0) {
            return false;
        }

        return true;
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        // Find weapons which are not stowed and use ammunition. Prioritise equipped loaded weapons.
        const weapon = await WeaponSystem.getWeapon(
            actor,
            {
                required: weapon => !weapon.isStowed && weapon.capacity > 0,
                priority: weapon => weapon.isEquipped && weapon.remainingCapacity < weapon.capacity
            },
            "unload",
            Unload.localize("noLoadedWeapons", { actor: actor.name })
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);
        await Unload.perform(weapon, updates);
        updates.commit();
    }

    /**
     * @param {Weapon} weapon 
     * @param {Updates} updates 
     */
    static async perform(weapon, updates) {
        const loadedAmmunition = await AmmunitionSystem.chooseLoadedAmmunition(weapon, "unload");
        if (!loadedAmmunition) {
            return;
        }

        await Unload.removeFromWeapon(weapon, loadedAmmunition, updates);

        if (weapon.isRepeating && weapon.reloadActions > 0) {
            updates.delete(Util.getEffect(weapon, LOADED_EFFECT_ID));
        }

        Chat.postInteract(
            weapon.actor,
            weapon.img,
            Unload.localize(
                "unloadWeaponAmmunition",
                {
                    actor: weapon.actor.name,
                    weapon: weapon.name,
                    ammunition: loadedAmmunition.name
                }
            ),
            {
                actionSymbol: "1"
            }
        );

        HookManager.call("unload", { weapon, updates });
        Hooks.callAll("pf2eRangedCombatUnload", { actor: weapon.actor, weapon });
    }

    /**
     * @param {Weapon} weapon 
     * @param {LoadedAmmunition} ammunition
     * @param {Updates} updates
     */
    static async removeFromWeapon(weapon, ammunition, updates) {
        // Remove the ammunition from the weapon
        const unloadedAmmunition = ammunition.pop(1, updates);

        // If the unloaded ammunition still has uses left, add it back to the actor's inventory.
        // Try to find an existing stack to add it to, otherwise create a new one
        if (unloadedAmmunition.remainingUses > 0 || !unloadedAmmunition.allowDestroy) {
            const inventoryAmmunition = Unload.findInventoryAmmunition(weapon, unloadedAmmunition);
            if (inventoryAmmunition) {
                inventoryAmmunition.push(unloadedAmmunition, updates);
            } else {
                const ammunition = new InventoryAmmunition();
                unloadedAmmunition.copyData(ammunition);
                await ammunition.create(updates);
            }
        }
    }

    /**
     * Find ammunition in the inventory to add the unloaded ammunition to
     * 
     * @param {Weapon} weapon 
     * @param {Ammunition} ammunition 
     * 
     * @returns {InventoryAmmunition | null}
     */
    static findInventoryAmmunition(weapon, ammunition) {
        // If the unloaded ammunition doesn't have all its uses remaining, always make a new stack
        if (ammunition.remainingUses < ammunition.maxUses) {
            return null;
        }

        // If the weapon has some matching ammunition selected, use that
        if (weapon.selectedInventoryAmmunition && weapon.selectedInventoryAmmunition.sourceId === ammunition.sourceId) {
            return weapon.selectedInventoryAmmunition;
        }

        // Failing this, find some worn matching ammunition
        return weapon.compatibleAmmunition.find(candidate => candidate.sourceId === ammunition.sourceId) ?? null;
    }
}
