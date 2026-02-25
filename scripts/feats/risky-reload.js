import { Reload } from "../ammunition-system/actions/reload.js";
import { JAMMED_EFFECT_ID } from "../ammunition-system/constants.js";
import { WeaponAttackProcessParams } from "../hook-manager/types/weapon-attack-process.js";
import { Chat } from "../utils/chat.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { Util } from "../utils/utils.js";
import { WeaponSystem } from "../weapons/system.js";
import { Weapon } from "../weapons/types.js";

const RISKY_RELOAD_FEAT_ID = "Compendium.pf2e.feats-srd.Item.BmAk6o14CutgnIOG";
const RISKY_RELOAD_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.OoPaU2jwi1RUYWUt";
const RISKY_RELOAD_IMG = "modules/pf2e-ranged-combat/art/risky-reload.webp";

export class RiskyReload {
    /**
     * @param {string} key 
     * @param {object} data 
     * @returns {string}
     */
    static localize(key, data) {
        return Util.localize(`actions.riskyReload.${key}`, data);
    }

    static initialise() {
        HookManager.register("weapon-attack", handleWeaponFired);
        HookManager.register("post-action", handlePostAction);
        // If we unload a weapon, delete the Risky Reload effect
        Hooks.on(
            "pf2eRangedCombatUnload",
            /**
             * @param {object} data
             * @param {Weapon} data.weapon 
             */
            ({ weapon }) => Util.getEffect(weapon, RISKY_RELOAD_EFFECT_ID)?.delete()
        );
    }
}

/**
 * @param {PostActionHookData} data
 */
function handlePostAction({ actor, item: action, result }) {
    if (action.sourceId != RISKY_RELOAD_FEAT_ID) {
        return;
    }

    result.match = true;

    handleAsync(actor, action);
}

/**
 * @param {ActorPF2e} actor
 * @param {ActionPF2e} action
 */
async function handleAsync(actor, action) {
    const weapon = await WeaponSystem.getWeapon(
        actor,
        {
            required: weapon => weapon.isEquipped && weapon.group === "firearm",
            priority: weapon => weapon.remainingCapacity > 0
        },
        "reload",
        RiskyReload.localize("warningNotWieldingProperWeapon", { actor: Util.getPreferredName(actor) })
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    const reloaded = await Reload.reload(
        weapon,
        updates,
        {
            messageParams: {
                actionName: action.name,
                img: RISKY_RELOAD_IMG,
                traits: ["flourish"]
            }
        }
    );
    if (!reloaded) {
        return;
    }

    await Chat.postAction(action);

    const riskyReloadEffectSource = /** @type {EffectPF2eSource} */ (await Util.getSource(RISKY_RELOAD_EFFECT_ID));
    Util.setEffectTarget(riskyReloadEffectSource, weapon);
    Util.ensureDuration(actor, riskyReloadEffectSource);

    updates.create(riskyReloadEffectSource);
    updates.commit();
}

/**
 * @param {WeaponAttackProcessParams} data
 */
async function handleWeaponFired({ weapon, updates, roll }) {
    if (!roll) {
        return;
    }

    const riskyReloadEffect = Util.getEffect(weapon, RISKY_RELOAD_EFFECT_ID);
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
                const jammedEffectSource = await Util.getSource(JAMMED_EFFECT_ID);
                Util.setEffectTarget(jammedEffectSource, weapon);

                updates.create(jammedEffectSource);
            }
        );

        Chat.postMessage(
            weapon.actor,
            riskyReloadEffect.img,
            RiskyReload.localize("weaponJammed", { actor: Util.getPreferredName(weapon.actor) })
        );
    }
}
