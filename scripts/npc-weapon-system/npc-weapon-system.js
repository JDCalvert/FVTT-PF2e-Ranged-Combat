import { findGroupStacks } from "../thrown-weapons/change-carry-type.js";
import { getControlledActor, getControlledActorAndToken } from "../utils/utils.js";

export function npcWeaponConfiguration() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    if (actor.type !== "npc") {
        ui.notifications.warn("You can only use this on NPCs.");
        return;
    }

    new Dialog(
        {
            title: "NPC Weapon Configuration",
            content: buildContent(actor),
            buttons: {
                ok: {
                    label: "Done",
                    callback: ($html) => saveChanges($html, actor)
                },
                cancel: {
                    label: "Cancel"
                }
            }
        }
    ).render(true);
}

function buildContent(actor) {
    const flags = actor.flags["pf2e-ranged-combat"];
    const enableAdvancedAmmunitionSystem = flags?.enableAdvancedAmmunitionSystem;
    const enableAdvancedThrownWeaponSystem = flags?.enableAdvancedThrownWeaponSystem;

    const attacks = actor.itemTypes.melee;
    const weapons = actor.itemTypes.weapon.filter(weapon => weapon === findGroupStacks(weapon)[0]);
    const ammunitions = actor.itemTypes.consumable.filter((i) => i.isAmmunition && !i.isStowed);

    let content = "";

    content += `
        <div>
            Here, you can configure the NPC to be used by the PF2e Ranged Combat module.
        </div>

        <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
            <legend>General</legend>
            <form>
                <div class = "form-group">
                    <input type="checkbox" id="enableAdvancedAmmunitionSystem" name="enableAdvancedAmmunitionSystem" ${enableAdvancedAmmunitionSystem ? `checked` : ``}>
                    <label>Enable Advanced Ammunition System</label>
                </div>
            </form>
            <form>
                <div class = "form-group">
                    <input type="checkbox" id="enableAdvancedThrownWeaponSystem" name="enableAdvancedThrownWeaponSystem" ${enableAdvancedThrownWeaponSystem ? `checked` : ``}>
                    <label>Enable Advanced Thrown Weapon System</label>
                </div>
            </form>
        </fieldset>
        <hr/>
    `;

    content += `
        <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
            <legend>Weapon Mapping</legend>
            <div>
                You can map each of your NPC's attacks to a weapon and ammunition, so it is treated like a PC's weapon by the module.
            </div>
        
            <form>
    `;

    for (const attack of attacks) {
        const weaponId = attack.flags["pf2e-ranged-combat"]?.weaponId;
        const ammoId = attack.system.selectedAmmoId;

        content += `
            <fieldset style="border: 1px solid #a1a1a1; padding: 5px;">
                <legend>${attack.name} [${attack.system.weaponType.value === "melee" ? "Melee" : "Ranged"}]</legend>
                <div class="form-group">
                    <label>Weapon</label>
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

        const isRanged = attack.system.weaponType.value === "ranged";
        const usesAmmunition = attack.system.traits.value.find(trait => trait.startsWith("reload-"));
        if (isRanged && usesAmmunition) {
            content += `
                <div class="form-group">
                    <label>Ammunition</label>
                    <select id="${attack.id}-ammo" name="${attack.id}-ammo">
                        <option/>`;

            ammunitions
                .filter(ammunition => attack.traits.has("repeating") === (ammunition.uses.max > 1))
                .map(ammunition => `<option value="${ammunition.id}" ${ammoId === ammunition.id ? `selected="selected"` : ``}>${ammunition.name}</option>`)
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

    return content;
}

function saveChanges($html, actor) {
    const updates = [];
    const enableAdvancedAmmunitionSystem = !!$html.find(`[name="enableAdvancedAmmunitionSystem"]`).is(":checked");
    const enableAdvancedThrownWeaponSystem = !!$html.find(`[name="enableAdvancedThrownWeaponSystem"]`).is(":checked");

    actor.update({
        flags: {
            "pf2e-ranged-combat": {
                enableAdvancedAmmunitionSystem,
                enableAdvancedThrownWeaponSystem
            }
        }
    });

    for (const attack of actor.itemTypes.melee) {
        const currentWeaponId = attack.flags["pf2e-ranged-combat"]?.weaponId;
        const currentAmmoId = attack.system.selectedAmmoId;

        const weaponId = $html.find(`[name="${attack.id}-weapon"`).val();
        const ammoId = $html.find(`[name="${attack.id}-ammo"]`).val();

        const changedWeaponId = weaponId !== currentWeaponId;
        const changedAmmoId = ammoId !== currentAmmoId;

        if (changedWeaponId || changedAmmoId) {
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

            if (changedAmmoId) {
                if (ammoId) {
                    update.system = {
                        selectedAmmoId: ammoId
                    };
                } else {
                    update.system = {
                        "-=selectedAmmoId": null
                    };
                }
            }

            updates.push(update);
        }
    }

    if (updates.length) {
        actor.updateEmbeddedDocuments("Item", updates);
    }
}
