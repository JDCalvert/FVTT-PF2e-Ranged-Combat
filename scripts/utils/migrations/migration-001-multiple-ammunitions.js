import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, CONJURE_BULLET_IMG, LOADED_EFFECT_ID } from "../../ammunition-system/constants.js";
import { getEffectFromActor, getFlags, Updates, useAdvancedAmmunitionSystem } from "../utils.js";
import { getWeapons } from "../weapon-utils.js";

export class Migration001MultipleAmmunitions {
    version = 1;

    async runMigration() {
        console.info(game.i18n.localize("pf2e-ranged-combat.utils.migration.multipleAmmunitions.consoleInfo"));

        const actors = game.actors.contents;

        for (const actor of actors) {
            if (!useAdvancedAmmunitionSystem(actor)) {
                continue;
            }

            const updates = new Updates(actor);

            const weapons = getWeapons(actor);

            for (const weapon of weapons) {
                let currentAmmunition = null;

                const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
                if (loadedEffect) {
                    let loadedFlags = getFlags(loadedEffect);

                    if (weapon.isCapacity) {
                        currentAmmunition = {
                            name: loadedFlags.ammunitionName,
                            img: loadedFlags.ammunitionImg,
                            id: loadedFlags.ammunitionItemId,
                            sourceId: loadedFlags.ammunitionSourceId
                        };

                        loadedFlags = {
                            ...loadedFlags,
                            ammunition: [
                                {
                                    ...currentAmmunition,
                                    quantity: loadedFlags.loadedChambers
                                }
                            ]
                        };
                    }

                    if (!weapon.isCapacity && !weapon.isRepeating) {
                        loadedFlags = {
                            ...loadedFlags,
                            ammunition: {
                                name: loadedFlags.ammunitionName,
                                img: loadedFlags.ammunitionImg,
                                id: loadedFlags.ammunitionItemId,
                                sourceId: loadedFlags.ammunitionSourceId
                            }
                        };
                    }

                    updates.update(loadedEffect, { "flags.pf2e-ranged-combat": loadedFlags });
                }

                // Chamber Loaded Effect
                const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
                const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);

                if (chamberLoadedEffect) {
                    if (conjuredRoundEffect) {
                        currentAmmunition = {
                            name: "Conjured Round",
                            img: CONJURE_BULLET_IMG,
                            id: CONJURED_ROUND_ITEM_ID,
                            sourceId: CONJURED_ROUND_ITEM_ID
                        };
                    }

                    let chamberLoadedFlags = getFlags(chamberLoadedEffect);
                    chamberLoadedFlags = {
                        ...chamberLoadedFlags,
                        ammunition: currentAmmunition
                    };

                    updates.update(
                        chamberLoadedEffect,
                        {
                            "flags.pf2e-ranged-combat": chamberLoadedFlags,
                            "name": `${chamberLoadedEffect.name} (${currentAmmunition.name})`
                        }
                    );
                }
            }

            updates.handleUpdates();
        }
    }
}
