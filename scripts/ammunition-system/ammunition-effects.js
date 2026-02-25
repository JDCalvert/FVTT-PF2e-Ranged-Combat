import { ChatLevel, Configuration } from "../config/config.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { WeaponAmmunitionData } from "../hook-manager/types/ammunition-fire.js";
import { showDialog } from "../utils/dialog.js";
import { Updates } from "../utils/updates.js";
import { Util } from "../utils/utils.js";
import { Ammunition, Weapon } from "../weapons/types.js";

const AMMUNITION_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.FmD8SBZdehiClhx7";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.effect." + key);

export class AmmunitionEffects {
    /**
     * @param {ActorPF2e} actor
     * @returns 
     */
    static isAmmunitionEffectsEnabled(actor) {
        if (Configuration.isUsingSubItemAmmunitionSystem(actor)) {
            return false;
        }

        return Configuration.getSetting("ammunitionEffectsEnable");
    }

    static initialise() {
        // Disable the PF2e system automatically applying ammunition rules to its weapon
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Item.documentClasses.weapon.prototype.prepareSiblingData",
            /** @param {function(): void} wrapper */
            function (wrapper) {
                if (!AmmunitionEffects.isAmmunitionEffectsEnabled(this.actor)) {
                    wrapper();
                } else {
                    Object.getPrototypeOf(CONFIG.PF2E.Item.documentClasses.weapon).prototype.prepareSiblingData.apply(this);
                }
            },
            "MIXED"
        );

        HookManager.register("reload", applyAmmunitionEffect);
        HookManager.register("next-chamber", applyAmmunitionEffect);
        HookManager.register("ammunition-fire", applyAmmunitionEffect);

        HookManager.register("unload", removeAmmunitionEffect);
        HookManager.register("weapon-damage", handleWeaponDamage);
    }
}

/**
 * Apply the effects of the given ammunition to the weapon.
 * 
 * @param {WeaponAmmunitionData} data
 */
function applyAmmunitionEffect({ weapon, ammunition, updates }) {
    if (!AmmunitionEffects.isAmmunitionEffectsEnabled(weapon.actor)) {
        return;
    }

    // If we already have an effect for the ammunition we're firing, do nothing if it's for 
    // the same ammunition, or delete it if it's for different ammunition
    const ammunitionEffect = Util.getEffect(weapon, AMMUNITION_EFFECT_ID);
    if (ammunitionEffect) {
        const effectAmmunition = Util.getFlag(ammunitionEffect, "ammunition");
        if (effectAmmunition.sourceId === ammunition.sourceId) {
            return;
        }

        updates.delete(ammunitionEffect);
    }

    updates.deferredUpdate(
        async () => {
            if (ammunition.rules.length) {
                const rules = buildAmmunitionRules(ammunition);

                const ammunitionEffectSource = await Util.getSource(AMMUNITION_EFFECT_ID);
                Util.setEffectTarget(ammunitionEffectSource, weapon, false);
                foundry.utils.mergeObject(
                    ammunitionEffectSource,
                    {
                        "name": `${ammunition.name} (${weapon.name})`,
                        "img": ammunition.img,
                        "system": {
                            "rules": rules,
                            "description": ammunition.descriptionText
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
 * @param {Ammunition} ammunition 
 */
function buildAmmunitionRules(ammunition) {
    for (const rule of ammunition.rules) {
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

        if (rule.itemId) {
            rule.itemId = rule.itemId.replace(/{item\|\_?id}/, "{item|flags.pf2e.rulesSelections.weapon}");
        }
    }

    return ammunition.rules;
}

/**
 * Remove the current ammunition effect. Also, show a warning if the weapon's current ammunition doesn't match the ammunition effect, or if the weapon's current
 * ammunition has an effect but no ammunition effect is currently applied.
 * 
 * @param {{ weapon: Weapon, updates: Updates}} params
 */
function handleWeaponDamage({ weapon, updates }) {
    if (!AmmunitionEffects.isAmmunitionEffectsEnabled(weapon.actor)) {
        return;
    }

    const weaponAmmunition = weapon.selectedLoadedAmmunition;
    const ammunitionEffect = Util.getEffect(weapon, AMMUNITION_EFFECT_ID);

    if (ammunitionEffect) {
        const effectAmmunition = Util.getFlag(ammunitionEffect, "ammunition");
        if (weaponAmmunition && weaponAmmunition.sourceId !== effectAmmunition.sourceId) {
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
    if (!AmmunitionEffects.isAmmunitionEffectsEnabled(weapon.actor)) {
        return;
    }

    const ammunitionEffect = Util.getEffect(weapon, AMMUNITION_EFFECT_ID);
    if (ammunitionEffect) {
        updates.delete(ammunitionEffect);
    }
}

/**
 * Show a warning about the ammunition effect. The warning will be displayed based on the user's preference.
 * 
 * @param {string} warningMessage which warning message to show
 */
function showWarning(warningMessage) {
    const warningLevel = game.settings.get("pf2e-ranged-combat", "ammunitionEffectsWarningLevel");
    if (warningLevel == ChatLevel.full) {
        showDialog(
            game.i18n.localize("pf2e-ranged-combat.module-name"),
            `<p>${localize(`warning.${warningMessage}.verbose`)}</p>`,
            [
                {
                    action: "ok",
                    label: localize("warning.button.ok")
                },
                {
                    action: "showSimple",
                    label: localize("warning.button.showSimple"),
                    callback: () => game.settings.set("pf2e-ranged-combat", "ammunitionEffectsWarningLevel", ChatLevel.simple)
                },
                {
                    action: "doNotShow",
                    label: localize("warning.button.doNotShow"),
                    callback: () => game.settings.set("pf2e-ranged-combat", "ammunitionEffectsWarningLevel", ChatLevel.none)
                }
            ]
        );
    } else if (warningLevel == ChatLevel.simple) {
        ui.notifications.warn(localize(`warning.${warningMessage}.simple`));
    }
}
