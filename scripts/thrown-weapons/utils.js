import { getFlags } from "../utils/utils.js";

/**
 * For the given actor type, check if the advanced thrown weapon system is enabled
 */
export function useAdvancedThrownWeaponSystem(actor) {
    if (actor.type === "character") {
        return game.settings.get("pf2e-ranged-combat", "advancedThrownWeaponSystemPlayer");
    } else if (actor.type === "npc") {
        return false; // Placeholder for NPC advanced thrown weapon system
    } else {
        return false;
    }
}

export function reduceQuantity(weapon, updates) {
    if (weapon.value.quantity > 0) {
        updates.update(() => weapon.value.update({
            "data.quantity": weapon.value.quantity - 1
        }));
    }
}

/**
 * Remove the droppedFrom flag, and update the name to remove the "Updated" suffix
 */
export async function removeDroppedState(item) {
    const flags = item.data.flags["pf2e-ranged-combat"];
    const droppedFromName = flags.droppedFrom.name;
    delete flags.droppedFrom;
    return await item.update(
        {
            name: droppedFromName,
            "flags.pf2e-ranged-combat": flags
        }
    );
}

/**
 * Find the stack for this item with the specified carry type
 */
export function getStack(item, carryType) {
    const stackId = getFlags(item)?.stacks?.[carryType]?.id;
    if (stackId) {
        return item.actor.items.find(i => i.id === stackId);
    }
    return null;
}

export function getDroppedWeapon(weapon) {
    const droppedWeaponId = weapon.data.flags["pf2e-ranged-combat"]?.droppedId;
    return weapon.actor.itemTypes.weapon.find(w => w.id === droppedWeaponId);
}
