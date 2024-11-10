import { MAGAZINE_LOADED_EFFECT_ID } from "../ammunition-system/constants.js";
import { isLoaded } from "../ammunition-system/utils.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eItem } from "../types/pf2e/item.js";
import { PF2eToken } from "../types/pf2e/token.js";
import { HookManager } from "../utils/hook-manager.js";
import { getEffectFromActor, getFlag, getItemFromActor, postActionToChat, postMessage, showWarning, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { getWeapons } from "../utils/weapon-utils.js";

const FAKE_OUT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Stydu9VtrhQZFZxt";

export function initialiseFakeOut() {
    HookManager.register("post-action", handlePostAction);
    HookManager.register("weapon-damage", handleWeaponDamage);
    Hooks.on("pf2e.startTurn", handleStartTurn);
}

/**
 * @param {{ actor: PF2eActor, item: PF2eItem, result: any }}
 */
function handlePostAction({ actor, item, result }) {
    if (item.sourceId != FAKE_OUT_FEAT_ID) {
        return;;
    }

    result.match = true;

    performFakeOut(actor, item);
}

/**
 * 
 * @param {PF2eActor} actor 
 * @param {PF2eItem} fakeOutFeat 
 */
async function performFakeOut(actor, fakeOutFeat) {
    const target = getSingleTarget();
    if (!target) {
        return;
    }

    // Find a wielded, loaded, firearm
    const weapons = getWeapons(
        actor,
        weapon => {
            if (!(weapon.group === "firearm" || weapon.group === "crossbow")) {
                return false;
            }

            if (!weapon.isEquipped) {
                return false;
            }

            if (useAdvancedAmmunitionSystem(actor)) {
                if (weapon.isRepeating) {
                    const loadedMagazineEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
                    if (!loadedMagazineEffect) {
                        return false;
                    }

                    if (getFlag(loadedMagazineEffect, "remaining") < 1) {
                        return false;
                    }
                }

                if (weapon.requiresLoading && !isLoaded(weapon)) {
                    return false;
                }
            } else if (game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded") && weapon.requiresLoading) {
                if (!isLoaded(weapon)) {
                    return false;
                }
            }

            return true;
        }
    );
    if (!weapons.length) {
        showWarning(game.i18n.format("pf2e-ranged-combat.feat.fakeOut.noWeapon", { actor: actor.name }));
        return;
    }

    const weaponIds = weapons.map(weapon => weapon.id);

    // Find which of these weapons has the highest attack bonus
    const strikes = actor.system.actions.filter(strike => weaponIds.includes(strike.item?.id));
    if (!strikes.length) {
        showWarning(game.i18n.format("pf2e-ranged-combat.feat.fakeOut.noWeapon", { actor: actor.name }));
        return;
    }

    const hasDoneDamageTarget = getFlag(fakeOutFeat, "hasDoneDamage")?.[target.actor.signature] ?? [];

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

    await postActionToChat(fakeOutFeat);

    const roll = await strike.roll(params);

    switch (roll.degreeOfSuccess) {
        case 3:
            const match = strike.options.map(option => option.match(/proficiency:rank:(\d)/)).find(match => !!match);
            const bonus = Math.max(2, match[1]);

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
 * @returns {PF2eToken?} target
 */
function getSingleTarget() {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));

    if (targetTokens.length != 1) {
        showWarning(game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.noTarget"));
        return null;
    }

    return targetTokens[0];
}

/**
 * @param {PF2eActor} actor 
 * @param {string} message 
 * @param {number?} bonus 
 */
function postFakeOutMessage(actor, message, bonus) {
    postMessage(
        actor,
        "systems/pf2e/icons/actions/Reaction.webp",
        game.i18n.format(`pf2e-ranged-combat.feat.fakeOut.result.${message}`, { bonus }),
        {
            actionName: game.i18n.localize("pf2e-ranged-combat.feat.fakeOut.name"),
            numActions: "r",
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
    const fakeOutFeat = getItemFromActor(weapon.actor, FAKE_OUT_FEAT_ID);
    if (!fakeOutFeat) {
        return;
    }

    const hasDoneDamageMap = getFlag(fakeOutFeat, "hasDoneDamage") ?? {};
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
