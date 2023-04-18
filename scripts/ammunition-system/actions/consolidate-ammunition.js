import { getControlledActorAndToken, getItem, postInChat, Updates } from "../../utils/utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.consolidateAmmunition." + key)
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.consolidateAmmunition." + key, data)


export async function consolidateRepeatingWeaponAmmunition() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    // Find all the repeating ammunition stacks
    const ammunitionStacks = actor.itemTypes.consumable.filter(consumable => consumable.isAmmunition && consumable.system.charges.max > 1);
    const ammunitionStacksBySourceId = ammunitionStacks.reduce(
        function (map, stack) {
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

        const maxChargesPerItem = stacks[0].system.charges.max;

        // Work out if we need to consolidate:
        // - We have one stack with zero quantity
        // - OR we have:
        //   - Optionally, one stack fully-charge with non-zero quantity
        //   - Optionally, one stack with quantity 1 and not fully-charged
        // - AND
        //   - We have no other stacks
        const haveEmptyStack = stacks.some(stack => stack.quantity === 0);
        const haveFullStack = stacks.some(stack => stack.quantity > 0 && stack.system.charges.value === stack.system.charges.max);
        const haveNonFullStack = stacks.some(stack => stack.quantity === 1 && stack.system.charges.value !== stack.system.charges.max);
        if ((haveEmptyStack && stacks.length === 1) || stacks.length === haveFullStack + haveNonFullStack) {
            continue;
        }

        const remainingCharges = stackEntry.totalCharges % maxChargesPerItem;
        const quantityFullCharges = (stackEntry.totalCharges - remainingCharges) / maxChargesPerItem;

        let index = 0;

        // Make one stack of fully-charged items
        if (quantityFullCharges) {
            const indexNow = index;
            updates.update(
                stacks[indexNow],
                {
                    system: {
                        quantity: quantityFullCharges,
                        charges: {
                            value: maxChargesPerItem
                        }
                    }
                }
            );
            index++;
        }

        // Make one stack of one item with the remaining charges
        if (remainingCharges) {
            if (index >= stacks.length) {
                const newStackSource = await getItem(sourceId);
                newStackSource.system.quantity = 1;
                newStackSource.system.charges.value = remainingCharges;
                updates.create(newStackSource);
            } else {
                const indexNow = index;
                updates.update(
                    stacks[indexNow],
                    {
                        system: {
                            quantity: 1,
                            charges: {
                                value: remainingCharges
                            }
                        }
                    }
                );
                index++;
            }
        }

        // Remove the rest of the stacks
        while (index < stacks.length) {
            updates.delete(stacks[index]);
            index++;
        }
    }

    if (updates.hasChanges()) {
        postInChat(
            actor,
            ammunitionStacks[0].img,
            format("chatMessage", { token: token.name }),
            game.i18n.localize("PF2E.Actions.Interact.Title"),
            ""
        );
        await updates.handleUpdates();
    } else {
        ui.notifications.info(localize("infoAlreadyConsolidated"));
    }
}

function getTotalChargesForStack(stack) {
    return stack.quantity > 0 ? stack.system.charges.value + (stack.quantity - 1) * stack.system.charges.max : 0;
}
