import { HUNTED_PREY_EFFECT_ID } from "../../hunt-prey/hunt-prey.js";
import { getFlags, getItemFromActor } from "../utils.js";

export class Migration003HuntedPreyArray {
    version = 3;

    async runMigration() {
        console.info(game.i18n.localize("pf2e-ranged-combat.utils.migration.huntedPrey.consoleInfo"));

        const actors = game.actors.contents;

        for (const actor of actors) {
            const huntedPreyEffect = getItemFromActor(actor, HUNTED_PREY_EFFECT_ID);
            if (!huntedPreyEffect) {
                continue;
            }

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
