import { PF2eActor } from "../types/pf2e/actor.js";
import { Updates } from "../utils/updates.js";
import { getControlledActor, getFlag, getItem, getItemFromActor, showWarning } from "../utils/utils.js";
import { ANIMAL_COMPANION_RANGER_FEAT_ID, RANGERS_ANIMAL_COMPANION_FEAT_ID } from "./constants.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.linkCompanion." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.linkCompanion." + key, data);

export async function linkCompanion() {
    const actor = getControlledActor();
    if (!actor) {
        return;
    }

    const animalCompanionFeat = getItemFromActor(actor, ANIMAL_COMPANION_RANGER_FEAT_ID);
    if (!animalCompanionFeat) {
        showWarning(format("noAnimalCompanionFeat", { actor: actor.name }));
        return;
    }

    const target = getTarget();
    if (!target) {
        return;
    }

    const companion = target.actor;
    const companionUpdates = new Updates(companion);

    // Delete any link on an existing animal companion
    const existingCompanionId = getFlag(actor, "animalCompanionId");
    if (existingCompanionId === companion.id) {
        deleteRangersAnimalCompanionFeat(companion, actor.id, companionUpdates);
    } else if (existingCompanionId) {
        const existingCompanion = await fromUuid(`Actor.${existingCompanionId}`);
        if (existingCompanion) {
            const existingCompanionUpdates = new Updates(existingCompanion);
            deleteRangersAnimalCompanionFeat(existingCompanion, actor.id, existingCompanionUpdates);
            existingCompanionUpdates.handleUpdates();
        }
    }

    // Set our companion flag to the new companion
    actor.update(
        {
            flags: {
                "pf2e-ranged-combat": {
                    animalCompanionId: companion.id
                }
            }
        }
    );

    const huntersEdge = actor.itemTypes.feat.find(feat => feat.system.traits.otherTags.includes("ranger-hunters-edge"));

    // Create the link on the new companion
    const rangersAnimalCompanionSource = await getItem(RANGERS_ANIMAL_COMPANION_FEAT_ID);
    rangersAnimalCompanionSource.name = format("rangersAnimalCompanion", { actor: actor.name });
    rangersAnimalCompanionSource.flags = {
        ...rangersAnimalCompanionSource.flags,
        "pf2e-ranged-combat": {
            "master-id": actor.id,
            "hunters-edge": huntersEdge?.slug || "none",
            "preyAttackNumber": 1
        }
    };

    companionUpdates.create(rangersAnimalCompanionSource);

    await companionUpdates.handleUpdates();

    // Notify that the link has been successfully made
    ui.notifications.info(format("linkedCompanion", { master: actor.name, companion: companion.name }));
}

function getTarget() {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));

    if (targetTokens.length != 1) {
        showWarning(localize("noTarget"));
        return null;
    }

    return targetTokens[0];
}

/**
 * 
 * @param {PF2eActor} creature
 * @param {string} masterId
 * @param {Updates} updates
 */
function deleteRangersAnimalCompanionFeat(creature, masterId, updates) {
    const rangersAnimalCompanionFeat = creature.itemTypes.feat
        .find(feat => feat.sourceId === RANGERS_ANIMAL_COMPANION_FEAT_ID && getFlag(feat, "master-id") === masterId);

    if (rangersAnimalCompanionFeat) {
        updates.delete(rangersAnimalCompanionFeat);
    }
}
