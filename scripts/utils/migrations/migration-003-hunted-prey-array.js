import { HUNTED_PREY_EFFECT_ID } from "../../hunt-prey/hunt-prey.js";
import { useAdvancedThrownWeaponSystem } from "../../thrown-weapons/utils.js";
import { getEffectFromActor, getFlags } from "../utils.js";

export class Migration003HuntedPreyArray {
    version = 3;

    async runMigration() {
        console.info("PF2e Ranged Combat - Running Migration 3: Hunted Prey Array");

        const actors = game.actors.contents;

        for (const actor of actors) {
            const huntedPreyEffect = getEffectFromActor(actor, HUNTED_PREY_EFFECT_ID);
            const flags = getFlags(huntedPreyEffect);

            if (!flags.targetId) {
                continue;
            }

            huntedPreyEffect.update(
                {
                    flags: {
                        "pf2e-ranged-combat": {
                            "-=targetId": null,
                            targetIds: [flags.targetId]
                        }
                    }
                }
            );
        }
    }
}
