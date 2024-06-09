import { PF2eActor } from "../types/pf2e/actor.js";
import { HookManager } from "../utils/hook-manager.js";
import { getControlledActorAndToken, getFlag, getItem, getItemFromActor, postActionToChat, postToChat, showWarning, Updates } from "../utils/utils.js";
import { DOUBLE_PREY_FEAT_ID, FLURRY_FEATURE_ID, HUNT_PREY_ACTION_ID, HUNT_PREY_IMG, HUNTED_PREY_EFFECT_ID, OUTWIT_FEATURE_ID, PRECISION_FEATURE_ID, SHARED_PREY_FEAT_ID, TRIPLE_THREAT_FEAT_ID } from "./constants.js";

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

    const hasDoublePrey = !!getItemFromActor(actor, DOUBLE_PREY_FEAT_ID);
    const hasSharedPrey = !!getItemFromActor(actor, SHARED_PREY_FEAT_ID);
    const hasTripleThreat = !!getItemFromActor(actor, TRIPLE_THREAT_FEAT_ID);

    const maxTargets = hasTripleThreat
        ? { num: 3, word: localize("maxTargetsThree") }
        : hasDoublePrey
            ? { num: 2, word: localize("maxTargetsTwo") }
            : { num: 1, word: localize("maxTargetsOne") };

    const targets = getTargets(maxTargets);
    if (!targets.length) {
        return;
    }

    const updates = new Updates(actor);

    /**
     * HUNT PREY ACTION AND EFFECT
     */
    const remainingTargets = maxTargets.num - targets.length;
    const remainingTargetsText = remainingTargets === 2
        ? localize("shareWithTwo")
        : remainingTargets === 1 && hasSharedPrey
            ? localize("shareWithOne")
            : "";

    const showTokenNames = !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
    const targetNames = targets.map(target => (showTokenNames || target.document.playersCanSeeName) ? target.name : localize("unknownToken"));
    const targetData = { token: token.name, target1: targetNames[0], target2: targetNames[1], target3: targetNames[2] };

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
        huntPreyAction.name,
        1
    );

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

    // If this is a flurry ranger, update the hunted prey toggle to true
    const flurryFeature = getItemFromActor(actor, FLURRY_FEATURE_ID);
    if (flurryFeature) {
        const rules = huntPreyAction.toObject().system.rules;
        const rule = rules.find(r => r.key === "RollOption" && r.option === "hunted-prey" && r.toggleable && !r.value);
        if (rule) {
            rule.value = true;
            updates.update(huntPreyAction, { "system.rules": rules });
        }
    }

    await HookManager.call("hunt-prey", { actor, updates });

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
    const huntPreyActionRules = huntPreyAction.toObject().system.rules;

    // Add a new rule to set the "hunted-prey" roll option if our target is our hunted prey
    // As this rule has the same roll option as the toggle, we have to add this rule *after* the toggleable one or we get errors
    const huntedPreyTargetRule = huntPreyActionRules.find(rule =>
        rule.key == "RollOption" &&
        rule.option == "hunted-prey" &&
        rule.predicate?.includes("target:effect:prey-{actor|id}")
    );
    if (!huntedPreyTargetRule) {
        const huntedPreyIndex = huntPreyActionRules.findIndex(rule => rule.key == "RollOption" && rule.option == "hunted-prey" && rule.toggleable);
        huntPreyActionRules.splice(
            huntedPreyIndex + 1,
            0,
            {
                key: "RollOption",
                option: "hunted-prey",
                predicate: [
                    "target:effect:prey-{actor|id}"
                ]
            }
        );

        updates.update(huntPreyAction, { "system.rules": huntPreyActionRules });
    }
}

/**
 * @param {PF2eActor} actor 
 * @param {Updates} updates 
 */
function updateOutwitFeature(actor, updates) {
    const outwitFeature = getItemFromActor(actor, OUTWIT_FEATURE_ID);
    if (!outwitFeature) {
        return;
    }

    /** @type []any */
    const outwitRules = outwitFeature.toObject().system.rules;

    // For the AC bonus rule, we want the bonus to also trigger if we're being attacked by our hunted prey
    const acBonusRule = outwitRules.find(rule =>
        rule.key == "FlatModifier" &&
        rule.selector == "ac" &&
        rule.predicate.some(predicate => predicate == "hunted-prey")
    );
    if (acBonusRule) {
        acBonusRule.predicate = [
            {
                or: [
                    "hunted-prey",
                    "origin:effect:prey-{actor|id}"
                ]
            }
        ];
        updates.update(outwitFeature, { "system.rules": outwitRules });
    }
}

/**
 * @param {PF2eActor} actor
 * @param {Updates} updates
 */
function updatePrecisionFeature(actor, updates) {
    const precisionFeature = getItemFromActor(actor, PRECISION_FEATURE_ID);
    if (!precisionFeature) {
        return;
    }

    // If the prey attack number flag isn't present, set it to 1
    const preyAttackNumber = getFlag(precisionFeature, "preyAttackNumber");
    if (!preyAttackNumber) {
        updates.update(
            precisionFeature,
            {
                "flags": {
                    "pf2e-ranged-combat": {
                        "preyAttackNumber": 1
                    }
                }
            }
        );
    }

    const precisionRules = precisionFeature.toObject().system.rules;
    let update = false;

    // Add the prey attack number as a rule
    const preyAttackNumberRule = precisionRules.find(rule => rule.key == "RollOption" && rule.option?.startsWith("prey-attack-number"));
    if (!preyAttackNumberRule) {
        precisionRules.unshift(
            {
                key: "RollOption",
                domain: "all",
                option: "prey-attack-number:{item|flags.pf2e-ranged-combat.preyAttackNumber}"
            }
        );
        update = true;
    }

    // The first-attack rule needs to be disabled if the "hunted-prey" roll option is toggled off
    // Also set the priority to 51 so its toggle is listed after the "hunted-prey" toggle
    const firstAttackRule = precisionRules.find(rule => rule.key == "RollOption" && rule.option == "first-attack");
    if (firstAttackRule) {
        if (!firstAttackRule.disabledIf) {
            firstAttackRule.disabledIf = [
                {
                    "not": "hunted-prey"
                }
            ];
            firstAttackRule.disabledValue = false;

            update = true;
        }

        if ((firstAttackRule.priority ?? 0) < 51) {
            firstAttackRule.priority = 51;
            update = true;
        }
    }

    // Set the precision damage to only trigger if we're attacking our hunted prey, and to also trigger if our new "prey-attack-number" is 1
    const damageDiceRule = precisionRules.find(rule => rule.key == "DamageDice" && rule.predicate?.some(predicate => predicate == "first-attack"));
    if (damageDiceRule) {
        damageDiceRule.predicate = [
            "hunted-prey",
            {
                or: [
                    "first-attack",
                    "prey-attack-number:1"
                ]
            }
        ];
        update = true;
    }

    if (update) {
        updates.update(precisionFeature, { "system.rules": precisionRules });
    }
}
