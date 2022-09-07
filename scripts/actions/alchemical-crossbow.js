import { dialogPrompt } from "../utils/prompt-dialog.js";
import { findItemOnActor, getControlledActorAndToken, getEffectFromActor, getItem, postInChat, setChoice, setEffectTarget, showWarning, Updates } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";

const LOADED_BOMB_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.cA9sBCFAxY2EJgrC";
const UNLOAD_BOMB_IMG = "modules/pf2e-ranged-combat/art/unload-alchemical-crossbow.webp";

const DAMAGE_TYPES = ["acid", "cold", "electricity", "fire", "sonic"];

export async function loadAlchemicalCrossbow() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getAlchemicalCrossbow(actor, token, true);
    if (!weapon) {
        return;
    }

    const bomb = await getElementalBomb(actor, token);
    if (!bomb) {
        return;
    }

    const updates = new Updates(actor);

    const loadedBombEffect = getEffectFromActor(actor, LOADED_BOMB_EFFECT_ID, weapon.id);
    if (loadedBombEffect) {
        const loadedBombFlags = loadedBombEffect.flags["pf2e-ranged-combat"];
        if (loadedBombFlags.bombCharges > 0) {
            const hasMaxCharges = bombHasMaxCharges(loadedBombFlags);
            if (loadedBombFlags.bombSourceId === bomb.sourceId && hasMaxCharges) {
                showWarning(`${token.name}'s ${weapon.name} is already loaded with ${loadedBombFlags.bombName}.`);
                return;
            }

            const existingResult = hasMaxCharges
                ? `${loadedBombFlags.bombName} will be returned to your inventory.`
                : `The remaining uses of ${loadedBombFlags.bombName} will be wasted.`;

            const shouldLoad = await dialogPrompt(
                `${weapon.name} Already Loaded`,
                `<p>${weapon.name} is loaded with ${loadedBombFlags.bombName} with ${loadedBombFlags.bombCharges}/${loadedBombFlags.bombMaxCharges} uses remaining.<p>
                <p>Would you like to load ${bomb.name} instead? ${existingResult}<p>`,
                "Load",
                "Do Not Load"
            );

            if (!shouldLoad) {
                return;
            }
        }

        await unloadBomb(actor, loadedBombEffect, updates);
    }

    const elementType = DAMAGE_TYPES.find(damageType => bomb.traits.has(damageType));

    const lesserIndex = bomb.name.indexOf(" (Lesser)");
    const bombName = lesserIndex > -1 ? bomb.name.substring(0, lesserIndex) : bomb.name;

    const loadedBombEffectSource = await getItem(LOADED_BOMB_EFFECT_ID);
    setEffectTarget(loadedBombEffectSource, weapon, false);
    setChoice(loadedBombEffectSource, "damageType", elementType, bombName);
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

    await postInChat(
        actor,
        bomb.img,
        `${token.name} loads their ${weapon.name} with ${bomb.name}.`,
        "Interact",
        "1"
    );

    updates.handleUpdates();
}

export async function unloadAlchemicalCrossbow() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getAlchemicalCrossbow(actor, token, false);
    if (!weapon) {
        return;
    }

    const loadedBombEffect = getEffectFromActor(actor, LOADED_BOMB_EFFECT_ID, weapon.id);
    if (!loadedBombEffect) {
        showWarning(`${token.name}'s ${weapon.name} is not loaded with an alchemical bomb.`);
        return;
    }

    const updates = new Updates(actor);

    const loadedBombFlags = loadedBombEffect.flags["pf2e-ranged-combat"];
    const hasMaxCharges = bombHasMaxCharges(loadedBombFlags);

    if (!hasMaxCharges && loadedBombFlags.bombCharges > 0) {
        const shouldUnload = await dialogPrompt(
            `${loadedBombFlags.bombName} Discard`,
            `
                <p>${weapon.name} is loaded with ${loadedBombFlags.bombName} with ${loadedBombFlags.bombCharges}/${loadedBombFlags.bombMaxCharges} uses remaining.
                The remaining uses will be wasted</p>
                <p>Are you sure you want to unload ${loadedBombFlags.bombName} from ${weapon.name}?</p>
            `,
            "Unload",
            "Do Not Unload"
        );
        if (!shouldUnload) {
            return;
        }
    }

    await unloadBomb(actor, loadedBombEffect, updates);

    if (loadedBombFlags.bombCharges > 0) {
        await postInChat(
            actor,
            UNLOAD_BOMB_IMG,
            `${token.name} unloads ${loadedBombFlags.bombName} from their ${weapon.name}.`,
            "Interact",
            "1"
        );
    }

    updates.handleUpdates();
}

export function handleWeaponFired(actor, weapon, updates) {
    if (!isAlchemicalCrossbow(weapon)) {
        return;
    }

    const loadedBombEffect = getEffectFromActor(actor, LOADED_BOMB_EFFECT_ID, weapon.id);
    if (!loadedBombEffect) {
        return;
    }
    
    const flags = loadedBombEffect.flags["pf2e-ranged-combat"];
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

        if (bombHasMaxCharges(flags)) {
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
        updates.floatyText(`${flags.effectName} (${flags.bombCharges - 1}/${flags.bombMaxCharges})`, false);
    }
}

function getAlchemicalCrossbow(actor, token, prioritise) {
    return getWeapon(
        actor,
        isAlchemicalCrossbow,
        `${token.name} has no Alchemical Crossbow.`,
        weapon => prioritise && !getEffectFromActor(actor, LOADED_BOMB_EFFECT_ID, weapon.id)
    );
}

function isAlchemicalCrossbow(weapon) {
    return weapon.baseType === "alchemical-crossbow";
}

function getElementalBomb(actor, token) {
    return getWeapon(
        actor,
        weapon =>
            weapon.baseType === "alchemical-bomb"
            && DAMAGE_TYPES.some(element => weapon.traits.has(element))
            && weapon.name.includes("Lesser")
            && weapon.quantity > 0,
        `${token.name} has no lesser alchemical bombs that deal energy damage.`
    );
}

async function unloadBomb(actor, bombLoadedEffect, updates) {
    const bombLoadedFlags = bombLoadedEffect.flags["pf2e-ranged-combat"];
    if (bombHasMaxCharges(bombLoadedFlags)) {
        const bombItem = findItemOnActor(actor, bombLoadedFlags.bombItemId, bombLoadedFlags.bombSourceId);
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
            const bombSource = await getItem(bombLoadedFlags.bombSourceId);
            bombSource.system.quantity = 1;
            updates.add(bombSource);
        }
    }

    updates.remove(bombLoadedEffect);
}

function bombHasMaxCharges(flags) {
    return flags.bombCharges === flags.bombMaxCharges;
}
