import { useAdvancedThrownWeaponSystem } from "./utils.js";

/**
 * When we try to change the carry type of an item that represents a dropped version of another item,
 * move one item from the dropped stack to the original stack and perform the operation on the original,
 * if it puts the item in the character's hands.
 */
export async function changeCarryType(wrapper, item, carryType, handsHeld, inSlot) {
    // If we're not using the advanced thrown weapon system, or the weapon isn't a thrown weapon,
    // just call the normal function
    if (!isThrownWeaponUsingAdvancedThrownWeaponSystem(item)) {
        return wrapper(item, carryType, handsHeld, inSlot);
    }

    // If we're keeping the same carry type (e.g. two-handed to one-handed) then call
    // the normal function
    if (carryType === item.system.equipped.carryType) {
        return wrapper(item, carryType, handsHeld, inSlot);
    }

    // Find the other stacks in this weapon's group
    const { groupStacks, groupStackIds } = findGroupStacks(item);

    if (item.quantity === 0 && groupStackIds.length > 1) {
        item.delete();
        return [];
    }

    // Find the stack that has the carry type we're trying to set
    const targetStack = groupStacks.find(stack => stack.system.equipped.carryType === carryType);

    // - If there is no target stack then what we do depends on the size of our current stack:
    //   - If our stack size is one, then we can just call the normal function
    //   - If our stack size is more than one, then we'll create a new target stack
    // - If there is an existing target stack, then move one item from one stack to the other
    //   - If this would leave our original stack empty, then delete it
    if (!targetStack) {
        if (item.quantity <= 1) {
            return wrapper(item, carryType, handsHeld, inSlot);
        } else {
            createNewStack(item, groupStackIds, groupStacks, carryType, handsHeld, inSlot);
        }
    } else {
        moveBetweenStacks(item, targetStack);
    }
    return [];
}

export async function changeStowed(wrapper, item, container) {
    // Fall back on the default function if any of:
    // - The item isn't a thrown weapon
    // - We're not using the advanced thrown weapon system
    // - We're putting the item into a container
    if (!isThrownWeaponUsingAdvancedThrownWeaponSystem(item)) {
        wrapper(item, container);
        return;
    }

    const { groupStacks, groupStackIds } = findGroupStacks(item);

    // If we're moving an empty stack, and there is another stack in the group, then just
    // delete this stack (for example, sheathing a thrown weapon stack when they're all dropped)
    if (item.quantity === 0 && groupStacks.length > 1) {
        item.delete();
        return;
    }

    const targetStack = container
        ? groupStacks.find(stack => stack.system.equipped.carryType === "stowed" && stack.system.containerId === container.id)
        : groupStacks.find(stack => stack.system.equipped.carryType === "worn");

    if (!targetStack) {
        if (item.quantity <= 1) {
            wrapper(item, container);
            return;
        } else {
            createNewStack(item, groupStackIds, groupStacks, container ? "stowed" : "worn", 0, false, container);
        }
    } else {
        moveBetweenStacks(item, targetStack);
    }
}

export function findGroupStacks(item) {
    const groupIds = item.flags["pf2e-ranged-combat"]?.groupIds ?? [item.id];
    const groupStacks = item.actor.items.filter(i => groupIds.includes(i.id));
    const groupStackIds = groupStacks.map(stack => stack.id);

    return { groupStacks, groupStackIds };
}

export async function createNewStack(item, groupStackIds, groupStacks, carryType, handsHeld, inSlot, container = null) {
    // Make a copy of this item, with a quantity of zero
    const itemSource = item.toObject();
    const [targetStack] = await item.actor.createEmbeddedDocuments(
        "Item",
        [
            {
                ...itemSource,
                data: {
                    ...itemSource.system,
                    containerId: container?.id ?? null,
                    quantity: 0
                }
            }
        ]
    );

    // If the target stack was created successfully, then we need to update all the other
    // stacks in the group to add this one.
    if (targetStack) {
        groupStacks.push(targetStack);
        groupStackIds.push(targetStack.id);

        const updates = [];

        // Update the new stack to have a size of one, and the equipped status
        // that we were trying to update the original stack to
        updates.push({
            _id: targetStack.id,
            data: {
                containerId: container?.id ?? null,
                equipped: {
                    carryType,
                    handsHeld,
                    inSlot
                },
                quantity: 1
            }
        });

        // Go through all the stacks in the group and update the group list 
        for (const stack of groupStacks) {
            updates.push({
                _id: stack.id,
                flags: {
                    "pf2e-ranged-combat": {
                        groupIds: groupStackIds
                    }
                }
            });
        }

        // Finally, reduce the quantity of the original stack by one
        updates.push({
            _id: item.id,
            data: {
                quantity: item.quantity - 1
            }
        });

        await targetStack.actor.updateEmbeddedDocuments("Item", updates);
    }
}

function moveBetweenStacks(item, targetStack) {
    const updates = [];
    const deletes = [];

    // Return early if we're moving an item into itself
    if (item.id === targetStack.id) {
        return;
    }
    // If we have zero in this stack, just delete it and don't increase the other stack's quantity
    if (item.quantity === 0) {
        deletes.push(item.id);
    } else {
        // If we have only one in this stack, delete the stack. Otherwise, reduce the quantity by one
        if (item.quantity === 1) {
            deletes.push(item.id);
        } else {
            updates.push({
                _id: item.id,
                data: {
                    quantity: item.quantity - 1
                }
            });
        }

        // Increase the target's stack quantity by one
        updates.push(
            {
                _id: targetStack.id,
                data: {
                    quantity: targetStack.quantity + 1
                }
            }
        );
    }

    item.actor.updateEmbeddedDocuments("Item", updates);
    item.actor.deleteEmbeddedDocuments("Item", deletes);
}

function isThrownWeaponUsingAdvancedThrownWeaponSystem(item) {
    return useAdvancedThrownWeaponSystem(item.actor)
        && item.type === "weapon"
        && item.system.traits.value.some(trait => trait.startsWith("thrown") || trait === "consumable");
}
