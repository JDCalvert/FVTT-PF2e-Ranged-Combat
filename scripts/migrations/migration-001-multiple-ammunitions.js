import { LOADED_EFFECT_ID } from "../ammunition-system/constants.js";
import { getFlags, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { getWeapons } from "../utils/weapon-utils.js";

class Migration001MultipleAmmunitions {
    version = 1;

    async runMigration() {
        const actors = game.actors;

        for (const actor of actors) {
            if (!useAdvancedAmmunitionSystem(actor)) {
                continue;
            }
            
            const weapons = getWeapons(actor);
            const effects = actor.itemTypes.effect;

            // Loaded Effects
            const loadedEffects = effects.filter(effect => effect.sourceId === LOADED_EFFECT_ID);
            for (const loadedEffect of loadedEffects) {
                const loadedFlags = getFlags(loadedEffect);
                const weapon = weapons.filter(weapon => weapon.id === loadedFlags.targetId);

                if (weapon.isCapacity) {
                    loadedFlags = {
                        ...loadedFlags,
                        ammunition: [
                            {
                                name: loadedFlags.ammunitionName,
                                img: loadedFlags.ammunitionImg,
                                id: loadedFlags.ammunitionItemId,
                                sourceId: loadedFlags.ammunitionSourceId
                            }
                        ]
                    };
                    delete loadedFlags.ammunitionName;
                    delete loadedFlags.ammunitionImg;
                    delete loadedFlags.ammunitionItemId;
                    delete loadedFlags.ammunitionSourceId;
                } else {
                    
                }
            }
        }
    }
}
