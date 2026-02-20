import { AuxiliaryActionHookParams, buildAuxiliaryAction } from "../core/auxiliary-actions.js";
import { Chat } from "../utils/chat.js";
import { HookManager } from "../utils/hook-manager.js";
import { findGroupStacks } from "./change-carry-type.js";

export class AuxiliaryActions {
    static initialise() {
        HookManager.register(
            "auxiliary-actions",
            /** @type {(args: AuxiliaryActionHookParams) => void} */
            (args) => {
                const { weapon, pf2eWeapon, auxiliaryActions } = args;

                // If the weapon is equipped, and there are other stacks of the same type
                if (weapon.isEquipped) {
                    const groupStacks = findGroupStacks(weapon);

                    if (groupStacks.length && weapon.quantity === 0) {
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

                    const wornStack = groupStacks.find(weapon => weapon.carryType === "worn");
                    if (wornStack) {
                        if (weapon.quantity === 0) {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw1H", 1));

                            if (weapon.hands === 2) {
                                auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw2H", 2));
                            }
                        } else {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, `Draw${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
                        }
                    }

                    const droppedStack = groupStacks.find(weapon => weapon.carryType === "dropped");
                    if (droppedStack) {
                        if (weapon.quantity === 0) {
                            auxiliaryActions.push(AuxiliaryActions.buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp1H", 1));

                            if (weapon.hands === 2) {
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
