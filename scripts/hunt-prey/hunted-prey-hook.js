import { HookManager } from "../utils/hook-manager.js";
import { getFlag, getItem, getItemFromActor } from "../utils/utils.js";
import { FLURRY_FEATURE_ID, HUNTED_PREY_EFFECT_ID, HUNT_PREY_ACTION_ID, PRECISION_FEATURE_ID, PREY_EFFECT_ID, RANGERS_ANIMAL_COMPANION_FEAT_ID } from "./constants.js";

export function initialiseHuntPrey() {
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Item.documentClasses.effect.prototype._onCreate",
        function(wrapper, ...args) {
            if (this.sourceId === HUNTED_PREY_EFFECT_ID) {
                const sourceActorName = this.actor.name;
                const sourceActorID = this.actor.id;
                const targetIds = getFlag(this, "targetIds") ?? [];

                canvas.scene.tokens
                    .filter(token => targetIds.includes(token.id))
                    .map(token => token.actor)
                    .filter(actor => game.user === actor.primaryUpdater)
                    .forEach(async actor => {
                        const preyEffectSource = await getItem(PREY_EFFECT_ID);
                        preyEffectSource.name = `${preyEffectSource.name} (${sourceActorName})`;
                        preyEffectSource.flags = {
                            ...preyEffectSource.flags,
                            "pf2e-ranged-combat": {
                                "sourceEffectId": this.id
                            }
                        };
                        preyEffectSource.system.slug = `prey-${sourceActorID}`;

                        actor.createEmbeddedDocuments("Item", [preyEffectSource]);
                    });
            }

            wrapper(...args);
        },
        "WRAPPER"
    );

    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Item.documentClasses.effect.prototype._onDelete",
        function(wrapper, ...args) {
            if (this.sourceId === HUNTED_PREY_EFFECT_ID) {
                const targetIds = getFlag(this, "targetIds") ?? [];

                canvas.scene.tokens
                    .filter(token => targetIds.includes(token.id))
                    .map(token => token.actor)
                    .filter(actor => game.user === actor.primaryUpdater)
                    .forEach(actor =>
                        actor.itemTypes.effect
                            .find(effect => effect.sourceId === PREY_EFFECT_ID && getFlag(effect, "sourceEffectId") === this.id)
                            ?.delete()
                    );
            }

            wrapper(...args);
        },
        "WRAPPER"
    );

    Hooks.on(
        "pf2e.startTurn",
        async combatant => {
            const actor = combatant.actor;
            if (!actor) {
                return;
            }

            const precisionFeature = getItemFromActor(actor, PRECISION_FEATURE_ID);
            if (precisionFeature) {
                precisionFeature.update(
                    {
                        flags: {
                            "pf2e-ranged-combat": {
                                preyAttackNumber: 1
                            }
                        }
                    }
                );
            }

            const companionId = getFlag(actor, "animalCompanionId");
            if (!companionId) return;

            const companion = await fromUuid(`Actor.${companionId}`);
            if (!companion) return;

            const rangersAnimalCompanionFeat = getItemFromActor(companion, RANGERS_ANIMAL_COMPANION_FEAT_ID);
            if (rangersAnimalCompanionFeat) {
                rangersAnimalCompanionFeat.update(
                    {
                        flags: {
                            "pf2e-ranged-combat": {
                                preyAttackNumber: 1
                            }
                        }
                    }
                );
            }
        }
    );

    // When we make a damage roll, check if this is our first attack, and if it
    HookManager.register(
        "weapon-damage",
        ({ weapon, target, updates }) => {
            if (!game?.combats?.active) {
                return;
            }

            const actor = weapon.actor;

            const precisionFeature = getItemFromActor(actor, PRECISION_FEATURE_ID);
            if (precisionFeature) {
                const targetIsHuntedPrey =
                    target?.getRollOptions()?.includes(`self:effect:prey-${actor.id}`) ||
                    actor.getRollOptions().includes("hunted-prey");

                if (targetIsHuntedPrey) {
                    updateForPrecision(precisionFeature, updates);
                }
            }

            const rangersAnimalCompanionFeat = getItemFromActor(actor, RANGERS_ANIMAL_COMPANION_FEAT_ID);
            if (rangersAnimalCompanionFeat) {
                const masterId = getFlag(rangersAnimalCompanionFeat, "master-id");
                const targetIsHuntedPrey =
                    target?.getRollOptions()?.includes(`self:effect:prey-${masterId}`) ||
                    actor.getRollOptions().includes("hunted-prey");

                if (targetIsHuntedPrey) {
                    updateForPrecision(rangersAnimalCompanionFeat, updates);
                }
            }
        }
    );

    Hooks.on(
        "targetToken",
        (user) => {
            if (user.isSelf) {
                setHuntedPrey();
            }
        }
    );

    Hooks.on("controlToken", setHuntedPrey);
}

function updateForPrecision(precisionFeat, updates) {
    const preyAttackNumber = getFlag(precisionFeat, "preyAttackNumber") ?? 1;
    updates.update(
        precisionFeat,
        {
            flags: {
                "pf2e-ranged-combat": {
                    preyAttackNumber: preyAttackNumber + 1
                }
            }
        }
    );

    const precisionRules = precisionFeat.toObject().system.rules;
    const precisionRule = precisionRules.find(rule => rule.key === "RollOption" && rule.option === "first-attack");
    if (precisionRule && precisionRule.value) {
        precisionRule.value = false;

        updates.update(
            precisionFeat,
            {
                system: {
                    rules: precisionRules
                }
            }
        );
    }
}

async function setHuntedPrey() {
    const targetedIds = game.user.targets.ids;

    const controlledActors = canvas.tokens.controlled.map(token => token.actor).filter(actor => !!actor);
    if (game.user.character) {
        controlledActors.push(game.user.character);
    }

    for (const actor of controlledActors) {
        // If this is a flurry ranger, set the "hunted-prey" roll option if all our targets are our hunted prey
        const flurryFeature = getItemFromActor(actor, FLURRY_FEATURE_ID);
        if (flurryFeature) {
            const huntedPreyEffect = getItemFromActor(actor, HUNTED_PREY_EFFECT_ID);
            if (!huntedPreyEffect) {
                continue;
            }

            const huntedPreyIds = getFlag(huntedPreyEffect, "targetIds");
            if (!huntedPreyIds?.length) {
                continue;
            }

            const areAllTargetsHuntedPrey = !!targetedIds.length && targetedIds.every(targetedId => huntedPreyIds.includes(targetedId));

            const huntPreyAction = getItemFromActor(actor, HUNT_PREY_ACTION_ID);
            if (huntPreyAction) {
                const rules = huntPreyAction.toObject().system.rules;
                const rule = rules.find(r => r.key === "RollOption" && r.option === "hunted-prey" && r.toggleable && r.value !== areAllTargetsHuntedPrey);
                if (rule) {
                    rule.value = areAllTargetsHuntedPrey;
                    huntPreyAction.update({ "system.rules": rules });
                }
            }
        }

        // If we're the animal companion of a flurry ranger, set the "hunted-prey" roll option if all our targets are our master's hunted prey
        const rangersAnimalCompanionFeat = getItemFromActor(actor, RANGERS_ANIMAL_COMPANION_FEAT_ID);
        if (rangersAnimalCompanionFeat) {
            const huntersEdge = getFlag(rangersAnimalCompanionFeat, "hunters-edge");
            const masterId = getFlag(rangersAnimalCompanionFeat, "master-id");
            if (!masterId || huntersEdge != "flurry") {
                continue;
            }

            const master = await fromUuid(`Actor.${masterId}`);
            if (!master) {
                continue;
            }

            const huntedPreyEffect = getItemFromActor(master, HUNTED_PREY_EFFECT_ID);
            if (!huntedPreyEffect) {
                continue;
            }

            const huntedPreyIds = getFlag(huntedPreyEffect, "targetIds");
            if (!huntedPreyIds?.length) {
                continue;
            }

            const areAllTargetsHuntedPrey = !!targetedIds.length && targetedIds.every(targetedId => huntedPreyIds.includes(targetedId));

            const rules = rangersAnimalCompanionFeat.toObject().system.rules;
            const rule = rules.find(r => r.key === "RollOption" && r.option === "hunted-prey" && r.toggleable && r.value != areAllTargetsHuntedPrey);
            if (rule) {
                rule.value = areAllTargetsHuntedPrey;
                rangersAnimalCompanionFeat.update({ "system.rules": rules });
            }
        }
    }
}
