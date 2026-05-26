import { Configuration } from "../config/config.js";
import { Util } from "../utils/utils.js";

/**
 * Find all items in the same group as this item
 * 
 * @param {ItemPF2e} weapon
 * @returns {ItemPF2e[]}
 */
export function findGroupStacks(weapon) {
    const groupIds = weapon.flags["pf2e-ranged-combat"]?.groupIds ?? [weapon.id];
    return [
        ...weapon.actor.itemTypes.weapon,
        ...weapon.actor.itemTypes.shield
    ]
        .filter(item => groupIds.includes(item.id));
}

/**
 * Determine if this is a valid item
 *
 * @param {ItemPF2e} item
 * @returns {boolean}
 */
export function isThrownWeaponUsingAdvancedThrownWeaponSystem(item) {
    if (!useAdvancedThrownWeaponSystem(item.actor)) {
        return false;
    }

    if (item.type === "weapon") {
        return item.system.traits.value.some(trait => trait.startsWith("thrown"));
    }

    if (item.type === "shield") {
        return item.system.traits.value.some(trait => trait.startsWith("shield-throw"));
    }

    return false;
}

/**
 * For the given actor type, check if the advanced thrown weapon system is enabled
 * 
 * @param {ActorPF2e} actor 
 */
export function useAdvancedThrownWeaponSystem(actor) {
    if (actor.type === "character") {
        return Configuration.getSetting("advancedThrownWeaponSystemPlayer");
    } else if (actor.type === "npc") {
        return Util.getFlag(actor, "enableAdvancedThrownWeaponSystem");
    } else {
        return false;
    }
}
