import { removeDroppedState } from "./util.js";

/**
 * When we try to change the carry type of an item that represents a dropped version of another item,
 * move one item from the dropped stack to the original stack and perform the operation on the original,
 * if it puts the item in the character's hands.
 */
export async function changeCarryType(wrapper, item, carryType, handsHeld, inSlot) {
    const itemFlags = item.data.flags["pf2e-ranged-combat"];
    const droppedFrom = itemFlags?.droppedFrom;
    if (droppedFrom) {
        const originalItem = item.actor.items.find(item => item.id === droppedFrom.id);

        // If we no longer have the item this was dropped from, then remove the flag and call
        // the function as normal
        if (!originalItem) {
            await removeDroppedState(item);
            return wrapper(item, carryType, handsHeld, inSlot);
        }

        const updates = [];
        const deletes = [];

        // Move one item from this item to the original item
        updates.push(
            {
                _id: originalItem.id,
                data: {
                    quantity: originalItem.quantity + 1
                }
            }
        );

        if (item.quantity > 1) {
            updates.push(
                {
                    _id: item.id,
                    data: {
                        quantity: item.quantity - 1
                    }
                }
            );
        } else {
            deletes.push(item.id);
        }

        // Run the updates and deletions
        await item.actor.updateEmbeddedDocuments("Item", updates);
        await item.actor.deleteEmbeddedDocuments("Item", deletes);

        // Finally, if we're trying to move the item into our hands, do that to the
        // original item instead. Otherwise, we're done.
        if (carryType === "held") {
            return wrapper(originalItem, carryType, handsHeld, inSlot);
        } else {
            return [];
        }
    }

    return wrapper(item, carryType, handsHeld, inSlot);
}
