import { Chat } from "../utils/chat.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { ensureDuration, getItemFromActor, showWarning, Util } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";
import { Weapon } from "../weapons/types.js";

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
 * @param {PostActionHookData} params
 */
function handlePostAction({ actor, item, result }) {
    if (item.sourceId != ALCHEMICAL_SHOT_FEAT_ID) {
        return;
    }

    result.match = true;

    performForActor(actor, item);
}

export async function alchemicalShot() {
    const actor = Util.getControlledActor();
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
 * @param {ActorPF2e} actor 
 * @param {ItemPF2e} action
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
 * @param {ActorPF2e} actor
 * @param {ItemPF2e} action
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

    await Chat.postAction(action);
    await Chat.post(
        actor,
        bomb.img,
        format("pourBombIntoWeapon", { actor: actor.name, weapon: weapon.name, bomb: bomb.name }),
        {
            actionName: localize("alchemicalShot"),
            actionSymbol: "2",
            traits: ["manipulate"]
        }
    );

    const updates = new Updates(actor);

    // If there's an existing alchemical shot effect for this weapon, remove it
    const alchemicalShotEffect = Util.getEffect(weapon, ALCHEMICAL_SHOT_EFFECT_ID);
    if (alchemicalShotEffect) {
        updates.delete(alchemicalShotEffect);
    }

    // Create the new effect, and set all the choices using the weapon and bomb
    const alchemicalShotEffectSource = await Util.getSource(ALCHEMICAL_SHOT_EFFECT_ID);
    Util.setEffectTarget(alchemicalShotEffectSource, weapon);
    ensureDuration(actor, alchemicalShotEffectSource);
    foundry.utils.mergeObject(
        alchemicalShotEffectSource,
        {
            name: `${alchemicalShotEffectSource.name} (${bomb.name})`,
            flags: {
                pf2e: {
                    rulesSelections: {
                        weapon: weapon.id,
                        damageType: bomb.damageType,
                        persistentDamageDice: bomb.level >= 17 ? 3 : bomb.level >= 11 ? 2 : 1
                    }
                },
                "pf2e-ranged-combat": {
                    fired: false
                }
            },
            system: {
                rules: alchemicalShotEffectSource.system.rules.filter(rule => rule.key != "ChoiceSet")
            }
        }
    );

    updates.create(alchemicalShotEffectSource);
    updates.update(
        bomb,
        {
            system: {
                quantity: bomb.quantity - 1
            }
        }
    );

    updates.commit();
}

/**
 * Check for an Alchemical Shot effect for this weapon. If there is one, then either:
 * - Update the "fired" flag to be true, and remove the failure roll note to prevent it being posted on the next strike
 * - If the "fired" flag is already true, delete the effect
 */
function handleWeaponFired({ weapon, updates }) {
    const alchemicalShotEffect = Util.getEffect(weapon, ALCHEMICAL_SHOT_EFFECT_ID);
    if (alchemicalShotEffect) {
        if (Util.getFlag(alchemicalShotEffect, "fired")) {
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
 * @param {{ weapon: Weapon, updates: Updates }} _
 */
function handleWeaponDamage({ weapon, updates }) {
    const alchemicalShotEffect = Util.getEffect(weapon, ALCHEMICAL_SHOT_EFFECT_ID);
    if (alchemicalShotEffect) {
        updates.delete(alchemicalShotEffect);
    }
}
