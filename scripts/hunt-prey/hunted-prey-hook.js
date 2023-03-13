import { getFlag, getItem, getItemFromActor, Updates } from "../utils/utils.js";
import { HUNTED_PREY_EFFECT_ID, HUNT_PREY_ACTION_ID, PREY_EFFECT_ID } from "./hunt-prey.js";

Hooks.on(
    "ready",
    () => {
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Item.documentClasses.effect.prototype._onCreate",
            function(wrapper, ...args) {
                if (this.sourceId === HUNTED_PREY_EFFECT_ID) {
                    const sourceActorName = this.actor.name;
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
    }
);

Hooks.on(
    "targetToken",
    (user) => {
        if (!user.isSelf) return;
        setHuntedPrey();
    }
);

Hooks.on(
    "controlToken",
    () => {
        setHuntedPrey();
    }
);

function setHuntedPrey() {
    const targetedIds = game.user.targets.ids;

    const controlledActors = canvas.tokens.controlled.map(token => token.actor).filter(actor => !!actor);
    if (game.user.character) {
        controlledActors.push(game.user.character);
    }

    for (const actor of controlledActors) {
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
            const rules = huntPreyAction.system.rules;
            const rule = rules.find(r => r.key === "RollOption" && r.option === "hunted-prey" && r.value !== areAllTargetsHuntedPrey);
            if (rule && rule.value != areAllTargetsHuntedPrey) {
                rule.value = areAllTargetsHuntedPrey;
                huntPreyAction.update({ "system.rules": rules });
            }
        }
    }
}
