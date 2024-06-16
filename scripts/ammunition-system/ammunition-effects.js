import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eConsumable } from "../types/pf2e/consumable.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getEffectFromActor, getItem, setEffectTarget } from "../utils/utils.js";

const AMMUNITION_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.FmD8SBZdehiClhx7";

export function initialiseAmmunitionEffects() {
    HookManager.register("ammunition-fire", handleAmmunitionFired);
    HookManager.register("weapon-damage", removeAmmunitionEffect);
    HookManager.register("reload", removeAmmunitionEffect);
}

/**
 * When rolling a weapon attack, remove any previous ammunition effect and create a new one if required. 
 * 
 * @param {Weapon} weapon               The weapon firing the ammunition
 * @param {PF2eConsumable} ammunition   The ammunition being fired
 * @param {Updates} updates 
 */
function handleAmmunitionFired({ weapon, ammunition, updates }) {
    const ammunitionEffect = getEffectFromActor(weapon.actor, AMMUNITION_EFFECT_ID, weapon.id);
    if (ammunitionEffect) {
        updates.delete(ammunitionEffect);
    }

    updates.deferredUpdate(
        async () => {
            if (ammunition.system.rules.length) {
                for (const rule of ammunition.system.rules) {

                    // Change the rule's selector(s) to point directly to the weapon that was fired
                    if (rule.selector) {
                        for (let i = 0; i < rule.selector.length; i++) {
                            rule.selector[i] = rule.selector[i].replace(/{item\|\_?id}/, "{item|flags.pf2e.rulesSelections.weapon}");
                        }
                    }

                    // Change any definition rule to point to the weapon ID instead of the item ID
                    if (rule.definition) {
                        for (let i = 0; i < rule.definition.length; i++) {
                            rule.definition[i] = rule.definition[i].replace(/{item\|\_?id}/, "{item|flags.pf2e.rulesSelections.weapon}");
                        }
                    }
                }

                const ammunitionEffectSource = await getItem(AMMUNITION_EFFECT_ID);
                setEffectTarget(ammunitionEffectSource, weapon, false);
                ammunitionEffectSource.name = `${ammunition.name} (${weapon.name})`;
                ammunitionEffectSource.img = ammunition.img;
                ammunitionEffectSource.system.rules = ammunition.system.rules;
                ammunitionEffectSource.system.description = ammunition.system.description;

                updates.create(ammunitionEffectSource);
            }
        }
    );
}

/**
 * Remove the ammunition effect for the weapon.
 * 
 * @param {Weapon} weapon 
 * @param {Updates} updates 
 */
function removeAmmunitionEffect({ weapon, updates }) {
    const ammunitionEffect = getEffectFromActor(weapon.actor, AMMUNITION_EFFECT_ID, weapon.id);
    if (ammunitionEffect) {
        updates.delete(ammunitionEffect);
    }
}
