import { WeaponAttackProcessParams } from "../hook-manager/types/weapon-attack-process.js";
import { Chat } from "../utils/chat.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { Util } from "../utils/utils.js";
import { AmmunitionSystem } from "../weapons/system.js";
import { CHAMBER_LOADED_EFFECT_ID, LOADED_EFFECT_ID } from "./constants.js";
import { WeaponAmmunitionData } from "../hook-manager/types/ammunition-fire.js";

export class FireWeaponProcessor {
    static initialise() {
        HookManager.register("weapon-attack", FireWeaponProcessor.processWeaponFired);
    }

    /**
     * @param {WeaponAttackProcessParams} data
     */
    static processWeaponFired({ weapon, updates }) {
        // If the weapon doesn't use ammunition, no need to do anything
        if (weapon.expend === null) {
            return;
        }

        if (weapon.isRepeating) {
            // Repeating weapon - reduce the number of uses by the weapon's expend value
            const ammunition = weapon.loadedAmmunition[0];

            ammunition.consume(weapon.expend, updates);

            // If the weapon needs loading, remove the loaded effect
            if (weapon.reloadActions > 0) {
                updates.delete(Util.getEffect(weapon, LOADED_EFFECT_ID));
            }

            Chat.post(
                weapon.actor,
                ammunition.img,
                AmmunitionSystem.localize(
                    "fireWeaponRepeating",
                    {
                        actor: weapon.actor.name,
                        ammunition: ammunition.name,
                        remaining: ammunition.remainingUses,
                        capacity: ammunition.maxUses
                    }
                )
            );

            HookManager.call("ammunition-fire", /** @type {WeaponAmmunitionData} */({ weapon, ammunition, updates }));
        } else if (weapon.capacity > 0) {
            weapon.selectedLoadedAmmunition.consume(weapon.expend, updates);

            // Capacity weapons clear their selected chamber
            if (weapon.isCapacity) {
                updates.delete(Util.getEffect(weapon, CHAMBER_LOADED_EFFECT_ID));
            }

            Chat.post(
                weapon.actor,
                weapon.selectedLoadedAmmunition.img,
                AmmunitionSystem.localize(
                    "fireWeapon",
                    {
                        actor: weapon.actor.name,
                        ammunition: weapon.selectedLoadedAmmunition.name
                    }
                )
            );

            HookManager.call("ammunition-fire", /** @type {WeaponAmmunitionData} */({ weapon, ammunition: weapon.selectedLoadedAmmunition, updates }));
        } else {
            // Weapons that have no capacity consumer ammunition directly from the inventory
            weapon.selectedInventoryAmmunition.consume(weapon.expend, updates);

            Chat.post(
                weapon.actor,
                weapon.selectedInventoryAmmunition.img,
                AmmunitionSystem.localize(
                    "fireWeapon",
                    {
                        actor: weapon.actor.name,
                        ammunition: weapon.selectedInventoryAmmunition.name
                    }
                )
            );

            HookManager.call("ammunition-fire", /** @type {WeaponAmmunitionData} */({ weapon, ammunition: weapon.selectedInventoryAmmunition, updates }));
        }
    }
}
