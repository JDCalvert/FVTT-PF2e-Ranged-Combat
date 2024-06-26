import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eItem } from "../types/pf2e/item.js";
import { PF2eToken } from "../types/pf2e/token.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { getControlledActorAndToken, getItem, getItemFromActor, postActionToChat, postToChat, showWarning } from "../utils/utils.js";
import { DOUBLE_PREY_FEAT_ID, FLURRY_FEATURE_ID, HUNTED_PREY_EFFECT_ID, HUNTERS_EDGE_FLURRY_EFFECT_ID, HUNTERS_EDGE_OUTWIT_EFFECT_ID, HUNTERS_EDGE_PRECISION_EFFECT_ID, HUNT_PREY_ACTION_ID, HUNT_PREY_IMG, HUNT_PREY_RULES, MASTERFUL_HUNTER_FLURRY_EFFECT_ID, MASTERFUL_HUNTER_FLURRY_FEATURE_ID, MASTERFUL_HUNTER_OUTWIT_EFFECT_ID, MASTERFUL_HUNTER_OUTWIT_FEATURE_ID, MASTERFUL_HUNTER_PRECISION_EFFECT_ID, MASTERFUL_HUNTER_PRECISION_FEATURE_ID, OUTWIT_FEATURE_ID, OUTWIT_RULES, PRECISION_FEATURE_ID, PRECISION_RULES, SHARED_PREY_FEAT_ID, TRIPLE_THREAT_FEAT_ID } from "./constants.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.huntPrey." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.huntPrey." + key, data);

export async function huntPrey() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const huntPreyAction = getItemFromActor(actor, HUNT_PREY_ACTION_ID);
    if (!huntPreyAction) {
        showWarning(format("warningNoAction", { token: token.name }));
        return;
    }

    const checkResult = checkHuntPrey(actor);
    if (!checkResult.valid) {
        return;
    }

    performHuntPrey(actor, token, huntPreyAction, checkResult);
}

export function checkHuntPrey(actor) {
    const hasDoublePrey = !!getItemFromActor(actor, DOUBLE_PREY_FEAT_ID);
    const hasTripleThreat = !!getItemFromActor(actor, TRIPLE_THREAT_FEAT_ID);

    const maxTargets = hasTripleThreat
        ? { num: 3, word: localize("maxTargetsThree") }
        : hasDoublePrey
            ? { num: 2, word: localize("maxTargetsTwo") }
            : { num: 1, word: localize("maxTargetsOne") };

    const targets = getTargets(maxTargets);
    if (!targets.length) {
        return { valid: false };
    }

    return { valid: true, targets, maxTargets };
}

/**
 * 
 * @param {PF2eActor} actor
 * @param {PF2eToken} token
 * @param {PF2eItem} huntPreyAction
 * @param {{ targets: [], maxTargets: { num: number, word: string } }} checkResult
 */
export async function performHuntPrey(actor, token, huntPreyAction, checkResult) {
    const targets = checkResult.targets;

    const remainingTargets = checkResult.maxTargets.num - targets.length;
    const remainingTargetsText = remainingTargets === 2
        ? localize("shareWithTwo")
        : remainingTargets === 1 && !!getItemFromActor(actor, SHARED_PREY_FEAT_ID)
            ? localize("shareWithOne")
            : "";

    const showTokenNames = !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
    const targetNames = targets.map(target => (showTokenNames || target.document.playersCanSeeName) ? target.name : localize("unknownToken"));
    const targetData = { token: token?.name || actor.name, target1: targetNames[0], target2: targetNames[1], target3: targetNames[2] };

    let link = null;
    if (remainingTargets > 0 && getItemFromActor(actor, SHARED_PREY_FEAT_ID)) {
        if (getItemFromActor(actor, MASTERFUL_HUNTER_OUTWIT_FEATURE_ID)) {
            link = MASTERFUL_HUNTER_OUTWIT_EFFECT_ID;
        } else if (getItemFromActor(actor, MASTERFUL_HUNTER_FLURRY_FEATURE_ID)) {
            link = MASTERFUL_HUNTER_FLURRY_EFFECT_ID;
        } else if (getItemFromActor(actor, MASTERFUL_HUNTER_PRECISION_FEATURE_ID)) {
            link = MASTERFUL_HUNTER_PRECISION_EFFECT_ID;
        } else if (getItemFromActor(actor, OUTWIT_FEATURE_ID)) {
            link = HUNTERS_EDGE_OUTWIT_EFFECT_ID;
        } else if (getItemFromActor(actor, FLURRY_FEATURE_ID)) {
            link = HUNTERS_EDGE_FLURRY_EFFECT_ID;
        } else if (getItemFromActor(actor, PRECISION_FEATURE_ID)) {
            link = HUNTERS_EDGE_PRECISION_EFFECT_ID;
        }
    }

    await postActionToChat(huntPreyAction);
    await postToChat(
        actor,
        HUNT_PREY_IMG,
        targets.length === 3
            ? format("huntThreeTargets", targetData)
            : targets.length === 2
                ? `${format("huntTwoTargets", targetData)} ${remainingTargetsText}`
                : `${format("huntOneTarget", targetData)} ${remainingTargetsText}`
        ,
        {
            actionName: huntPreyAction.name,
            numActions: 1,
            traits: ["concentrate"],
            link
        }
    );

    const updates = new Updates(actor);

    updateSystemItems(actor, updates, huntPreyAction);

    // Remove any existing hunted prey effects
    const existingHuntedPreyEffect = getItemFromActor(actor, HUNTED_PREY_EFFECT_ID);
    if (existingHuntedPreyEffect) {
        updates.delete(existingHuntedPreyEffect);
    }

    // Add the new effect
    const huntedPreyEffectSource = await getItem(HUNTED_PREY_EFFECT_ID);
    huntedPreyEffectSource.name = `${huntedPreyEffectSource.name} (${targetNames.join(", ")})`;
    huntedPreyEffectSource.flags = {
        ...huntedPreyEffectSource.flags,
        "pf2e-ranged-combat": {
            "targetIds": targets.map(target => target.id)
        }
    };

    updates.create(huntedPreyEffectSource);

    HookManager.call("hunt-prey", { actor, updates });

    updates.handleUpdates();
}

function getTargets(maxTargets) {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));

    if (!targetTokens.length) {
        showWarning(localize("warningNoTarget"));
        return [];
    } else if (targetTokens.length > maxTargets.num) {
        showWarning(format("warningTooManyTargets", { maxTargets: maxTargets.word }));
        return [];
    } else {
        return targetTokens;
    }
}

/**
 * @param {PF2eActor} actor 
 * @param {Updates} updates
 */
function updateSystemItems(actor, updates, huntPreyAction) {
    updateHuntPreyAction(updates, huntPreyAction);

    updateOutwitFeature(actor, updates);
    updatePrecisionFeature(actor, updates);
}

/**
 * @param {Updates} updates
 * @param {any} huntPreyAction 
 */
function updateHuntPreyAction(updates, huntPreyAction) {
    updates.update(huntPreyAction, { "system.rules": HUNT_PREY_RULES });
}

/**
 * Update the Outwit feature so the AC bonus will trigger when the target attacks us.
 * 
 * @param {PF2eActor} actor 
 * @param {Updates} updates 
 */
function updateOutwitFeature(actor, updates) {
    const outwitFeature = getItemFromActor(actor, OUTWIT_FEATURE_ID);
    if (outwitFeature) {
        updates.update(
            outwitFeature,
            {
                "system.rules": OUTWIT_RULES,
                "flags.pf2e-ranged-combat.hunter-signature": actor.signature
            }
        );
    }
}

/**
 * @param {PF2eActor} actor
 * @param {Updates} updates
 */
function updatePrecisionFeature(actor, updates) {
    const precisionFeature = getItemFromActor(actor, PRECISION_FEATURE_ID);
    if (precisionFeature) {
        updates.update(precisionFeature, { "system.rules": PRECISION_RULES });
    }

    const masterfulHunterPrecisionFeature = getItemFromActor(actor, MASTERFUL_HUNTER_PRECISION_FEATURE_ID);
    if (masterfulHunterPrecisionFeature) {
        updates.update(
            masterfulHunterPrecisionFeature,
            {
                "system.rules": [
                    {
                        "key": "DamageDice",
                        "selector": "strike-damage",
                        "category": "precision",
                        "dieSize": "d8",
                        "diceNumber": "ternary(gte(@actor.level, 19), 2, 1)",
                        "predicate": [
                            "hunted-prey",
                            "precision:second-attack"
                        ]
                    },
                    {
                        "key": "DamageDice",
                        "selector": "strike-damage",
                        "category": "precision",
                        "dieSize": "d8",
                        "diceNumber": "ternary(gte(@actor.level, 19), 1, 0)",
                        "predicate": [
                            "hunted-prey",
                            "precision:third-attack"
                        ]
                    }
                ]
            }
        );
    }
}
