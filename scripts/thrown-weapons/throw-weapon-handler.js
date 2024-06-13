import { HookManager } from "../utils/hook-manager.js";
import { createNewStack, findGroupStacks } from "./change-carry-type.js";
import { useAdvancedThrownWeaponSystem } from "./utils.js";

export function initialiseThrownWeaponHandler() {
    HookManager.register("weapon-attack", handleThrownWeapon);
}

function handleThrownWeapon({ weapon }) {
    if (!useAdvancedThrownWeaponSystem(weapon.actor)) {
        return;
    }

    // If the weapon isn't thrown, then we don't need to do anything
    const isThrownWeapon = weapon.isRanged && Array.from(weapon.traits).some(trait => trait.startsWith("thrown"));
    if (!isThrownWeapon) {
        return;
    }

    // If the weapon has a returning rune, then we don't need to do anything
    if (weapon.propertyRunes.includes("returning")) {
        return;
    }

    // Thrown weapons aren't destroyed on use, so we need to set it to dropped. However, we can't
    // roll damage unless the weapon is equipped, so we have to reduce the quantity of this "equipped" stack
    // and place the thrown weapon into a "dropped" stack

    // Find the other stacks in this weapon's group
    const groupStacks = findGroupStacks(weapon);

    const sourceStack = weapon.isEquipped
        ? weapon.actor.items.find(i => i.id === weapon.weaponId)
        : groupStacks.find(stack => stack.isEquipped);

    // Find the stack that has the carry type we're trying to set
    const targetStack = groupStacks.find(stack => stack.system.equipped.carryType === "dropped");

    if (targetStack) {
        // We have a dropped stack already
        weapon.actor.updateEmbeddedDocuments(
            "Item",
            [
                {
                    _id: sourceStack.id,
                    system: {
                        quantity: sourceStack.quantity - 1
                    }
                },
                {
                    _id: targetStack.id,
                    system: {
                        quantity: targetStack.quantity + 1
                    }
                }
            ]
        );
    } else {
        createNewStack(sourceStack, groupStacks, "dropped", 0, false);
    }
}
