import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eItem } from "../types/pf2e/item.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { ensureDuration, getControlledActor, getEffectFromActor, getFlag, getItem, getItemFromActor, postActionToChat, postToChat, setEffectTarget, showWarning } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";

const ALCHEMICAL_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Q1O4P1YIkCfeedHH";
const ALCHEMICAL_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.IYcN1TxztAmnKXi4";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.actions.alchemicalShot." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.actions.alchemicalShot." + key, data);

export function initialiseAlchemicalShot() {
    HookManager.register("weapon-attack", handleWeaponFired);
    HookManager.register("weapon-damage", handleWeaponDamage);
    HookManager.register("post-action", handlePostAction);
}

/**
 * Handle the action being posted to chat.
 * 
 * @param {{ actor: PF2eActor, item: PF2eItem, result: {match: boolean} }} params
 */
function handlePostAction({ actor, item, result }) {
    if (item.sourceId != ALCHEMICAL_SHOT_FEAT_ID) {
        return;
    }

    result.match = true;

    performForActor(actor, item);
}

export async function alchemicalShot() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    const alchemicalShotFeat = getItemFromActor(actor, ALCHEMICAL_SHOT_FEAT_ID);
    if (!alchemicalShotFeat) {
        showWarning(format("warningNoFeat", { actor: actor.name }));
        return;
    }

    performForActor(actor, alchemicalShotFeat);
}

/**
 * @param {PF2eActor} actor 
 * @param {PF2eItem} action
 */
async function performForActor(actor, action) {
    const weapon = await getWeapon(
        actor,
        weapon => weapon.isEquipped && (weapon.group == "firearm" || weapon.group == "crossbow"),
        format("warningNotWieldingProperWeapon", { actor: actor.name })
    );
    if (!weapon) {
        return;
    }

    performForActorAndWeapon(actor, action, weapon);
}

/**
 * @param {PF2eActor} actor
 * @param {PF2eItem} action
 * @param {Weapon} weapon
 */
async function performForActorAndWeapon(actor, action, weapon) {
    const bomb = await getWeapon(
        actor,
        weapon =>
            weapon.baseType === "alchemical-bomb"
            && weapon.quantity > 0,
        format("warningNoAlchemicalBombs", { actor: actor.name })
    );
    if (!bomb) {
        return;
    }

    await postActionToChat(action);
    await postToChat(
        actor,
        bomb.img,
        format("pourBombIntoWeapon", { actor: actor.name, weapon: weapon.name, bomb: bomb.name }),
        localize("alchemicalShot"),
        2
    );

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

    updates.handleUpdates();
}

/**
 * Check for an Alchemical Shot effect for this weapon. If there is one, then either:
 * - Update the "fired" flag to be true, and remove the failure roll note to prevent it being posted on the next strike
 * - If the "fired" flag is already true, delete the effect
 */
function handleWeaponFired({ weapon, updates }) {
    const alchemicalShotEffect = getEffectFromActor(weapon.actor, ALCHEMICAL_SHOT_EFFECT_ID, weapon.id);
    if (alchemicalShotEffect) {
        if (getFlag(alchemicalShotEffect, "fired")) {
            updates.delete(alchemicalShotEffect);
        } else {
            alchemicalShotEffect.system.rules.findSplice(rule => rule.selector.some(selector => selector.endsWith("-attack")));
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

/**
 * Remove any Alchemical Shot effects for the weapon.
 * 
 * @param {{ weapon: Weapon, updates: Updates }}
 */
function handleWeaponDamage({ weapon, updates }) {
    const alchemicalShotEffect = getEffectFromActor(weapon.actor, ALCHEMICAL_SHOT_EFFECT_ID, weapon.id);
    if (alchemicalShotEffect) {
        updates.delete(alchemicalShotEffect);
    }
}
