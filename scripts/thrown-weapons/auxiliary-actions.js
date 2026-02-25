import { AuxiliaryActionHookParams, buildAuxiliaryAction } from "../core/auxiliary-actions.js";
import { Chat } from "../utils/chat.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { findGroupStacks } from "./utils.js";

export class AuxiliaryActions {
    static initialise() {
        HookManager.register(
            "auxiliary-actions",
            /** @type {(args: AuxiliaryActionHookParams) => void} */
            (args) => {
                const { pf2eWeapon, auxiliaryActions } = args;

                // If the weapon is equipped, and there are other stacks of the same type
                if (pf2eWeapon.isEquipped) {
                    const groupStacks = findGroupStacks(pf2eWeapon);

                    if (groupStacks.length && pf2eWeapon.quantity === 0) {
                        auxiliaryActions.findSplice(action =>
                            action.label === game.i18n.localize("PF2E.Actions.Release.ChangeGrip.Title") ||
                            action.label === game.i18n.localize("PF2E.Actions.Interact.ChangeGrip.Title")
                        );

                        auxiliaryActions.findSplice(action => action.label === game.i18n.localize("PF2E.Actions.Release.Drop.Title"));
                        auxiliaryActions.findSplice(action => action.label === game.i18n.localize("PF2E.Actions.Interact.Sheathe.Title"));

                        auxiliaryActions.push(
                            buildAuxiliaryAction(
                                pf2eWeapon,
                                "Remove",
                                "",
                                0,
                                undefined,
                                0,
                                () => pf2eWeapon.delete()
                            )
                        );
                    }

                    // If there is a stack in the group that is worn, add options to draw from that stack
                    const wornStack = groupStacks.find(weapon => weapon.carryType === "worn");
                    if (wornStack) {
                        if (pf2eWeapon.quantity === 0) {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw1H", 1));

                            if (pf2eWeapon.hands === 2) {
                                auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw2H", 2));
                            }
                        } else {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, `Draw${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
                        }
                    }

                    // If there is a stack in the group that is dropped, add options to pick up from that stack
                    const droppedStack = groupStacks.find(weapon => weapon.carryType === "dropped");
                    if (droppedStack) {
                        if (pf2eWeapon.quantity === 0) {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp1H", 1));

                            if (pf2eWeapon.hands === 2) {
                                auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp2H", 2));
                            }
                        } else {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, `PickUp${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
                        }
                    }
                }
            }
        );
    }

    static buildCarryTypeAuxiliaryAction(pf2eWeapon, stack, action, hands) {
        return buildAuxiliaryAction(
            pf2eWeapon,
            game.i18n.localize(`PF2E.Actions.Interact.${action}.Title`),
            "interact",
            1,
            "1",
            hands,
            () => AuxiliaryActions.changeCarryType(stack, action, hands)
        );
    }

    static async changeCarryType(weapon, subAction, hands) {
        weapon.actor.changeCarryType(weapon, { carryType: "held", handsHeld: hands });

        if (!game.combat) return; // Only send out messages if in encounter mode

        const flavor = await Chat.render(
            "./systems/pf2e/templates/chat/action/flavor.hbs",
            {
                action: {
                    title: `PF2E.Actions.Interact.Title`,
                    subtitle: `PF2E.Actions.Interact.${subAction}.Title`,
                    glyph: "1",
                },
                traits: ["manipulate"]
            }
        );
        const content = await Chat.render(
            "./systems/pf2e/templates/chat/action/content.hbs",
            {
                imgPath: weapon.img,
                message: game.i18n.format(
                    `PF2E.Actions.Interact.${subAction}.Description`,
                    {
                        actor: weapon.actor.name,
                        weapon: weapon.name,
                        shield: weapon.name,
                    }
                )
            }
        );

        ChatMessage.create(
            {
                content,
                speaker: ChatMessage.getSpeaker({ actor: weapon.actor }),
                flavor,
                type: CONST.CHAT_MESSAGE_STYLES.EMOTE,
            }
        );
    }
}
