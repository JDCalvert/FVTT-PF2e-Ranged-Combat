import { PF2eActor } from "../types/pf2e/actor.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getFlag, getItem, getItemFromActor } from "../utils/utils.js";
import { HUNTED_PREY_EFFECT_ID, HUNTERS_EDGE_FLURRY_EFFECT_ID, HUNTERS_EDGE_OUTWIT_EFFECT_ID, HUNTERS_EDGE_PRECISION_EFFECT_ID, HUNT_PREY_ACTION_ID, HUNT_PREY_RULES, MASTERFUL_HUNTER_PRECISION_EFFECT_ID, OUTWIT_RULES, PRECISION_FEATURE_ID, PRECISION_RULES, PREY_EFFECT_ID, RANGERS_ANIMAL_COMPANION_FEAT_ID } from "./constants.js";
import { checkHuntPrey, performHuntPrey } from "./hunt-prey.js";

export function initialiseHuntPrey() {

    // When posting the Hunt Prey chat message, use the Hunt Prey action
    HookManager.register(
        "post-action",
        ({ actor, item, result }) => {
            if (item.sourceId != HUNT_PREY_ACTION_ID) {
                return;
            }

            result.match = true;

            const checkResult = checkHuntPrey(actor);
            if (!checkResult.valid) {
                return;
            }

            performHuntPrey(actor, null, item, checkResult);
        }
    );

    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Item.documentClasses.effect.prototype._preCreate",
        function(wrapper, ...args) {
            const source = args[0];
            const sourceId = source.flags?.core?.sourceId;
            if (sourceId == HUNTERS_EDGE_PRECISION_EFFECT_ID) {
                this._source.system.rules = [HUNT_PREY_RULES, PRECISION_RULES].flat();
            }

            if (sourceId == HUNTERS_EDGE_OUTWIT_EFFECT_ID) {
                this._source.system.rules = [HUNT_PREY_RULES, OUTWIT_RULES].flat();
            }

            wrapper(...args);
        }
    );

    // When creating the Hunt Prey effect, also create Hunted Prey effects on the targets
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
                                "sourceEffectId": this.id,
                                "hunter-signature": this.actor.signature
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

    // When deleting the Hunt Prey effect, delete the Hunted Prey effects on the targets
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
                            .find(effect => {
                                // Delete any prey's efffect
                                if (effect.sourceId === PREY_EFFECT_ID && getFlag(effect, "sourceEffectId") === this.id) {
                                    return true;
                                }

                                // Delete any shared prey effects
                                if ([HUNTERS_EDGE_FLURRY_EFFECT_ID, HUNTERS_EDGE_OUTWIT_EFFECT_ID, HUNTERS_EDGE_PRECISION_EFFECT_ID].includes(effect.sourceId) && effect.origin === this.actor) {
                                    return true;
                                }

                                return false;
                            })
                            ?.delete()
                    );
            }

            wrapper(...args);
        },
        "WRAPPER"
    );

    // On encounter end, reset the precision roll options to the first attack
    libWrapper.register(
        "pf2e-ranged-combat",
        "game.pf2e.effectTracker.constructor.prototype.onEncounterEnd",
        async function(wrapper, encounter) {
            await wrapper(encounter);

            const actors = encounter.combatants.contents.flatMap((c) => c.actor ?? []);
            for (const actor of actors) {
                resetPrecision(actor);
            }
        }
    );

    // At the start of the turn, reset the precision roll options to the first attack
    Hooks.on(
        "pf2e.startTurn",
        combatant => {
            const actor = combatant.actor;
            if (actor) {
                resetPrecision(actor);
            }
        }
    );

    // When we make a damage roll, increment any precision rule elements to the next attack
    HookManager.register(
        "damage-roll",
        ({ actor, target, updates }) => {
            if (!game?.combats?.active) {
                return;
            }

            const precisionFeature = getItemFromActor(actor, PRECISION_FEATURE_ID);
            if (precisionFeature) {
                const targetIsHuntedPrey =
                    target?.getRollOptions()?.includes(`self:prey:${actor.signature}`) ||
                    actor.getRollOptions().includes("hunted-prey");

                if (targetIsHuntedPrey) {
                    updateForPrecision(precisionFeature, updates);
                }
            }

            const rangersAnimalCompanionFeat = getItemFromActor(actor, RANGERS_ANIMAL_COMPANION_FEAT_ID);
            if (rangersAnimalCompanionFeat) {
                const masterSignature = getFlag(rangersAnimalCompanionFeat, "master-signature");
                const targetIsHuntedPrey =
                    target?.getRollOptions()?.includes(`self:prey:${masterSignature}`) ||
                    actor.getRollOptions().includes("hunted-prey");

                if (targetIsHuntedPrey) {
                    updateForPrecision(rangersAnimalCompanionFeat, updates);
                }
            }
        }
    );
}

/**
 * For each item that has a precision rule element, reset the precision selection to "first-attack"
 * @param {PF2eActor} actor 
 */
function resetPrecision(actor) {
    if (actor.primaryUpdater === game.user) {
        const updates = new Updates(actor);

        const itemIds = [
            PRECISION_FEATURE_ID,
            RANGERS_ANIMAL_COMPANION_FEAT_ID,
            HUNTERS_EDGE_PRECISION_EFFECT_ID,
            MASTERFUL_HUNTER_PRECISION_EFFECT_ID
        ];

        itemIds.forEach(id => {
            const item = getItemFromActor(actor, id);
            if (item) {
                const rules = item.toObject().system.rules;
                const precisionRule = rules.find(rule => rule.key == "RollOption" && rule.option == "precision");

                if (precisionRule) {
                    precisionRule.selection = "first-attack";
                    updates.update(item, { "system.rules": rules });
                }
            }
        });

        updates.handleUpdates();
    }

    // If we have an animal companion, reset them too
    const animalCompanionId = getFlag(actor, "animalCompanionId");
    const animalCompanion = game.actors.get(animalCompanionId);
    if (animalCompanion) {
        resetPrecision(animalCompanion);
    }
}

function updateForPrecision(precisionFeat, updates) {
    const rules = precisionFeat.toObject().system.rules;
    const precisionRule = rules.find(rule => rule.key == "RollOption" && rule.option == "precision");

    if (precisionRule) {
        switch (precisionRule.selection) {
            case "first-attack":
                precisionRule.selection = "second-attack";
                break;
            case "second-attack":
                precisionRule.selection = "third-attack";
                break;
            case "third-attack":
                break;
            default:
                precisionRule.selection = "second-attack";
        }

        updates.update(
            precisionFeat,
            {
                "system.rules": rules
            }
        );
    }
}

/**
 * Check if the user's current target is the actor's hunted prey
 * @param {PF2eActor} actor 
 */
export function isTargetHuntedPrey(actor) {
    const targetToken = game.user.targets.first();
    if (!targetToken) {
        return false;
    }

    const targetRollOptions = targetToken.actor?.getRollOptions();
    if (!targetRollOptions) {
        return false;
    }

    // Check if this If the target is this our hunted prey, then add the option
    if (targetRollOptions.includes(`self:prey:${actor.signature}`)) {
        return true;
    }

    // If we're the animal companion of a ranger, check if the target is our master's 
    const rangersAnimalCompanionFeat = getItemFromActor(actor, RANGERS_ANIMAL_COMPANION_FEAT_ID);
    if (rangersAnimalCompanionFeat) {
        const masterSignature = getFlag(rangersAnimalCompanionFeat, "master-signature");
        if (targetRollOptions.includes(`self:prey:${masterSignature}`)) {
            return true;
        }
    }

    return false;
}
