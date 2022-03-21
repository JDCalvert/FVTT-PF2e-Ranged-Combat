import { Updates } from "../utils.js";
import * as Utils from "../utils.js";

export async function huntPrey() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const updates = new Updates(actor);

    if (!Utils.actorHasItem(actor, Utils.HUNT_PREY_FEATURE_ID)) {
        ui.notifications.warn(`${token.name} does not have the Hunt Prey feature.`);
        return;
    }

    const target = Utils.getTarget();
    if (!target) {
        return;
    }

    // Check if the target is already hunted prey
    if (Utils.getEffectFromActor(actor, Utils.HUNTED_PREY_EFFECT_ID, target.id)) {
        ui.notifications.warn(`${target.name} is already ${token.name}'s hunted prey.`);
        return;
    }

    /**
     * HUNT PREY ACTION AND EFFECT
     */
    {
        const huntPreyFeature = await Utils.getItemFromActor(actor, Utils.HUNT_PREY_FEATURE_ID);
        await Utils.postActionInChat(actor, Utils.HUNT_PREY_ACTION_ID);
        await Utils.postInChat(
            actor,
            huntPreyFeature.img,
            `${token.name} makes ${target.name} their hunted prey.`,
            huntPreyFeature.name,
            1
        );

        // Remove any existing hunted prey effects
        const existing = await Utils.getItemFromActor(actor, Utils.HUNTED_PREY_EFFECT_ID);
        if (existing) {
            updates.remove(existing);
        }

        // Add the new effect
        const huntedPreyEffect = await Utils.getItem(Utils.HUNTED_PREY_EFFECT_ID);
        huntedPreyEffect.name = `${huntedPreyEffect.name} (${target.name})`;
        huntedPreyEffect.flags["pf2e-ranged-combat"] = {
            targetId: target.id
        };
        updates.add(huntedPreyEffect);

        // Set the Hunt Prey flag, since we're currently targetting our hunted prey
        updates.update(() => actor.setFlag("pf2e", "rollOptions.all.hunted-prey", true));
    }

    /**
     * CROSSBOW ACE
     */
    {
        if (Utils.actorHasItem(actor, Utils.CROSSBOW_ACE_FEAT_ID)) {
            let weapons = await getWieldedCrossbows(actor);

            for (const weapon of weapons) {
                const existing = await Utils.getEffectFromActor(actor, Utils.CROSSBOW_ACE_EFFECT_ID, weapon.id);
                if (existing) {
                    updates.remove(existing);
                }

                const effect = await Utils.getItem(Utils.CROSSBOW_ACE_EFFECT_ID);
                Utils.setEffectTarget(effect, weapon);
                effect.flags["pf2e-ranged-combat"].fired = false;

                updates.add(effect);
            }
        }
    }

    updates.handleUpdates();
}

function getWieldedCrossbows(actor) {
    return actor.itemTypes.weapon
        .filter(weapon => weapon.isEquipped)
        .filter(weapon => weapon.data.data.traits.otherTags.includes("crossbow"))
        .map(weapon => {
            return {
                id: weapon.id,
                name: weapon.name
            };
        });
}
