import { performReload } from "../ammunition-system/actions/reload.js";
import { JAMMED_EFFECT_ID } from "../ammunition-system/constants.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { ensureDuration, getEffectFromActor, getItem, getPreferredName, isUsingSystemAmmunitionSystem, postActionToChat, postMessage, setEffectTarget } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";

const RISKY_RELOAD_FEAT_ID = "Compendium.pf2e.feats-srd.Item.BmAk6o14CutgnIOG";
const RISKY_RELOAD_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.OoPaU2jwi1RUYWUt";
const RISKY_RELOAD_IMG = "modules/pf2e-ranged-combat/art/risky-reload.webp";

const format = (key, data) => game.i18n.format("pf2e-ranged-combat.actions.riskyReload." + key, data);

export function initialiseRiskyReload() {
    HookManager.register("weapon-attack", handleWeaponFired);

    // If we unload a weapon, delete the Risky Reload effect
    Hooks.on(
        "pf2eRangedCombatUnload",
        (actor, _, weapon) => {
            getEffectFromActor(actor, RISKY_RELOAD_EFFECT_ID, weapon.id)
                ?.delete();
        }
    );
}

function handlePostAction({ actor, item, result }) {
    if (isUsingSystemAmmunitionSystem(actor)) {
        return;
    }

    if (item.sourceId != RISKY_RELOAD_FEAT_ID) {
        return;
    }

    result.match = true;

    handleForActor(actor, item);
}

async function handleForActor(actor, item) {
    const weapon = await getWeapon(
        actor,
        weapon => weapon.isEquipped && weapon.group === "firearm",
        format("warningNotWieldingProperWeapon", { actor: getPreferredName(actor) })
    );
    if (!weapon) {
        return;
    }

    const token = { name: getPreferredName(actor), actor: actor };

    const updates = new Updates(actor);

    const reloaded = await performReload(
        actor,
        token,
        weapon,
        updates,
        {
            message: {
                actionName: item.name,
                img: RISKY_RELOAD_IMG,
                traits: ["flourish"]
            }
        }
    );
    if (!reloaded) {
        return;
    }

    await postActionToChat(item);

    const riskyReloadEffectSource = await getItem(RISKY_RELOAD_EFFECT_ID);
    setEffectTarget(riskyReloadEffectSource, weapon);
    ensureDuration(actor, riskyReloadEffectSource);
    foundry.utils.mergeObject(
        riskyReloadEffectSource,
        {
            flags: {
                pf2e: {
                    rulesSelections: {
                        weapon: weapon.id
                    }
                }
            }
        }
    );

    updates.create(riskyReloadEffectSource);
    updates.handleUpdates();
}

/**
 * @param {{ weapon: Weapon, updates: Updates, roll: { degreeOfSuccess: number }}} params
 */
async function handleWeaponFired({ weapon, updates, roll }) {
    if (isUsingSystemAmmunitionSystem(weapon.actor)) {
        return;
    }

    const riskyReloadEffect = getEffectFromActor(weapon.actor, RISKY_RELOAD_EFFECT_ID, weapon.id);
    if (!riskyReloadEffect) {
        return;
    }

    updates.delete(riskyReloadEffect);

    // If there's no degree of success, don't automatically jam the weapon
    if (roll.degreeOfSuccess === null) {
        return;
    }

    // If the attack was a failure, the weapon jams
    if (roll.degreeOfSuccess < 2) {
        updates.deferredUpdate(
            async () => {
                const jammedEffectSource = await getItem(JAMMED_EFFECT_ID);
                setEffectTarget(jammedEffectSource, weapon);

                updates.create(jammedEffectSource);
            }
        );

        postMessage(
            weapon.actor,
            riskyReloadEffect.img,
            format("weaponJammed", { actor: getPreferredName(weapon.actor) })
        );
    }
}
