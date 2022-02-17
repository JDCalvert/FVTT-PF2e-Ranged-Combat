import * as Utils from "../utils.js";

export async function huntPrey() {
    const effectsToAdd = [];

    const token = Utils.getControlledToken();
    const actor = token?.actor;
    if (!token) {
        ui.notifications.warn("You must have exactly one token selected, or your assigned character must have one token.")
        return;
    }

    if (!Utils.actorHasItem(actor, Utils.HUNT_PREY_FEATURE_ID)) {
        ui.notifications.warn("You do not have the Hunt Prey feature.");
        return;
    }

    const target = Utils.getTarget();
    if (!target) {
        return;
    }

    //Check if the target is already hunted prey
    if (Utils.getEffectFromActor(actor, Utils.HUNTED_PREY_EFFECT_ID, target.id)) {
        ui.notifications.warn(`${target.name} is already your hunted prey.`);
        return;
    }

    /**
     * HUNT PREY ACTION AND EFFECT
     */
    {
        const myHuntPreyFeature = await Utils.getItemFromActor(actor, Utils.HUNT_PREY_FEATURE_ID);
        await Utils.postActionInChat(actor, Utils.HUNT_PREY_ACTION_ID);
        await Utils.postInChat(
            actor,
            myHuntPreyFeature.name,
            1,
            myHuntPreyFeature.img,
            `${token.name} makes ${target.name} their hunted prey.`
        );

        // Remove any existing hunted prey effects
        const existing = await Utils.getItemFromActor(actor, Utils.HUNTED_PREY_EFFECT_ID);
        if (existing) await existing.delete();

        // Add the new effect
        const huntedPreyEffect = await Utils.getItem(Utils.HUNTED_PREY_EFFECT_ID);
        huntedPreyEffect.name = `${huntedPreyEffect.name} (${target.name})`;
        huntedPreyEffect.flags["pf2e-ranged-combat"] = {
            targetId: target.id
        };
        effectsToAdd.push(huntedPreyEffect);

        // Set the Hunt Prey flag, since we're currently targetting our hunted prey
        actor.setFlag("pf2e", "rollOptions.all.hunted-prey", true);
    }

    /**
     * CROSSBOW ACE
     */
    {
        if (Utils.actorHasItem(actor, Utils.CROSSBOW_ACE_FEAT_ID)) {
            let weapons = await getCrossbows(actor);

            for (const weapon of weapons) {
                const existing = await Utils.getEffectFromActor(actor, Utils.CROSSBOW_ACE_EFFECT_ID, weapon.id);
                if (existing) await existing.delete();

                const effect = await Utils.getItem(Utils.CROSSBOW_ACE_EFFECT_ID);
                Utils.setEffectTarget(effect, weapon);

                effectsToAdd.push(effect);
            }
        }
    }

    myActor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getCrossbows(actor) {
    return actor.itemTypes.weapon
        .map(weapon => weapon.data)
        .filter(weapon => weapon.data.equipped.value)
        .filter(weapon => weapon.data.traits.otherTags.includes("crossbow"))
        .map(weapon => {
            return {
                id: weapon._id,
                name: weapon.name
            }
        });
}
