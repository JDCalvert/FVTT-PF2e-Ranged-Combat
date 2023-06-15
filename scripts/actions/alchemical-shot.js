import { Updates, ensureDuration, getControlledActorAndToken, getEffectFromActor, getFlag, getItem, getItemFromActor, postActionInChat, postInChat, setEffectTarget, showWarning } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";

const ALCHEMICAL_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Q1O4P1YIkCfeedHH";
const ALCHEMICAL_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.IYcN1TxztAmnKXi4";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.actions.alchemicalShot." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.actions.alchemicalShot." + key, data);

export async function alchemicalShot() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const alchemicalShotFeat = getItemFromActor(actor, ALCHEMICAL_SHOT_FEAT_ID);
    if (!alchemicalShotFeat) {
        showWarning(format("warningNoFeat", { token: token.name }));
        return;
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.isEquipped && (weapon.group === "firearm" || weapon.isCrossbow),
        format("warningNotWieldingProperWeapon", { token: token.name })
    );
    if (!weapon) {
        return;
    }

    const bomb = await getWeapon(
        actor,
        weapon =>
            weapon.baseType === "alchemical-bomb"
            && weapon.quantity > 0,
        format("warningNoAlchemicalBombs", { token: token.name })
    );
    if (!bomb) {
        return;
    }

    const updates = new Updates(actor);

    // If there's an existing alchemical shot effect for this weapon, remove it
    const alchemicalShotEffect = getEffectFromActor(weapon.actor, ALCHEMICAL_SHOT_EFFECT_ID, weapon.id);
    if (alchemicalShotEffect) {
        updates.delete(alchemicalShotEffect);
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
                damageType: bomb.damageType,
                persistentDamageDice: bomb.level >= 17 ? 3 : bomb.level >= 11 ? 2 : 1
            }
        },
        "pf2e-ranged-combat": {
            ...alchemicalShotEffectSource.flags?.["pf2e-ranged-combat"],
            fired: false
        }
    };
    alchemicalShotEffectSource.system.rules = alchemicalShotEffectSource.system.rules.filter(rule => rule.key != "ChoiceSet");

    updates.create(alchemicalShotEffectSource);
    updates.update(
        bomb,
        {
            system: {
                quantity: bomb.quantity - 1
            }
        }
    );

    await postActionInChat(alchemicalShotFeat);
    await postInChat(
        actor,
        bomb.img,
        format("tokenPoursBombIntoWeapon", { token: token.name, weapon: weapon.name, bomb: bomb.name }),
        localize("alchemicalShot"),
        2
    );

    updates.handleUpdates();
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
