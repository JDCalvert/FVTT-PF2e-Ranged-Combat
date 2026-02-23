import { FireWeaponProcessor } from "../ammunition-system/fire-weapon-processor.js";
import { Chat } from "../utils/chat.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getItemFromActor, Util } from "../utils/utils.js";
import { WeaponSystem } from "../weapons/system.js";

const FAKE_OUT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Stydu9VtrhQZFZxt";

export class FakeOut {
    static initialise() {
        HookManager.register("post-action", handlePostAction);
        HookManager.register("weapon-damage", handleWeaponDamage);
        Hooks.on("pf2e.startTurn", handleStartTurn);
    }
}

/**
 * @param {PostActionHookData} data
 */
function handlePostAction({ actor, item: action, result }) {
    if (action.sourceId != FAKE_OUT_FEAT_ID) {
        return;;
    }

    result.match = true;

    perform(actor, action);
}

/**
 * @param {ActorPF2e} actor 
 * @param {ItemPF2e} fakeOutFeat 
 */
async function perform(actor, fakeOutFeat) {
    const target = getSingleTarget();
    if (!target) {
        return;
    }

    // Find a wielded, loaded, firearm
    const weapons = WeaponSystem.getWeapons(
        actor,
        weapon => {
            if (!(weapon.group === "firearm" || weapon.group === "crossbow")) {
                return false;
            }

            if (!weapon.isEquipped) {
                return false;
            }

            return weapon.isReadyToFire;
        }
    );
    if (!weapons.length) {
        Util.warn(game.i18n.format("pf2e-ranged-combat.feat.fakeOut.noWeapon", { actor: actor.name }));
        return;
    }

    const weaponIds = weapons.map(weapon => weapon.id);

    // Find which of these weapons has the highest attack bonus
    const strikes = actor.system.actions.filter(strike => weaponIds.includes(strike.item?.id));
    if (!strikes.length) {
        Util.warn(game.i18n.format("pf2e-ranged-combat.feat.fakeOut.noWeapon", { actor: actor.name }));
        return;
    }

    const hasDoneDamageTarget = Util.getFlag(fakeOutFeat, "hasDoneDamage")?.[target.actor.signature] ?? [];

    strikes.sort((s1, s2) => {
        const compareModifier = s2.totalModifier - s1.totalModifier;
        if (compareModifier) {
            return compareModifier;
        }

        return hasDoneDamageTarget.includes(s2.item.id) - hasDoneDamageTarget.includes(s1.item.id);
    });

    const strike = strikes[0];

    const params = {
        options: ["skip-post-processing", "action:fake-out"],
    };

    if (hasDoneDamageTarget.includes(strike.item.id)) {
        params.modifiers = [
            new game.pf2e.Modifier(
                {
                    selector: "ranged-strike-attack-roll",
                    modifier: 1,
                    type: "circumstance",
                    label: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.name")
                }
            )
        ];
    }

    const dc = game.settings.get("pf2e-ranged-combat", "fakeOutDC");
    if (dc) {
        params.dc = {
            value: dc
        };
    }

    await Chat.postAction(fakeOutFeat);

    const weapon = weapons.find(weapon => weapon.id === strike.item.id);

    // If we're actually going to fire the weapon, perform a more rigorous check
    // if (game.settings.get("pf2e-ranged-combat", "fakeOutFireWeapon")) {
    //     const canActuallyFireWeapon = await FireWeaponCheck.runCheck({ weapon });
    //     if (!canActuallyFireWeapon) {
    //         return;
    //     }
    // }

    const roll = await strike.roll(params);
    if (!roll) {
        return;
    }

    if (game.settings.get("pf2e-ranged-combat", "fakeOutFireWeapon")) {
        const updates = new Updates(actor);
        FireWeaponProcessor.processWeaponFired(
            {
                weapon: weapon,
                updates: updates
            }
        );
        updates.commit();
    }

    switch (roll.degreeOfSuccess) {
        case 3:
            const match = strike.options.map(option => option.match(/proficiency:rank:(\d)/)).find(match => !!match);
            const bonus = Math.max(2, Number(match[1]));

            postFakeOutMessage(actor, "success", bonus);
            break;
        case 2:
            postFakeOutMessage(actor, "success", 1);
            break;
        case 1:
            postFakeOutMessage(actor, "failure", 0);
            break;
        case 0:
            postFakeOutMessage(actor, "criticalFailure", -1);
            break;
    }
}

/**
 * @returns {TokenPF2e} target
 */
function getSingleTarget() {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));

    if (targetTokens.length != 1) {
        Util.warn(game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.noTarget"));
        return null;
    }

    return targetTokens[0];
}

/**
 * @param {ActorPF2e} actor 
 * @param {string} message 
 * @param {number?} bonus 
 */
function postFakeOutMessage(actor, message, bonus) {
    Chat.postMessage(
        actor,
        "systems/pf2e/icons/actions/Reaction.webp",
        game.i18n.format(`pf2e-ranged-combat.feat.fakeOut.result.${message}`, { bonus }),
        {
            actionName: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.name"),
            actionSymbol: "r",
            traits: ["visual"],
            link: bonus ? "Compendium.pf2e.other-effects.Item.AHMUpMbaVkZ5A1KX" : null
        }
    );
}

function handleStartTurn(combatant) {
    const actor = combatant.actor;
    if (!actor) {
        return;
    }

    const fakeOutFeat = getItemFromActor(actor, FAKE_OUT_FEAT_ID);
    if (!fakeOutFeat) {
        return;
    }

    fakeOutFeat.update({ "flags.pf2e-ranged-combat.-=hasDoneDamage": null });
}

function handleWeaponDamage({ weapon, target, updates }) {
    if (!target) {
        return;
    }

    const fakeOutFeat = getItemFromActor(weapon.actor, FAKE_OUT_FEAT_ID);
    if (!fakeOutFeat) {
        return;
    }

    const hasDoneDamageMap = Util.getFlag(fakeOutFeat, "hasDoneDamage") ?? {};
    let hasDoneDamageTarget = hasDoneDamageMap[target.signature];
    if (!hasDoneDamageTarget) {
        hasDoneDamageTarget = [];
        hasDoneDamageMap[target.signature] = hasDoneDamageTarget;
    }

    if (!hasDoneDamageTarget.includes(weapon.id)) {
        hasDoneDamageTarget.push(weapon.id);

        updates.update(fakeOutFeat, { "flags.pf2e-ranged-combat.hasDoneDamage": hasDoneDamageMap });
    }
}
