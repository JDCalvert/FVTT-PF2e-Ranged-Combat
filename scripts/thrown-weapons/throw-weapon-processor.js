import { WeaponAttackProcessParams } from "../hook-manager/types/weapon-attack-process.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { createNewStack } from "./change-carry-type.js";
import { findGroupStacks, useAdvancedThrownWeaponSystem } from "./utils.js";

export class ThrownWeaponProcessor {
    static initialise() {
        HookManager.register("weapon-attack", handleThrownWeapon);
    }
}

/**
 * @param {WeaponAttackProcessParams} data
 */
function handleThrownWeapon({ weapon }) {
    if (!useAdvancedThrownWeaponSystem(weapon.actor)) {
        return;
    }

    // If the weapon isn't thrown, then we don't need to do anything
    const isThrownWeapon = weapon.isRanged && Array.from(weapon.traits).some(trait => trait.startsWith("thrown"));
    if (!isThrownWeapon) {
        return;
    }

    // This functionality is only relevant for weapons that are tied to an actual weapon
    const pf2eWeapon = weapon.pf2eWeapon;
    if (!pf2eWeapon) {
        return;
    }

    // If the weapon has a returning rune, then we don't need to do anything
    if (pf2eWeapon.system.runes.property.includes("returning")) {
        return;
    }

    // Thrown weapons aren't destroyed on use, so we need to set it to dropped. However, we can't
    // roll damage unless the weapon is equipped, so we have to reduce the quantity of this "equipped" stack
    // and place the thrown weapon into a "dropped" stack

    // Find the other stacks in this weapon's group
    const groupStacks = findGroupStacks(pf2eWeapon);

    const sourceStack = pf2eWeapon.isEquipped ? pf2eWeapon : groupStacks.find(stack => stack.isEquipped);

    // Find the stack that has the carry type we're trying to set
    const targetStack = groupStacks.find(stack => stack.system.equipped.carryType === "dropped");

    if (targetStack) {
        // We have a dropped stack already
        pf2eWeapon.actor.updateEmbeddedDocuments(
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
