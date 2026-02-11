import { Section } from "../../lib/lib-item-select-dialog-types/types.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { ItemSelect } from "../utils/item-select-dialog.js";
import { Updates } from "../utils/updates.js";
import { getEffectFromActor, getItem, postInteractToChat } from "../utils/utils.js";
import { Ammunition, Weapon } from "../weapons/types.js";
import { LOADED_EFFECT_ID } from "./constants.js";

const localize = key => game.i18n.localize(`pf2e-ranged-combat.ammunitionSystem.${key}`);
const format = (key, params) => game.i18n.format(`pf2e-ranged-combat.ammunitionSystem.${key}`, params);

export class AmmunitionSystem {

    /**
     * @param {PF2eActor} actor
     */
    static async unload(actor) {
        // Find a weapon that is currently loaded
        const weapon = await AmmunitionSystem.getWeapon(
            actor,
            {
                required: weapon => weapon.loadedAmmunition.length > 0
            },
            "actions.unload.noLoadedWeapons"
        );

        if (!weapon) {
            return;
        }

        /** @type {Ammunition} */
        let ammunition;

        if (weapon.loadedAmmunition.length === 1) {
            ammunition = weapon.loadedAmmunition[0];
        } else {
            ammunition = await ItemSelect.getItem(
                `Unload Ammunition (${weapon.name})`,
                `Select ammunition to unload from ${weapon.name}.`,
                [
                    new Section(
                        localize("ammunitionSelect.header.loadedAmmunition"),
                        weapon.loadedAmmunition.map(ItemSelect.buildChoice)
                    )
                ]
            );
        }

        if (!ammunition) {
            return;
        }

        const updates = new Updates(actor);

        weapon.removeAmmunition(ammunition, updates);

        if (ammunition.remainingUses === ammunition.maxUses) {
            // If the ammunition still has all its uses remaining, try to add it to an existing stack that has all its uses remaining.
            // If no existing stack can be found, create a new stack.
            const existingStack = weapon.compatibleAmmunition
                .filter(candidate => candidate.remainingUses === candidate.maxUses)
                .find(candidate => candidate.sourceId === ammunition.sourceId);
            if (existingStack) {
                updates.update(existingStack, { "system.quantity": existingStack.quantity + 1 });
            } else {
                const ammunitionSource = await getItem(ammunition.sourceId);
                ammunitionSource.system.quantity = 1;

                updates.create(ammunitionSource);
            }
        } else if (ammunition.remainingUses > 0) {
            // If the ammunition still has some uses remaining, create a new stack.
            const ammunitionSource = await getItem(ammunition.sourceId);
            ammunitionSource.system.quantity = 1;
            ammunitionSource.system.uses.value = ammunition.remainingUses;

            updates.create(ammunitionSource);
        }

        // If the weapon is a repeating weapon, remove its loaded effect, if any
        if (weapon.isRepeating) {
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                updates.delete(loadedEffect);
            }
        }

        updates.handleUpdates();

        AmmunitionSystem.postUnloadToChat(actor, weapon, ammunition);
    }



    /**
     * 
     * @param {PF2eActor} actor 
     * @param {Weapon} weapon 
     * @param {Ammunition} ammunition 
     */
    static postUnloadToChat(actor, weapon, ammunition) {
        postInteractToChat(
            actor,
            weapon.img,
            format(
                "actions.unload.tokenUnloadsAmmunitionFromWeapon",
                {
                    token: actor.name,
                    ammunition: ammunition.name,
                    weapon: weapon.name
                }
            ),
            "1"
        );
    }
}
