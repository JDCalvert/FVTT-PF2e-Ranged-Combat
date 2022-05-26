import { CROSSBOW_ACE_EFFECT_ID, CROSSBOW_ACE_FEAT_ID, getControlledActorAndToken, getEffectFromActor, getItem, getItemFromActor, getTarget, postActionInChat, postInChat, setEffectTarget, Updates } from "../utils/utils.js";
import { getWeapons } from "../utils/weapon-utils.js";

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
        ui.notifications.warn(`${token.name} does not have the Hunt Prey action.`);
        return;
    }

    const target = getTarget();
    if (!target) {
        return;
    }

    // Check if the target is already hunted prey
    if (getEffectFromActor(actor, HUNTED_PREY_EFFECT_ID, target.id)) {
        ui.notifications.warn(`${target.name} is already ${token.name}'s hunted prey.`);
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

        // Set the Hunt Prey flag, since we're currently targetting our hunted prey
        updates.update(() => actor.setFlag("pf2e", "rollOptions.all.hunted-prey", true));
    }

    /**
     * CROSSBOW ACE
     */
    {
        if (getItemFromActor(actor, CROSSBOW_ACE_FEAT_ID)) {
            const weapons = getWeapons(actor, weapon => weapon.isEquipped && weapon.isCrossbow);
            for (const weapon of weapons) {
                const existing = getEffectFromActor(actor, CROSSBOW_ACE_EFFECT_ID, weapon.id);
                if (existing) {
                    updates.remove(existing);
                }

                const crossbowAceEffectSource = await getItem(CROSSBOW_ACE_EFFECT_ID);
                setEffectTarget(crossbowAceEffectSource, weapon);
                crossbowAceEffectSource.flags["pf2e-ranged-combat"].fired = false;

                updates.add(crossbowAceEffectSource);
            }
        }
    }

    updates.handleUpdates();
}
