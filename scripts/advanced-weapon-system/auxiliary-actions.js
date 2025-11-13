import { findGroupStacks } from "../thrown-weapons/change-carry-type.js";
import { HookManager } from "../utils/hook-manager.js";
import { buildAuxiliaryAction, buildCarryTypeAuxiliaryAction } from "./util.js";

export function initialiseAuxiliaryActions() {
    HookManager.register(
        "auxiliary-actions",
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
                        auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw1H", 1));

                        if (weapon.hands === 2) {
                            auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw2H", 2));
                        }
                    } else {
                        auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, `Draw${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
                    }
                }

                const droppedStack = groupStacks.find(weapon => weapon.carryType === "dropped");
                if (droppedStack) {
                    if (weapon.quantity === 0) {
                        auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp1H", 1));

                        if (weapon.hands === 2) {
                            auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp2H", 2));
                        }
                    } else {
                        auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, `PickUp${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
                    }
                }
            }

        }
    );
}
