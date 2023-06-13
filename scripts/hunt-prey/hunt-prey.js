import { handleHuntPrey } from "../feats/crossbow-feats.js";
import { getControlledActorAndToken, getItem, getItemFromActor, postActionInChat, postInChat, showWarning, Updates } from "../utils/utils.js";

export const HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.Item.JYi4MnsdFu618hPm";
export const HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.rdLADYwOByj8AZ7r";
export const PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.mVYwtEeIaI6AW9jK";

export const DOUBLE_PREY_FEAT_ID = "Compendium.pf2e.feats-srd.Item.pbD4lfAPkK1NNag0";
export const TRIPLE_THREAT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.EHorYedQ8r05qAtk";
export const SHARED_PREY_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Aqhsx5duEpBgaPB0";

export const HUNT_PREY_IMG = "systems/pf2e/icons/features/classes/hunt-prey.webp";

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
    {
        const remainingTargets = maxTargets.num - targets.length;
        const remainingTargetsText = remainingTargets === 2
            ? localize("shareWithTwo")
            : remainingTargets === 1 && hasSharedPrey
                ? localize("shareWithOne")
                : "";

        const showTokenNames = !game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
        const targetNames = targets.map(target => (showTokenNames || target.document.playersCanSeeName) ? target.name : localize("unknownToken"));
        const targetData = { token: token.name, target1: targetNames[0], target2: targetNames[1], target3: targetNames[2] };
        await postActionInChat(huntPreyAction);
        await postInChat(
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

        // Update the hunted prey flag to true
        const rules = huntPreyAction.system.rules;
        const rule = rules.find(r => r.key === "RollOption" && r.option === "hunted-prey" && !r.value);
        if (rule) {
            rule.value = true;
            updates.update(huntPreyAction, { "system.rules": rules });
        }
    }

    await handleHuntPrey(actor, updates);

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
