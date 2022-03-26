import { ItemSelectDialog } from "../utils/item-select-dialog.js";
import * as Utils from "../utils/utils.js";
import * as WeaponUtils from "../utils/weapon-utils.js";

const ALCHEMICAL_CROSSBOW_ITEM_ID = "Compendium.pf2e.equipment-srd.loueS11Tfa9WD320";
const LOADED_BOMB_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.cA9sBCFAxY2EJgrC";

const DAMAGE_TYPES = ["acid", "cold", "electricity", "fire", "sonic"];

export async function loadAlchemicalCrossbow() {
    const { actor, token } = Utils.getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getAlchemicalCrossbow(actor, token);
    if (!weapon) {
        return;
    }

    const bomb = await getElementalBomb(actor, token);
    if (!bomb) {
        return;
    }

    const existing = Utils.getEffectFromActor(actor, LOADED_BOMB_EFFECT_ID, weapon.id);
    if (existing) {
        const existingFlags = existing.data.flags["pf2e-ranged-combat"];
        const hasMaxCharges = hasMaxCharges(existingFlags);
        if (existingFlags.bombSourceId === bomb.sourceId && hasMaxCharges) {
            ui.notifications.warn(`${token.name}'s ${weapon.name} is already loaded with ${existingFlags.bombName}.`);
            return;
        }

        const existingResult = hasMaxCharges
            ? `${existingFlags.bombName} will be returned to your inventory.`
            : `The remaining uses of ${existingFlags.bombName} will be wasted.`;

        const result = await new Dialog(
            {
                title: `${weapon.name} Already Loaded`,
                content: `
                    <p>${weapon.name} already has ${existingFlags.bombName} loaded with ${existingFlags.bombCharges} uses remaining.<p>
                    <p>Would you like to load ${bomb.name} instead? ${existingResult}<p>
                `,
                "buttons": {
                    "ok": {
                        "label": "Load",
                    },
                    "cancel": {
                        "label": "Do Not Load",
                    }
                }
            }
        ).render(true);

        if (result === "cancel") {
            return;
        }

        if (hasMaxCharges) {
            const bombItem = Utils.findItemOnActor(actor, existingFlags.bombItemId, existingFlags.bombSourceId);
            if (bombItem) {
                // We found either the original bomb stack or a stack of the same type.
                // Add one to the stack
                updates.update(async () => {
                    await bombItem.update({
                        "data.quantity": bombItem.quantity + 1
                    });
                });
            } else {
                // Create a new stack containing only this bomb
                const ammunitionSource = await Utils.getItem(loadedSourceId);
                ammunitionSource.data.quantity = 1;
                updates.add(ammunitionSource);
            }
        }

        updates.remove(existing);
    }

    const updates = new Utils.Updates(actor);

    const elementType = DAMAGE_TYPES.find(damageType => bomb.traits.has(damageType));

    const lesserIndex = bomb.name.indexOf(" (Lesser)");
    const bombName = lesserIndex > -1 ? bomb.name.substring(0, lesserIndex) : bomb.name;

    const loadedBombEffectSource = await Utils.getItem(LOADED_BOMB_EFFECT_ID);
    Utils.setEffectTarget(loadedBombEffectSource, weapon, false);
    Utils.setChoice(loadedBombEffectSource, "damageType", elementType, bombName);
    const loadedBombEffectSourceFlags = loadedBombEffectSource.flags["pf2e-ranged-combat"];
    Object.assign(
        loadedBombEffectSourceFlags,
        {
            bombItemId: bomb.id,
            bombSourceId: bomb.sourceId,
            bombName: bomb.name,
            bombCharges: 3,
            bombMaxCharges: 3,
            effectName: loadedBombEffectSource.name
        }
    );
    loadedBombEffectSource.name += ` (${loadedBombEffectSourceFlags.bombCharges}/${loadedBombEffectSourceFlags.bombMaxCharges})`;

    updates.add(loadedBombEffectSource);

    // Remove one bomb from the stack
    updates.update(async () => {
        await bomb.value.update({
            "data.quantity": bomb.quantity - 1
        });
    });

    await updates.handleUpdates();

    await Utils.postInChat(
        actor,
        bomb.img,
        `${token.name} loads their ${weapon.name} with ${bomb.name}.`,
        "Interact",
        "1"
    );
}

export async function handleWeaponFired(actor, weapon, updates) {
    if (weapon.sourceId !== ALCHEMICAL_CROSSBOW_ITEM_ID) {
        return;
    }

    const loadedBombEffect = Utils.getEffectFromActor(actor, LOADED_BOMB_EFFECT_ID, weapon.id);
    const flags = loadedBombEffect.data.flags["pf2e-ranged-combat"];

    if (flags.bombCharges === 0) {
        // We've already fired three bombs, but we kept the effect around for the damage roll
        // Remove the effect now that we're making a fourth attack
        updates.remove(loadedBombEffect);
        return;
    } else {
        const update = {
            "flags.pf2e-ranged-combat.bombCharges": flags.bombCharges - 1,
            "name": flags.effectName + ` (${flags.bombCharges - 1}/${flags.bombMaxCharges})`
        };

        if (flags.bombCharges === flags.bombMaxCharges) {
            const initiative = game.combat?.turns[game.combat.turn]?.initiative ?? null;
            Object.assign(
                update,
                {
                    "data.duration": {
                        value: 1,
                        unit: "minutes",
                        sustained: false,
                        expiry: "turn-start"
                    },
                    "data.start": {
                        value: game.time.worldTime,
                        initiative: game.combat && game.combat.turns.length > game.combat.turn ? initiative : null
                    }
                }
            );
        }
        updates.update(() => loadedBombEffect.update(update));

        // Show floaty text with the new effect name
        const tokens = actor.getActiveTokens();
        for (const token of tokens) {
            token.showFloatyText({
                update: {
                    name: `${flags.effectName} (${flags.bombCharges - 1}/${flags.bombMaxCharges})`
                }
            });
        }
    }
}

function getAlchemicalCrossbow(actor, token) {
    return WeaponUtils.getWeapon(
        actor,
        weapon => weapon.sourceId === ALCHEMICAL_CROSSBOW_ITEM_ID,
        `${token.name} has no Alchemical Crossbow.`
    );
}

function getElementalBomb(actor, token) {
    return WeaponUtils.getWeapon(
        actor,
        weapon =>
            weapon.baseType === "alchemical-bomb"
            && DAMAGE_TYPES.some(element => weapon.traits.has(element))
            && weapon.name.includes("Lesser")
            && weapon.quantity > 0,
        `${token.name} has no lesser alchemical bombs that deal energy damage.`
    );
}

function hasMaxCharges(flags) {
    return flags.bombCharges === flags.bombMaxCharges;
}
