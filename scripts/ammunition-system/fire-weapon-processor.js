import { ChatLevel } from "../config/config.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { WeaponAmmunitionData } from "../hook-manager/types/ammunition-fire.js";
import { WeaponAttackProcessParams } from "../hook-manager/types/weapon-attack-process.js";
import { Chat } from "../utils/chat.js";
import { Updates } from "../utils/updates.js";
import { Util } from "../utils/utils.js";
import { AmmunitionSystem } from "../weapons/system.js";
import { Ammunition, Weapon } from "../weapons/types.js";
import { CHAMBER_LOADED_EFFECT_ID, LOADED_EFFECT_ID } from "./constants.js";

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

            FireWeaponProcessor.postAmmunitionToChat(weapon, ammunition, "fireWeaponRepeating");

            HookManager.call("ammunition-fire", /** @type {WeaponAmmunitionData} */({ weapon, ammunition, updates }));
        } else if (weapon.capacity > 0) {
            const ammunition = weapon.selectedLoadedAmmunition;

            ammunition.consume(weapon.expend, updates);

            // Capacity weapons clear their selected chamber
            if (weapon.isCapacity) {
                updates.delete(Util.getEffect(weapon, CHAMBER_LOADED_EFFECT_ID));
            }

            FireWeaponProcessor.postAmmunitionToChat(weapon, ammunition, "fireWeapon");

            HookManager.call("ammunition-fire", /** @type {WeaponAmmunitionData} */({ weapon, ammunition, updates }));
        } else {
            // Weapons that have no capacity consumer ammunition directly from the inventory
            const ammunition = weapon.selectedInventoryAmmunition;

            ammunition.consume(weapon.expend, updates);

            FireWeaponProcessor.postAmmunitionToChat(weapon, ammunition, "fireWeapon");

            HookManager.call("ammunition-fire", /** @type {WeaponAmmunitionData} */({ weapon, ammunition, updates }));
        }
    }

    /**
     * @param {Weapon} weapon 
     * @param {Ammunition} ammunition 
     * @param {string} message 
     */
    static postAmmunitionToChat(weapon, ammunition, message) {
        // If we're using fake ammunition, don't post anything
        if (ammunition.id === Updates.FAKE_ITEM_ID) {
            return;
        }

        const settingValue = game.settings.get("pf2e-ranged-combat", "postAmmunitionToChat");

        // If we have the chat setting set to full, and the ammunition is anything but basic ammunition, post the full ammunition to chat
        if (settingValue === ChatLevel.full && ammunition.pf2eItem?.level > 0) {
            ammunition.pf2eItem.toMessage();
        } else if (settingValue >= ChatLevel.simple) {
            Chat.post(
                weapon.actor,
                ammunition.img,
                AmmunitionSystem.localize(
                    message,
                    {
                        actor: weapon.actor.name,
                        ammunition: ammunition.name,
                        remaining: ammunition.remainingUses,
                        capacity: ammunition.maxUses
                    }
                )
            );
        }
    }
}
