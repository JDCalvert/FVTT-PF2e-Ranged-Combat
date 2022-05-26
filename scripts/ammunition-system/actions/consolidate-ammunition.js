import { getControlledActorAndToken, getItem, postInChat, Updates } from "../../utils/utils.js";

export async function consolidateRepeatingWeaponAmmunition() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    // Find all the repeating ammunition stacks
    const ammunitionStacks = actor.itemTypes.consumable.filter(consumable => consumable.isAmmunition && consumable.charges.max > 1);
    const ammunitionStacksBySourceId = ammunitionStacks.reduce(
        function(map, stack) {
            const mapEntry = map[stack.sourceId];
            if (!mapEntry) {
                map[stack.sourceId] = {
                    stacks: [stack],
                    totalCharges: getTotalChargesForStack(stack)
                };
            } else {
                mapEntry.stacks.push(stack);
                mapEntry.totalCharges += getTotalChargesForStack(stack);
            }
            return map;
        },
        {}
    );

    const updates = new Updates(actor);

    for (const sourceId in ammunitionStacksBySourceId) {
        const stackEntry = ammunitionStacksBySourceId[sourceId];
        const stacks = stackEntry.stacks;

        const maxChargesPerItem = stacks[0].charges.max;

        // Work out if we need to consolidate:
        // - We have one stack with zero quantity
        // - OR we have:
        //   - Optionally, one stack fully-charge with non-zero quantity
        //   - Optionally, one stack with quantity 1 and not fully-charged
        // - AND
        //   - We have no other stacks
        const haveEmptyStack = stacks.some(stack => stack.quantity === 0);
        const haveFullStack = stacks.some(stack => stack.quantity > 0 && stack.charges.current === stack.charges.max);
        const haveNonFullStack = stacks.some(stack => stack.quantity === 1 && stack.charges.current !== stack.charges.max);
        if ((haveEmptyStack && stacks.length === 1) || stacks.length === haveFullStack + haveNonFullStack) {
            continue;
        }

        const remainingCharges = stackEntry.totalCharges % maxChargesPerItem;
        const quantityFullCharges = (stackEntry.totalCharges - remainingCharges) / maxChargesPerItem;

        let index = 0;

        // Make one stack of fully-charged items
        if (quantityFullCharges) {
            const indexNow = index;
            updates.update(async () => {
                await stacks[indexNow].update({
                    "data.quantity": quantityFullCharges,
                    "data.charges.value": maxChargesPerItem
                });
            });
            index++;
        }

        // Make one stack of one item with the remaining charges
        if (remainingCharges) {
            if (index >= stacks.length) {
                const newStackSource = await getItem(sourceId);
                newStackSource.data.quantity = 1;
                newStackSource.data.charges.value = remainingCharges;
                updates.add(newStackSource);
            } else {
                const indexNow = index;
                updates.update(async () => {
                    await stacks[indexNow].update({
                        "data.quantity": 1,
                        "data.charges.value": remainingCharges
                    });
                });
                index++;
            }
        }

        // Remove the rest of the stacks
        while (index < stacks.length) {
            updates.remove(stacks[index]);
            index++;
        }
    }

    if (updates.hasChanges()) {
        postInChat(
            actor,
            ammunitionStacks[0].img,
            `${token.name} consolidates their ammunition.`,
            "Interact",
            ""
        );
        await updates.handleUpdates();
    } else {
        ui.notifications.info("Your repeating ammunition is already consolidated!");
    }
}

function getTotalChargesForStack(stack) {
    return stack.quantity > 0 ? stack.charges.current + (stack.quantity - 1) * stack.charges.max : 0;
}
