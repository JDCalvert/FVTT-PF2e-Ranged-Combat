import { handleHuntPrey } from "../feats/crossbow-feats.js";
import { getControlledActorAndToken, getEffectFromActor, getItem, getItemFromActor, getTarget, postActionInChat, postInChat, setEffectTarget, showWarning, Updates } from "../utils/utils.js";

export const HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.JYi4MnsdFu618hPm";
export const HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.rdLADYwOByj8AZ7r";
export const HUNT_PREY_IMG = "systems/pf2e/icons/features/classes/hunt-prey.webp";

export async function huntPrey() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const updates = new Updates(actor);

    const huntPreyAction = getItemFromActor(actor, HUNT_PREY_ACTION_ID);
    if (!huntPreyAction) {
        showWarning(`${token.name} does not have the Hunt Prey action.`);
        return;
    }

    const target = getTarget();
    if (!target) {
        return;
    }

    // Check if the target is already hunted prey
    if (getEffectFromActor(actor, HUNTED_PREY_EFFECT_ID, target.id)) {
        showWarning(`${target.name} is already ${token.name}'s hunted prey.`);
        return;
    }

    /**
     * HUNT PREY ACTION AND EFFECT
     */
    {
        await postActionInChat(huntPreyAction);
        await postInChat(
            actor,
            HUNT_PREY_IMG,
            `${token.name} makes ${target.name} their hunted prey.`,
            huntPreyAction.name,
            1
        );

        // Remove any existing hunted prey effects
        const existing = getItemFromActor(actor, HUNTED_PREY_EFFECT_ID);
        if (existing) {
            updates.remove(existing);
        }

        // Add the new effect
        const huntedPreyEffectSource = await getItem(HUNTED_PREY_EFFECT_ID);
        setEffectTarget(huntedPreyEffectSource, target);
        updates.add(huntedPreyEffectSource);

        // Update the hunted prey flag to true
        const rules = huntPreyAction.toObject().data.rules;
        const rule = rules.find(r => r.key === "RollOption" && r.option === "hunted-prey" && !r.value);
        if (rule) {
            rule.value = true;
            updates.update(() => huntPreyAction.update({ "data.rules": rules }))
        }
    }

    await handleHuntPrey(actor, updates);

    updates.handleUpdates();
}
