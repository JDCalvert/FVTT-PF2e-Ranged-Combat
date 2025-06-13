import { findGroupStacks } from "../thrown-weapons/change-carry-type.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { getControlledActor, getFlag } from "../utils/utils.js";

const localize = (key) => game.i18n.format("pf2e-ranged-combat.npcWeaponSystem." + key);

export function npcWeaponConfiguration() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    if (actor.type !== "npc") {
        ui.notifications.warn(localize("warningNpcOnly"));
        return;
    }

    new foundry.applications.api.DialogV2(
        {
            window: {
                title: localize("dialog.title")
            },
            position: {
                width: 600
            },
            content: buildContent(actor),
            buttons: [
                {
                    action: "ok",
                    label: localize("dialog.done"),
                    callback: (html) => saveChanges(html, actor)
                },
                {
                    action: "cancel",
                    label: localize("dialog.cancel")
                }
            ]
        }
    ).render(true);
}

/**
 * @param {PF2eActor} actor 
 * @returns {string}
 */
function buildContent(actor) {
    const flags = actor.flags["pf2e-ranged-combat"];
    const enableAdvancedAmmunitionSystem = flags?.enableAdvancedAmmunitionSystem;
    const enableAdvancedThrownWeaponSystem = flags?.enableAdvancedThrownWeaponSystem;

    const attacks = actor.itemTypes.melee;
    const weapons = actor.itemTypes.weapon.filter(weapon => weapon === findGroupStacks(weapon)[0]);
    const ammunitions = actor.itemTypes.consumable.filter(consumable => consumable.isAmmo && !consumable.isStowed);

    let content = "";

    content += `
        <div class="dialog-content standard-form" style="gap: 0px">
        <div style="padding-bottom: 10px">
            ${localize("dialog.hint")}
        </div>

        <fieldset style="border: 1px solid #a1a1a1; padding: 5px; padding-left: 10px; padding-right: 10px; gap: 0px">
            <legend>${localize("dialog.legendGeneral")}</legend>
            <form>
                <div class="form-group">
                    <input type="checkbox" id="enableAdvancedAmmunitionSystem" name="enableAdvancedAmmunitionSystem" ${enableAdvancedAmmunitionSystem ? `checked` : ``}>
                    <label for="enableAdvancedAmmunitionSystem">${localize("dialog.enableAmmunition")}</label>
                </div>
                <div class="form-group">
                    <input type="checkbox" id="enableAdvancedThrownWeaponSystem" name="enableAdvancedThrownWeaponSystem" ${enableAdvancedThrownWeaponSystem ? `checked` : ``}>
                    <label for="enableAdvancedThrownWeaponSystem">${localize("dialog.enableThrown")}</label>
                </div>
            </form>
        </fieldset>
        <hr/>
    `;

    content += `
        <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
            <legend>${localize("dialog.legendMapping")}</legend>
            <div>
            ${localize("dialog.mappingHint")}
            </div>
        
            <form>
    `;

    for (const attack of attacks) {
        const weaponId = getFlag(attack, "weaponId");
        const ammunitionId = getFlag(attack, "ammunitionId");

        const isRanged = attack.traits.some(trait => trait.startsWith("range-increment") || trait.startsWith("thrown"));
        const usesAmmunition = attack.traits.some(trait => trait.startsWith("reload-"));

        content += `
            <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
                <legend>${attack.name} [${isRanged ? localize("dialog.weaponTypeRanged") : localize("dialog.weaponTypeMelee")}]</legend>
                <div class="form-group">
                    <label>${localize("dialog.labelWeapon")}</label>
                    <select id="${attack.id}-weapon" name="${attack.id}-weapon">
                        <option/>
        `;
        for (const weapon of weapons) {
            content += `<option value="${weapon.id}" ${weaponId === weapon.id ? `selected="selected"` : ``}>${weapon.name}</option>`;
        }
        content += `
                    </select>
                </div>
        `;

        if (isRanged && usesAmmunition) {
            content += `
                <div class="form-group">
                    <label>${localize("dialog.labelAmmunition")}</label>
                    <select id="${attack.id}-ammo" name="${attack.id}-ammo">
                        <option/>`;

            ammunitions
                .filter(ammunition => attack.traits.has("repeating") === (ammunition.uses.max > 1))
                .map(ammunition => `<option value="${ammunition.id}" ${ammunitionId === ammunition.id ? `selected="selected"` : ``}>${ammunition.name}</option>`)
                .forEach(ammunition => content += ammunition);

            content += `
                    </select>
                </div>
            `;
        }

        content += `
            </fieldset>
        `;
    }

    content += `
            </form>
        </fieldset>
        </div>
    `;

    return content;
}

function saveChanges(html) {
    const updates = [];
    const enableAdvancedAmmunitionSystem = !!html.find(`[name="enableAdvancedAmmunitionSystem"]`).is(":checked");
    const enableAdvancedThrownWeaponSystem = !!html.find(`[name="enableAdvancedThrownWeaponSystem"]`).is(":checked");

    actor.update({
        flags: {
            "pf2e-ranged-combat": {
                enableAdvancedAmmunitionSystem,
                enableAdvancedThrownWeaponSystem
            }
        }
    });

    for (const attack of actor.itemTypes.melee) {
        const currentWeaponId = getFlag(attack, "weaponId");
        const currentAmmunitionId = getFlag(attack, "ammunitionId");

        const weaponId = html.find(`[name="${attack.id}-weapon"`).val();
        const ammunitionId = html.find(`[name="${attack.id}-ammo"]`).val();

        const changedWeaponId = weaponId !== currentWeaponId;
        const changedAmmunitionId = ammunitionId !== currentAmmunitionId;

        if (changedWeaponId || changedAmmunitionId) {
            const update = {
                _id: attack.id,
                flags: {
                    "pf2e-ranged-combat": {
                    }
                }
            };

            const flags = update.flags["pf2e-ranged-combat"];

            if (changedWeaponId) {
                if (weaponId) {
                    flags.weaponId = weaponId;
                } else {
                    flags["-=weaponId"] = null;
                }
            }

            if (changedAmmunitionId) {
                if (ammunitionId) {
                    flags.ammunitionId = ammunitionId;
                } else {
                    flags["-=ammunitionId"] = null;
                }
            }

            updates.push(update);
        }
    }

    if (updates.length) {
        actor.updateEmbeddedDocuments("Item", updates);
    }
}
