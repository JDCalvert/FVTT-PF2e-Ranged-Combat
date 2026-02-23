import { WeaponAttackProcessParams } from "../core/hook-params.js";
import { HookManager } from "../utils/hook-manager.js";
import { getEffectFromActor, getItemFromActor, Util } from "../utils/utils.js";

const SWORD_AND_PISTOL_FEAT_ID = "Compendium.pf2e.feats-srd.Item.dWbISC0di0r4oPCi";
const SWORD_AND_PISTOL_MELEE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.uBNgQB5SpFpRzg3w";
const SWORD_AND_PISTOL_RANGED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.kJvn2fXHkjUnexyD";

export class SwordAndPistol {
    static initialise() {
        HookManager.register("weapon-attack", handleWeaponAttack);
    }
}

/**
 * When an attack is made with a one-handed melee weapon or one-handed crossbow or firearm, apply the
 * relevant Sword and Pistol effect.
 * 
 * @param {WeaponAttackProcessParams} params
 */
function handleWeaponAttack({ weapon, updates, context, roll }) {
    const swordAndPistolFeat = getItemFromActor(weapon.actor, SWORD_AND_PISTOL_FEAT_ID);
    if (!swordAndPistolFeat) {
        return;
    }

    // We only want to do anything if this is a one-handed attack
    if (weapon.hands != 1) {
        return;
    }

    // Find the attack target
    const target = context.target;
    if (!target) {
        return;
    }

    const targetUuid = target.token.uuid;

    const existingMeleeEffect = getEffectFromActor(weapon.actor, SWORD_AND_PISTOL_MELEE_EFFECT_ID, targetUuid);
    const existingRangedEffect = getEffectFromActor(weapon.actor, SWORD_AND_PISTOL_RANGED_EFFECT_ID, targetUuid);

    if (weapon.isRanged && (weapon.group == "firearm" || weapon.group == "crossbow")) {
        // Remove the existing melee effect
        if (existingMeleeEffect) {
            updates.delete(existingMeleeEffect);
        }

        // If there isn't already a ranged effect, add one
        if (!existingRangedEffect && roll.degreeOfSuccess >= 2 && target.distance <= weapon.actor.getReach()) {
            addEffect(weapon.actor, updates, SWORD_AND_PISTOL_RANGED_EFFECT_ID, targetUuid);
        }
    } else if (!weapon.isRanged) {
        // Remove the existing ranged effect
        if (existingRangedEffect) {
            updates.delete(existingRangedEffect);
        }

        // If there isn't already a melee effect, add one
        if (!existingMeleeEffect && roll.degreeOfSuccess >= 2) {
            addEffect(weapon.actor, updates, SWORD_AND_PISTOL_MELEE_EFFECT_ID, targetUuid);
        }
    }
}

/**
 * Add the Sword and Pistol effect to the actor and set its target to the current target
 * 
 * @param {ActorPF2e} actor
 * @param {string} effectId
 * @returns 
 */
function addEffect(actor, updates, effectId, targetUuid) {
    updates.deferredUpdate(
        async () => {
            const effectSource = await Util.getSource(effectId);
            const [swordAndPistolMeleeEffect] = await actor.createEmbeddedDocuments("Item", [effectSource]);

            // Update the TokenMark rule to set the target ID
            const source = swordAndPistolMeleeEffect.toObject();
            const tokenMarkRule = source.system.rules.find(rule => rule.key == "TokenMark");

            delete tokenMarkRule.ignored;
            tokenMarkRule.uuid = targetUuid;

            swordAndPistolMeleeEffect.update(
                {
                    "system.rules": source.system.rules,
                    "flags.pf2e-ranged-combat.targetId": targetUuid
                }
            );
        }
    );
}
