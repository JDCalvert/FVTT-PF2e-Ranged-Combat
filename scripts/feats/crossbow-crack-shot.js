import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getItemFromActor, isInCombat, Util } from "../utils/utils.js";
import { Weapon } from "../weapons/types.js";

const CROSSBOW_CRACK_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.s6h0xkdKf3gecLk6";
const CROSSBOW_CRACK_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.hG9i3aOBDZ9Bq9yi";

export function initialiseCrossbowCrackShot() {
    Hooks.on("pf2e.startTurn", handleStartTurn);

    HookManager.register("reload", handleReload);
    HookManager.register("weapon-attack", handleWeaponFired);
    HookManager.register("weapon-damage", handleWeaponDamage);
}

/**
 * At the start of the turn, reset our record of having reloaded this turn
 */
async function handleStartTurn(combatant) {
    const actor = combatant.actor;
    if (!actor) {
        return;
    }

    const crossbowCrackShotFeat = getItemFromActor(actor, CROSSBOW_CRACK_SHOT_FEAT_ID);
    if (crossbowCrackShotFeat) {
        crossbowCrackShotFeat.update({ "flags.pf2e-ranged-combat.reloadedThisTurn": false });
    }
}

/**
 * When reloading, delete any existing Crossbow Crack Shot effect and, if this is the first reload of the round, create a new one.
 * 
 * @param {{weapon: Weapon, updates: Updates}} _
 */
function handleReload({ weapon, updates }) {
    // Remove any existing effect
    const existing = Util.getEffect(weapon, CROSSBOW_CRACK_SHOT_EFFECT_ID);
    if (existing) {
        updates.delete(existing);
    }

    const crossbowCrackShotFeat = getItemFromActor(weapon.actor, CROSSBOW_CRACK_SHOT_FEAT_ID);
    if (!crossbowCrackShotFeat) {
        return;
    }

    // Create the new effect if this is our first reload of the round
    if (!Util.getFlag(crossbowCrackShotFeat, "reloadedThisTurn") || !isInCombat(weapon.actor)) {
        updates.deferredUpdate(
            async () => {
                const source = await Util.getSource(CROSSBOW_CRACK_SHOT_EFFECT_ID);
                Util.setEffectTarget(source, weapon);
                source.flags["pf2e-ranged-combat"].fired = false;

                // There's currently a system bug preventing the weapon damage dice being calculated for the backstabber adjustment - set it manually now
                const adjustModifierRule = source.system.rules.find(rule => rule.key == "AdjustModifier" && rule.slug == "backstabber");
                if (adjustModifierRule) {
                    adjustModifierRule.value = 2 * weapon.damageDice;
                }

                updates.create(source);
            }
        );

        updates.update(
            crossbowCrackShotFeat,
            {
                "flags.pf2e-ranged-combat.reloadedThisTurn": true,
                "system.rules": []
            }
        );
    }
}

/**
 * When the weapon is fired, record on the effect that it has been fired, so we can remove it if we fire again.
 * 
 * @param {{weapon: Weapon, updates: Updates}} _
 */
function handleWeaponFired({ weapon, updates }) {
    const effect = Util.getEffect(weapon, CROSSBOW_CRACK_SHOT_EFFECT_ID);
    if (effect) {
        if (Util.getFlag(effect, "fired")) {
            updates.delete(effect);
        } else {
            updates.update(effect, { "flags.pf2e-ranged-combat.fired": true });
        }
    }
}

/**
 * When the weapon damage is rolled, delete the Crossbow Crack Shot effect.
 * 
 * @param {{weapon: Weapon, updates: Updates}} _
 */
function handleWeaponDamage({ weapon, updates }) {
    const effect = Util.getEffect(weapon, CROSSBOW_CRACK_SHOT_EFFECT_ID);
    if (effect) {
        updates.delete(effect);
    }
}
