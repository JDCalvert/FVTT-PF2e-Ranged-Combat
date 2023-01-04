import { getFlag, getItemFromActor } from "../utils/utils.js";
import { HUNTED_PREY_EFFECT_ID, HUNT_PREY_ACTION_ID } from "./hunt-prey.js";

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
