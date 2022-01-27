huntPrey();

async function huntPrey() {
    const HUNT_PREY_FEATURE_ID = "Compendium.pf2e.classfeatures.0nIOGpHQNHsKSFKT";
    const HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.JYi4MnsdFu618hPm";
    const HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.rdLADYwOByj8AZ7r";
    const CROSSBOW_ACE_FEAT_ID = "Compendium.pf2e.feats-srd.CpjN7v1QN8TQFcvI";
    const CROSSBOW_ACE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.zP0vPd14V5OG9ZFv";

    const effectsToAdd = [];

    const myToken = getControlledToken();
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your assigned character must have one token")
        return;
    }

    if (!actorHasItem(myToken, HUNT_PREY_FEATURE_ID)) {
        ui.notifications.warn("You do not have the Hunt Prey feature");
        return;
    }

    const target = getTarget();
    if (!target) {
        return;
    }

    /**
     * HUNT PREY ACTION AND EFFECT
     */
    {
        const myHuntPreyAction = await getItemFromActor(myToken, HUNT_PREY_ACTION_ID, true);
        myHuntPreyAction.toMessage();

        // Remove any existing hunted prey effects
        const existing = await getItemFromActor(myToken, HUNTED_PREY_EFFECT_ID);
        if (existing) await existing.delete();

        // Add the new effect
        const huntedPreyEffect = await getItem(HUNTED_PREY_EFFECT_ID);
        huntedPreyEffect.name = `${huntedPreyEffect.name} (${target.name})`;
        huntedPreyEffect.flags["pf2e-ranged-combat"] = {
            targetId: target.id
        };
        effectsToAdd.push(huntedPreyEffect);

        // Set the Hunt Prey flag, since we're currently targetting our hunted prey
        myToken.actor.setFlag("pf2e", "rollOptions.all.hunted-prey", true)
    }

    /**
     * CROSSBOW ACE
     */
    {
        if (actorHasItem(myToken, CROSSBOW_ACE_FEAT_ID)) {
            let weapons = await getWeapons(myToken);

            for (const weapon of weapons) {
                const existing = await getEffectFromActor(myToken, CROSSBOW_ACE_EFFECT_ID, weapon._id);
                if (existing) await existing.delete();

                const effect = await getItem(CROSSBOW_ACE_EFFECT_ID);
                setEffectTarget(effect, weapon);

                // Until DamageDice "upgrade" is in the system, we have to hack it
                const damageDieRule = effect.data.rules.find(rule => rule.key === "DamageDice");
                damageDieRule.override.dieSize = getNextDieSize(weapon.data.damage.die);

                effectsToAdd.push(effect);
            }
        }
    }

    myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getControlledToken() {
    return [canvas.tokens.controlled, game.user.character?.getActiveTokens()]
        .filter(tokens => !!tokens)
        .find(tokens => tokens.length === 1)
        ?.[0];
}

function getTarget() {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));
    if (!targetTokens.length) {
        ui.notifications.warn("No target selected");
    } else if (targetTokens.length > 1) {
        ui.notifications.warn("You must have only one target selected");
    } else {
        return targetTokens[0];
    }
}

function getWeapons(token) {
    return token.actor.itemTypes.weapon
        .map(weapon => weapon.data)
        .filter(weapon => weapon.data.equipped.value)
        .filter(weapon => weapon.data.traits.otherTags.includes("crossbow"));
}

function actorHasItem(token, sourceId) {
    return token.actor.items.some(item => item.getFlag("core", "sourceId") === sourceId);
}

async function getItemFromActor(token, sourceId, addIfNotPresent = false) {
    let myItem = token.actor.items.find(item => item.getFlag("core", "sourceId") === sourceId);
    if (!myItem && addIfNotPresent) {
        const newItem = await getItem(sourceId);
        await token.actor.createEmbeddedDocuments("Item", [newItem]);
        myItem = await getItemFromActor(token, sourceId);
    }
    return myItem;
}

function getEffectFromActor(token, sourceId, targetId) {
    return token.actor.itemTypes.effect.find(effect =>
        effect.getFlag("core", "sourceId") === sourceId
        && effect.getFlag("pf2e-ranged-combat", "targetId") === targetId
    );
}

async function getItem(id) {
    const source = (await fromUuid(id)).toObject();
    source.flags.core ??= {};
    source.flags.core.sourceId = id;
    source._id = randomID();
    return source;
}

function setEffectTarget(effect, weapon) {
    effect.name = `${effect.name} (${weapon.name})`;
    effect.flags["pf2e-ranged-combat"] = {
        targetId: weapon._id
    };

    const rules = effect.data.rules;
    const indexOfEffectTarget = rules.findIndex(rule =>
        rule.key === "EffectTarget"
    );
    rules.splice(indexOfEffectTarget, 1);

    rules.forEach(rule =>
        rule.selector = rule.selector.replace("{item|data.target}", weapon._id)
    );
}

function getNextDieSize(dieSize) {
    switch (dieSize) {
        case "d4":
            return "d6";
        case "d6":
            return "d8";
        case "d8":
            return "d10";
        case "d10":
            return "d12";
        case "d12":
            return "d12";
    }
}
