import * as Utils from "../utils/utils.js";

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
        const huntedPreyEffect = actor.itemTypes.effect.find(effect =>
            effect.getFlag("core", "sourceId") === Utils.HUNTED_PREY_EFFECT_ID
        );

        const huntedPreyId = huntedPreyEffect?.getFlag("pf2e-ranged-combat", "targetId");
        if (!huntedPreyId) {
            continue;
        }

        const isHuntedPrey = targetedIds.length === 1 && targetedIds.includes(huntedPreyId);
        actor.setFlag("pf2e", "rollOptions.all.hunted-prey", isHuntedPrey);
    }
}
