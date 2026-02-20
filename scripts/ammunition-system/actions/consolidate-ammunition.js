import { Chat } from "../../utils/chat.js";
import { Updates } from "../../utils/updates.js";
import { Util } from "../../utils/utils.js";
import { AmmunitionSystem } from "../../weapons/system.js";

export class ConsolidateAmmunition {
    /**
     * @param {string} key
     * @param {object} data
     * 
     * @returns {string}
     */
    static localize(key, data) {
        return AmmunitionSystem.localize(`actions.consolidateAmmunition.${key}`, data);
    }

    static async action() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        // Find all ammunition stacks, excluding ones marked as not to destroy
        const ammunitionStacks = (actor.itemTypes.ammo ?? actor.itemTypes.consumable.filter(consumable => consumable.isAmmo))
            .filter(ammunition => ammunition.system.uses.autoDestroy);

        /** @type {Map<string, { stacks: AmmoPF2e[], totalCharges: number}>} */
        const ammunitionStacksBySourceId = new Map();
        for (const stack of ammunitionStacks) {
            const totalCharges = stack.quantity > 0 ? stack.system.uses.value + (stack.quantity - 1) * stack.system.uses.max : 0;

            const mapEntry = ammunitionStacksBySourceId.get(stack.sourceId);
            if (!mapEntry) {
                ammunitionStacksBySourceId.set(
                    stack.sourceId,
                    {
                        stacks: [stack],
                        totalCharges: totalCharges
                    }
                );
            } else {
                mapEntry.stacks.push(stack);
                mapEntry.totalCharges += totalCharges;
            }
        }

        const updates = new Updates(actor);

        for (const [sourceId, stackEntry] of ammunitionStacksBySourceId) {
            const stacks = stackEntry.stacks;

            const maxChargesPerItem = stacks[0].system.uses.max;

            // Work out if we need to consolidate:
            // - We have one stack with zero quantity
            // - OR we have:
            //   - Optionally, one stack fully-charge with non-zero quantity
            //   - Optionally, one stack with quantity 1 and not fully-charged
            // - AND
            //   - We have no other stacks
            const haveEmptyStack = stacks.some(stack => stack.quantity == 0);
            const fullStacks = stacks.filter(stack => stack.quantity > 0 && stack.system.uses.value == stack.system.uses.max);
            const nonFullStacks = stacks.filter(stack => stack.quantity === 1 && stack.system.uses.value < stack.system.uses.max);
            if ((haveEmptyStack && stacks.length == 1) || (nonFullStacks.length <= 1 && fullStacks.length <= 1)) {
                continue;
            }

            const remainingCharges = stackEntry.totalCharges % maxChargesPerItem;
            const quantityFullCharges = (stackEntry.totalCharges - remainingCharges) / maxChargesPerItem;

            let index = 0;

            // Make one stack of fully-charged items
            if (quantityFullCharges) {
                updates.update(
                    stacks[index],
                    {
                        system: {
                            quantity: quantityFullCharges,
                            uses: {
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
                    const newStackSource = await Util.getSource(sourceId);
                    newStackSource.system.quantity = 1;
                    newStackSource.system.uses.value = remainingCharges;
                    updates.create(newStackSource);
                } else {
                    const indexNow = index;
                    updates.update(
                        stacks[indexNow],
                        {
                            system: {
                                quantity: 1,
                                uses: {
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
            Chat.postInteract(
                actor,
                ammunitionStacks[0].img,
                ConsolidateAmmunition.localize("chatMessage", { actor: actor.name }),
                null
            );
            await updates.commit();
        } else {
            Util.info(ConsolidateAmmunition.localize("infoAlreadyConsolidated"));
        }
    }
}
