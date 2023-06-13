import { ensureDuration, getEffectFromActor, getFlag, getItem, getItemFromActor, setEffectTarget } from "../utils/utils.js";
import { getWeapons } from "../utils/weapon-utils.js";

// Crossbow Ace
export const CROSSBOW_ACE_FEAT_ID = "Compendium.pf2e.feats-srd.Item.CpjN7v1QN8TQFcvI";
export const CROSSBOW_ACE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.zP0vPd14V5OG9ZFv";

// Crossbow Crack Shot
export const CROSSBOW_CRACK_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.s6h0xkdKf3gecLk6";
export const CROSSBOW_CRACK_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.hG9i3aOBDZ9Bq9yi";

export async function handleReload(weapon, updates) {
    // Both of these feats only activate if the weapon is an equipped crossbow
    if (!weapon.isCrossbow || !weapon.isEquipped) {
        return;
    }

    if (getItemFromActor(weapon.actor, CROSSBOW_ACE_FEAT_ID)) {
        await applyFeatEffect(weapon, CROSSBOW_ACE_EFFECT_ID, updates);
    }

    if (getItemFromActor(weapon.actor, CROSSBOW_CRACK_SHOT_FEAT_ID)) {
        await applyFeatEffect(weapon, CROSSBOW_CRACK_SHOT_EFFECT_ID, updates);
    }
}

export async function handleHuntPrey(actor, updates) {
    if (getItemFromActor(actor, CROSSBOW_ACE_FEAT_ID)) {
        const weapons = getWeapons(actor, weapon => weapon.isEquipped && weapon.isCrossbow);
        for (const weapon of weapons) {
            await applyFeatEffect(weapon, CROSSBOW_ACE_EFFECT_ID, updates);
        }
    }
}

/**
 * Handle what happens with these feat effects when a weapon is fired. Since they only last for one shot,
 * we need to keep track of whether or not a shot has been fired for the effect already. If so, mark it
 * as having had a shot fired. If a shot has already been fired, remove the effect.
 */
export function handleWeaponFired(weapon, updates) {
    for (const effectId of [CROSSBOW_ACE_EFFECT_ID, CROSSBOW_CRACK_SHOT_EFFECT_ID]) {
        const effect = getEffectFromActor(weapon.actor, effectId, weapon.id);
        if (effect) {
            if (getFlag(effect, "fired")) {
                updates.delete(effect);
            } else {
                updates.update(effect, { "flags.pf2e-ranged-combat.fired": true });
            }
        }
    }
}

async function applyFeatEffect(weapon, effectId, updates) {
    // Remove any existing effects
    const existing = getEffectFromActor(weapon.actor, effectId, weapon.id);
    if (existing) {
        updates.delete(existing);
    }

    // Add the new effect
    const effect = await getItem(effectId);
    setEffectTarget(effect, weapon);
    ensureDuration(weapon.actor, effect);
    effect.flags["pf2e-ranged-combat"].fired = false;

    updates.create(effect);
}
