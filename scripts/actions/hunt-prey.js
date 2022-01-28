import { PF2eRangedCombat } from "../utils.js";

export async function huntPrey() {
    const effectsToAdd = [];

    const myToken = PF2eRangedCombat.getControlledToken();
    const myActor = myToken?.actor;
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your assigned character must have one token")
        return;
    }

    if (!PF2eRangedCombat.actorHasItem(myActor, PF2eRangedCombat.HUNT_PREY_FEATURE_ID)) {
        ui.notifications.warn("You do not have the Hunt Prey feature");
        return;
    }

    const target = PF2eRangedCombat.getTarget();
    if (!target) {
        return;
    }

    /**
     * HUNT PREY ACTION AND EFFECT
     */
    {
        const myHuntPreyAction = await PF2eRangedCombat.getItemFromActor(myActor, PF2eRangedCombat.HUNT_PREY_ACTION_ID, true);
        myHuntPreyAction.toMessage();

        // Remove any existing hunted prey effects
        const existing = await PF2eRangedCombat.getItemFromActor(myActor, PF2eRangedCombat.HUNTED_PREY_EFFECT_ID);
        if (existing) await existing.delete();

        // Add the new effect
        const huntedPreyEffect = await PF2eRangedCombat.getItem(PF2eRangedCombat.HUNTED_PREY_EFFECT_ID);
        huntedPreyEffect.name = `${huntedPreyEffect.name} (${target.name})`;
        huntedPreyEffect.flags["pf2e-ranged-combat"] = {
            targetId: target.id
        };
        effectsToAdd.push(huntedPreyEffect);

        // Set the Hunt Prey flag, since we're currently targetting our hunted prey
        myActor.setFlag("pf2e", "rollOptions.all.hunted-prey", true)
    }

    /**
     * CROSSBOW ACE
     */
    {
        if (PF2eRangedCombat.actorHasItem(myActor, PF2eRangedCombat.CROSSBOW_ACE_FEAT_ID)) {
            let weapons = await getCrossbows(myActor);

            for (const weapon of weapons) {
                const existing = await PF2eRangedCombat.getEffectFromActor(myActor, PF2eRangedCombat.CROSSBOW_ACE_EFFECT_ID, weapon.id);
                if (existing) await existing.delete();

                const effect = await PF2eRangedCombat.getItem(PF2eRangedCombat.CROSSBOW_ACE_EFFECT_ID);
                PF2eRangedCombat.setEffectTarget(effect, weapon);

                // Until DamageDice "upgrade" is in the system, we have to hack it
                const damageDieRule = effect.data.rules.find(rule => rule.key === "DamageDice");
                damageDieRule.override.dieSize = PF2eRangedCombat.getNextDieSize(weapon.damageDie);

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
                name: weapon.name,
                damageDie: weapon.data.damage.die
            }
        });
}