import { PF2eActor } from "../types/pf2e/actor.js";
import { Updates } from "../utils/updates.js";
import { getControlledActor, getFlag, getItem, getItemFromActor, showWarning } from "../utils/utils.js";
import { ANIMAL_COMPANION_RANGER_FEAT_ID, MASTERFUL_ANIMAL_COMPANION_FEAT_ID, MASTERFUL_COMPANION_RANGER_FEAT_ID, RANGERS_ANIMAL_COMPANION_FEAT_ID } from "./constants.js";

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
        deleteRangersAnimalCompanionFeats(companion, actor.id, companionUpdates);
    } else if (existingCompanionId) {
        const existingCompanion = game.actors.get(existingCompanionId);
        if (existingCompanion) {
            const existingCompanionUpdates = new Updates(existingCompanion);
            deleteRangersAnimalCompanionFeats(existingCompanion, actor.id, existingCompanionUpdates);
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
            "master-signature": actor.signature,
            "hunters-edge": huntersEdge?.slug || "none"
        }
    };

    companionUpdates.create(rangersAnimalCompanionSource);

    // If we have the Masterful Companion feat, add the Masterful Animal Companion feat to the companion
    if (getItemFromActor(actor, MASTERFUL_COMPANION_RANGER_FEAT_ID)) {
        await createMasterfulAnimalCompanionFeat(actor, companionUpdates);
    }

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
 * Create the Masterful Animal Companion feat
 */
export async function createMasterfulAnimalCompanionFeat(actor, companionUpdates) {
    const masterfulAnimalCompanionSource = await getItem(MASTERFUL_ANIMAL_COMPANION_FEAT_ID);
    masterfulAnimalCompanionSource.name = format("masterfulAnimalCompanion", { actor: actor.name });
    masterfulAnimalCompanionSource.flags = {
        ...masterfulAnimalCompanionSource.flags,
        "pf2e-ranged-combat": {
            "master-id": actor.id,
            "master-signature": actor.signature
        }
    };

    companionUpdates.create(masterfulAnimalCompanionSource);
}

/**
 * Delete any existing feats relating to this being the ranger's animal companion
 * 
 * @param {PF2eActor} creature
 * @param {string} masterId
 * @param {Updates} updates
 */
function deleteRangersAnimalCompanionFeats(creature, masterId, updates) {
    deleteAnimalCompanionFeat(creature, masterId, RANGERS_ANIMAL_COMPANION_FEAT_ID, updates);
    deleteAnimalCompanionFeat(creature, masterId, MASTERFUL_ANIMAL_COMPANION_FEAT_ID, updates);
}

/**
 * @param {PF2eActor} creature 
 * @param {string} masterId 
 * @param {string} featId 
 * @param {Updates} updates 
 */
export function deleteAnimalCompanionFeat(creature, masterId, featId, updates) {
    const feat = getItemFromActor(creature, featId);
    if (feat && getFlag(feat, "master-id") == masterId) {
        updates.delete(feat);
    }
}
