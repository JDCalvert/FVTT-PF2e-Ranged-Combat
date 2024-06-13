import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { ensureDuration, getEffectFromActor, getFlag, getItem, getItemFromActor, setEffectTarget } from "../utils/utils.js";
import { getWeapons } from "../utils/weapon-utils.js";

const CROSSBOW_ACE_FEAT_ID = "Compendium.pf2e.feats-srd.Item.CpjN7v1QN8TQFcvI";
const CROSSBOW_ACE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.zP0vPd14V5OG9ZFv";

export function initialiseCrossbowAce() {
    // Apply Crossbow Ace when we reload the weapon
    HookManager.register(
        "reload",
        ({ weapon, updates }) => {
            if (!(weapon.group == "crossbow" && weapon.isEquipped)) {
                return;
            }

            if (hasLegacyCrossbowAce(weapon.actor)) {
                applyFeatEffect(weapon, updates);
            }
        }
    );

    // Apply Crossbow Ace when we Hunt Prey
    HookManager.register(
        "hunt-prey",
        ({ actor, updates }) => {
            if (hasLegacyCrossbowAce(actor)) {
                const weapons = getWeapons(actor, weapon => weapon.isEquipped && weapon.group == "crossbow");
                for (const weapon of weapons) {
                    applyFeatEffect(weapon, updates);
                }
            }
        }
    );

    // When the weapon is fired, record that the effect has been fired. If it's already been fired, delete the effect.
    HookManager.register(
        "weapon-attack",
        ({ weapon, updates }) => {
            const effect = getEffectFromActor(weapon.actor, CROSSBOW_ACE_EFFECT_ID, weapon.id);
            if (effect) {
                if (getFlag(effect, "fired")) {
                    updates.delete(effect);
                } else {
                    updates.update(effect, { "flags.pf2e-ranged-combat.fired": true });
                }
            }
        }
    );

    // When we roll damage for the weapon, remove the effect.
    HookManager.register(
        "weapon-damage",
        ({ weapon, updates }) => {
            const effect = getEffectFromActor(weapon.actor, CROSSBOW_ACE_EFFECT_ID, weapon.id);
            if (effect) {
                updates.delete(effect);
            }
        }
    );
}

/**
 * Check if the actor has the legacy Crossbow Ace feat.
 * 
 * @param {PF2eActor} actor 
 * @returns boolean
 */
function hasLegacyCrossbowAce(actor) {
    const crossbowAceFeat = getItemFromActor(actor, CROSSBOW_ACE_FEAT_ID);
    if (!crossbowAceFeat) {
        return false;
    }

    return crossbowAceFeat.rules.length > 0;
}

/**
 * @param {Weapon} weapon
 * @param {Updates} updates
 */
function applyFeatEffect(weapon, updates) {
    // Remove any existing effects
    const existing = getEffectFromActor(weapon.actor, CROSSBOW_ACE_EFFECT_ID, weapon.id);
    if (existing) {
        updates.delete(existing);
    }

    // Add the new effect
    updates.deferredUpdate(
        async () => {
            const effect = await getItem(CROSSBOW_ACE_EFFECT_ID);
            setEffectTarget(effect, weapon);
            ensureDuration(weapon.actor, effect);
            effect.flags["pf2e-ranged-combat"].fired = false;

            updates.create(effect);
        }
    );
}
