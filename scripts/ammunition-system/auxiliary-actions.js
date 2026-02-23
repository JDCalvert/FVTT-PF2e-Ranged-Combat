import { AuxiliaryActionHookParams, buildAuxiliaryAction } from "../core/auxiliary-actions.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { AmmunitionSystem } from "../weapons/system.js";
import { NextChamber } from "./actions/next-chamber.js";
import { Reload } from "./actions/reload.js";
import { Unload } from "./actions/unload.js";

export class AuxiliaryActions {
    /**
     * @param {string} key 
     * @returns {string}
     */
    static localize(key) {
        return AmmunitionSystem.localize(`actions.names.${key}`);
    }

    static initialise() {
        HookManager.register(
            "auxiliary-actions",
            /**
             * @param {AuxiliaryActionHookParams} args 
             */
            args => {
                const { auxiliaryActions, pf2eWeapon, weapon, actor } = args;

                // Reload Magazine
                const reloadResult = Reload.showAuxiliaryActions(weapon);

                if (reloadResult.magazineReload) {
                    auxiliaryActions.push(
                        buildAuxiliaryAction(
                            pf2eWeapon,
                            AuxiliaryActions.localize("reloadMagazine"),
                            "interact",
                            reloadResult.magazineReloadActions,
                            String(reloadResult.magazineReloadActions),
                            2,
                            async () => {
                                const updates = new Updates(actor);
                                await Reload.reloadMagazine(weapon, updates);
                                updates.commit();
                            }
                        )
                    );
                }

                if (reloadResult.reload) {
                    auxiliaryActions.push(
                        buildAuxiliaryAction(
                            pf2eWeapon,
                            AuxiliaryActions.localize("reload"),
                            "interact",
                            weapon.reloadActions,
                            String(weapon.reloadActions),
                            2,
                            async () => {
                                const updates = new Updates(actor);
                                await Reload.reload(weapon, updates);
                                updates.commit();
                            }
                        )
                    );
                }

                // Next Chamber
                if (NextChamber.shouldShowAuxiliaryAction(weapon)) {
                    auxiliaryActions.push(
                        buildAuxiliaryAction(
                            pf2eWeapon,
                            AuxiliaryActions.localize("nextChamber"),
                            "interact",
                            1,
                            "1",
                            1,
                            async () => {
                                const updates = new Updates(actor);
                                await NextChamber.perform(weapon, updates);
                                updates.commit();
                            }
                        )
                    );
                }

                // Unload, if the weapon can be unloaded
                if (Unload.shouldShowAuxiliaryAction(weapon)) {
                    auxiliaryActions.push(
                        buildAuxiliaryAction(
                            pf2eWeapon,
                            AuxiliaryActions.localize("unload"),
                            "interact",
                            1,
                            "1",
                            2,
                            async () => {
                                const updates = new Updates(actor);
                                await Unload.perform(weapon, updates);
                                updates.commit();
                            }
                        )
                    );
                }
            }
        );
    }
}
