const PF2E_RANGED_COMBAT_DOMAIN = "pf2e-ranged-combat";

const HUNTED_TARGET_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.rdLADYwOByj8AZ7r";

Hooks.on(
    "targetToken",
    (user) => {
        // Not interested
        if (!user.isSelf) {
            return;
        }

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


    for (actor of controlledActors) {
        const huntedPreyEffect = actor.itemTypes.effect.find(effect =>
            effect.getFlag("core", "sourceId") === HUNTED_TARGET_EFFECT_ID
        )

        const huntedPreyId = huntedPreyEffect?.getFlag(PF2E_RANGED_COMBAT_DOMAIN, "targetId");
        if (!huntedPreyId) {
            continue;
        }

        const isHuntedPrey = targetedIds.length === 1 && targetedIds.includes(huntedPreyId);
        actor.setFlag("pf2e", "rollOptions.all.hunted-prey", isHuntedPrey);
    }
}