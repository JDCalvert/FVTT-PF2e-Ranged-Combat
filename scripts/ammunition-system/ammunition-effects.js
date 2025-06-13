import { postToChatConfig } from "../pf2e-ranged-combat.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eConsumable } from "../types/pf2e/consumable.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getEffectFromActor, getFlag, getItem, setEffectTarget } from "../utils/utils.js";

const AMMUNITION_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.FmD8SBZdehiClhx7";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.effect." + key);

export function initialiseAmmunitionEffects() {

    // Disable the PF2e system automatically applying ammunition ammunition rules its weapon
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Item.documentClasses.weapon.prototype.prepareSiblingData",
        function (wrapper) {
            if (!isAmmunitionEffectsEnabled()) {
                wrapper();
            } else {
                Object.getPrototypeOf(CONFIG.PF2E.Item.documentClasses.weapon).prototype.prepareSiblingData.apply(this);
            }
        },
        "MIXED"
    );

    HookManager.register("ammunition-fire", handleAmmunitionFired);
    HookManager.register("weapon-damage", handleWeaponDamage);
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
    if (!isAmmunitionEffectsEnabled()) {
        return;
    }

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
                foundry.utils.mergeObject(
                    ammunitionEffectSource,
                    {
                        "name": `${ammunition.name} (${weapon.name})`,
                        "img": ammunition.img,
                        "system": {
                            "rules": ammunition.system.rules,
                            "description": ammunition.system.description
                        },
                        "flags.pf2e-ranged-combat.ammunition": {
                            "name": ammunition.name,
                            "img": ammunition.img,
                            "id": ammunition.id,
                            "sourceId": ammunition.sourceId
                        }
                    }
                );

                updates.create(ammunitionEffectSource);
            }
        }
    );
}

/**
 * Remove the current ammunition effect. Also, show a warning if the weapon's current ammunition doesn't match the ammunition effect, or if the weapon's current
 * ammunition has an effect but no ammunition effect is currently applied.
 * 
 * @param {{ weapon: Weapon, updates: Updates}} params
 */
function handleWeaponDamage({ weapon, updates }) {
    if (!isAmmunitionEffectsEnabled()) {
        return;
    }

    const weaponAmmunition = weapon.ammunition;
    const ammunitionEffect = getEffectFromActor(weapon.actor, AMMUNITION_EFFECT_ID, weapon.id);

    if (ammunitionEffect) {
        const effectAmmunition = getFlag(ammunitionEffect, "ammunition");
        if (weaponAmmunition?.sourceId != effectAmmunition?.sourceId) {
            showWarning("notMatched");
        }

        removeAmmunitionEffect({ weapon, updates });
    } else if (weaponAmmunition?.rules?.length) {
        showWarning("damageWithoutEffect");
    }
}

/**
 * Remove the ammunition effect for the weapon.
 * 
 * @param {{ weapon: Weapon, updates: Updates}} params
 */
function removeAmmunitionEffect({ weapon, updates }) {
    if (!isAmmunitionEffectsEnabled()) {
        return;
    }

    const ammunitionEffect = getEffectFromActor(weapon.actor, AMMUNITION_EFFECT_ID, weapon.id);
    if (ammunitionEffect) {
        updates.delete(ammunitionEffect);
    }
}

function isAmmunitionEffectsEnabled() {
    return game.settings.get("pf2e-ranged-combat", "ammunitionEffectsEnable");
}

/**
 * Show a warning about the ammunition effect. The warning will be displayed based on the user's preference.
 * 
 * @param {string} warningMessage which warning message to show
 */
function showWarning(warningMessage) {
    const warningLevel = game.settings.get("pf2e-ranged-combat", "ammunitionEffectsWarningLevel");
    if (warningLevel == postToChatConfig.full) {
        new foundry.applications.api.DialogV2(
            {
                window: {
                    title: game.i18n.localize("pf2e-ranged-combat.module-name")
                },
                position: {
                    width: 600
                },
                content: `<p>${localize(`warning.${warningMessage}.verbose`)}</p>`,
                buttons: [
                    {
                        action: "ok",
                        label: localize("warning.button.ok")
                    },
                    {
                        action: "showSimple",
                        label: localize("warning.button.showSimple"),
                        callback: () => game.settings.set("pf2e-ranged-combat", "ammunitionEffectsWarningLevel", postToChatConfig.simple)
                    },
                    {
                        action: "doNotShow",
                        label: localize("warning.button.doNotShow"),
                        callback: () => game.settings.set("pf2e-ranged-combat", "ammunitionEffectsWarningLevel", postToChatConfig.none)
                    }
                ]
            }
        ).render(true);
    } else if (warningLevel == postToChatConfig.simple) {
        ui.notifications.warn(localize(`warning.${warningMessage}.simple`));
    }
}
