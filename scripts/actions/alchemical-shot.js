import { ensureDuration, getControlledActorAndToken, getEffectFromActor, getFlag, getItem, getItemFromActor, postActionInChat, postInChat, setEffectTarget, showWarning } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";

const ALCHEMICAL_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.Q1O4P1YIkCfeedHH";
const ALCHEMICAL_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.IYcN1TxztAmnKXi4";

export async function alchemicalShot() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const alchemicalShotFeat = getItemFromActor(actor, ALCHEMICAL_SHOT_FEAT_ID);
    if (!alchemicalShotFeat) {
        showWarning(`${token.name} does not have the Alchemical Shot feat.`);
        return;
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.isEquipped && (weapon.group === "firearm" || weapon.isCrossbow),
        `${token.name} is not wielding a firearm or crossbow.`
    );
    if (!weapon) {
        return;
    }

    const bomb = await getWeapon(
        actor,
        weapon =>
            weapon.baseType === "alchemical-bomb"
            && weapon.quantity > 0,
        `${token.name} has no alchemical bombs.`
    );
    if (!bomb) {
        return;
    }

    const creates = [];
    const updates = [];
    const deletes = [];

    // If there's an existing alchemical shot effect for this weapon, remove it
    const alchemicalShotEffect = getEffectFromActor(weapon.actor, ALCHEMICAL_SHOT_EFFECT_ID, weapon.id);
    if (alchemicalShotEffect) {
        deletes.push(alchemicalShotEffect.id);
    }

    // Create the new effect, and set all the choices using the weapon and bomb
    const alchemicalShotEffectSource = await getItem(ALCHEMICAL_SHOT_EFFECT_ID);
    setEffectTarget(alchemicalShotEffectSource, weapon);
    ensureDuration(actor, alchemicalShotEffectSource);
    alchemicalShotEffectSource.name = `${alchemicalShotEffectSource.name} (${bomb.name})`;
    alchemicalShotEffectSource.flags = {
        ...alchemicalShotEffectSource.flags,
        pf2e: {
            ...alchemicalShotEffectSource.flags?.pf2e,
            rulesSelections: {
                ...alchemicalShotEffectSource.flags?.pf2e?.rulesSelections,
                weapon: weapon.id,
                damageType:  bomb.damageType,
                persistentDamageDice: bomb.level >= 17 ? 3 : bomb.level >= 11 ? 2 : 1
            }
        },
        "pf2e-ranged-combat": {
            ...alchemicalShotEffectSource.flags?.["pf2e-ranged-combat"],
            fired: false
        }
    };
    alchemicalShotEffectSource.system.rules = alchemicalShotEffectSource.system.rules.filter(rule => rule.key != "ChoiceSet");

    creates.push(alchemicalShotEffectSource);
    updates.push({
        _id: bomb.id,
        system: {
            quantity: bomb.quantity - 1
        }
    });

    await postActionInChat(alchemicalShotFeat);
    await postInChat(
        actor,
        bomb.img,
        `${token.name} pours the contents of ${bomb.name} into their ${weapon.name}.`,
        "Alchemical Shot",
        2
    );

    await actor.createEmbeddedDocuments("Item", creates);
    await actor.updateEmbeddedDocuments("Item", updates);
    await actor.deleteEmbeddedDocuments("Item", deletes);
}

/**
 * Check for an Alchemical Shot effect for this weapon. If there is one, then either:
 * - Update the "fired" flag to be true, and remove the failure roll note to prevent it being posted on the next strike
 * - If the "fired" flag is already true, delete the effect
 */
export async function handleWeaponFiredAlchemicalShot(weapon, updates) {
    const alchemicalShotEffect = getEffectFromActor(weapon.actor, ALCHEMICAL_SHOT_EFFECT_ID, weapon.id);
    if (alchemicalShotEffect) {
        if (getFlag(alchemicalShotEffect, "fired")) {
            updates.delete(alchemicalShotEffect);
        } else {
            alchemicalShotEffect.system.rules.findSplice(rule => rule.selector.endsWith("-attack"));
            updates.update(
                alchemicalShotEffect,
                {
                    "flags.pf2e-ranged-combat.fired": true,
                    "system.rules": alchemicalShotEffect.system.rules
                }
            );
        }
    }
}
