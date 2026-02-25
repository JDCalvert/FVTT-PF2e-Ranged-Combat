import { findGroupStacks } from "../thrown-weapons/utils.js";
import { showDialog } from "../utils/dialog.js";
import { Util } from "../utils/utils.js";
import { Configuration } from "../config/config.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.npcWeaponSystem." + key);

export class NPCWeaponConfiguration {
    static show() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        if (actor.type !== "npc") {
            ui.notifications.warn(localize("warningNpcOnly"));
            return;
        }

        showDialog(
            localize("dialog.title"),
            buildContent(actor),
            [
                {
                    action: "ok",
                    label: localize("dialog.done"),
                    callback: Configuration.isUsingApplicationV2()
                        ? (_0, _1, dialog) => saveChangesV2(dialog, actor)
                        : ($html) => saveChangesV1($html, actor)
                },
                {
                    action: "cancel",
                    label: localize("dialog.cancel")
                }
            ]
        );
    }
}

/**
 * @param {ActorPF2e} actor 
 * @returns {string}
 */
function buildContent(actor) {
    const flags = actor.flags["pf2e-ranged-combat"];
    const enableAdvancedAmmunitionSystem = flags?.enableAdvancedAmmunitionSystem;
    const enableAdvancedThrownWeaponSystem = flags?.enableAdvancedThrownWeaponSystem;

    const attacks = actor.itemTypes.melee;
    const weapons = actor.itemTypes.weapon.filter(weapon => weapon === findGroupStacks(weapon)[0]);
    const ammunitions = (actor.itemTypes.ammo ?? actor.itemTypes.consumable.filter(consumable => consumable.isAmmo))
        .filter(ammunition => !ammunition.isStowed);

    let content = "";

    // The ApplicationV2 form has a lot of unnecessary space, wrap everything inside a form with no gaps
    if (Configuration.isUsingApplicationV2()) {
        content += `<div class="dialog-content standard-form" style="gap: 0px"></div>`;
    }

    content += `
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
        const weaponId = Util.getFlag(attack, "weaponId");
        const ammunitionId = Util.getFlag(attack, "ammunitionId");

        const isRanged = attack.isRanged;
        const usesAmmunition = attack.system.traits.value.some(trait => trait.startsWith("reload-"));

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
                .filter(ammunition => attack.traits.has("repeating") === (ammunition.system.uses.max > 1))
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
    `;

    if (Configuration.isUsingApplicationV2()) {
        content += `</div>`;
    }

    return content;
}

/**
 * @param {ActorPF2e} actor 
 */
function saveChangesV2(dialog, actor) {
    const element = dialog.element;

    const data = {
        enableAdvancedAmmunitionSystem: element.querySelector(`[name="enableAdvancedAmmunitionSystem"]`).checked,
        enableAdvancedThrownWeaponSystem: element.querySelector(`[name="enableAdvancedThrownWeaponSystem"]`).checked,
        attacks: {},
    };

    for (const attack of actor.itemTypes.melee) {
        data.attacks[attack.id] = {
            weaponId: element.querySelector(`[name="${attack.id}-weapon"`).value,
            ammunitionId: element.querySelector(`[name="${attack.id}-ammo"]`)?.value
        };
    }

    saveChanges(actor, data);
}

/**
 * @param {ActorPF2e} actor 
 */
function saveChangesV1($html, actor) {
    const data = {
        enableAdvancedAmmunitionSystem: !!$html.find(`[name="enableAdvancedAmmunitionSystem"]`).is(":checked"),
        enableAdvancedThrownWeaponSystem: !!$html.find(`[name="enableAdvancedThrownWeaponSystem"]`).is(":checked"),
        attacks: {}
    };

    for (const attack of actor.itemTypes.melee) {
        data.attacks[attack.id] = {
            weaponId: $html.find(`[name="${attack.id}-weapon"`).val(),
            ammunitionId: $html.find(`[name="${attack.id}-ammo"]`).val()
        };
    }

    saveChanges(actor, data);
}

function saveChanges(actor, data) {
    actor.update({
        flags: {
            "pf2e-ranged-combat": {
                enableAdvancedAmmunitionSystem: data.enableAdvancedAmmunitionSystem,
                enableAdvancedThrownWeaponSystem: data.enableAdvancedThrownWeaponSystem
            }
        }
    });

    const updates = [];

    for (const attack of actor.itemTypes.melee) {
        const currentWeaponId = Util.getFlag(attack, "weaponId");
        const currentAmmunitionId = Util.getFlag(attack, "ammunitionId");

        const weaponId = data.attacks[attack.id].weaponId;
        const ammunitionId = data.attacks[attack.id].ammunitionId;

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
