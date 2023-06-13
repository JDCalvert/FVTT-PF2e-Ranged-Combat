import { dialogPrompt } from "../utils/prompt-dialog.js";
import { findItemOnActor, getControlledActorAndToken, getEffectFromActor, getItem, postInChat, setChoice, setEffectTarget, showWarning, Updates } from "../utils/utils.js";
import { getWeapon } from "../utils/weapon-utils.js";

const LOADED_BOMB_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.cA9sBCFAxY2EJgrC";
const UNLOAD_BOMB_IMG = "modules/pf2e-ranged-combat/art/unload-alchemical-crossbow.webp";

const DAMAGE_TYPES = ["acid", "cold", "electricity", "fire", "sonic"];

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.actions.alchemicalCrossbow." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.actions.alchemicalCrossbow." + key, data);

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
                showWarning(format("warningAlreadyLoaded", { token: token.name, weapon: weapon.name, bomb: loadedBombFlags.bombName }));
                return;
            }

            const existingResult = hasMaxCharges
                ? format("bombWillBeReturned", { bomb: loadedBombFlags.bombName })
                : format("usesWillBeWasted", { bomb: loadedBombFlags.bombName });

            const shouldLoad = await dialogPrompt(
                format("loadInsteadDialogTitle", { weapon: weapon.name }),
                `<p>${format("weaponIsLoadedWithCharges", { weapon: weapon.name, bomb: loadedBombFlags.bombName, bombCharges: loadedBombFlags.bombCharges, bombMaxCharges: loadedBombFlags.bombMaxCharges })}<p>
                <p>${format("loadInstead", { bomb: bomb.name })} ${existingResult}<p>`,
                localize("buttonLoad"),
                localize("buttonDoNotLoad")
            );

            if (!shouldLoad) {
                return;
            }
        }

        await unloadBomb(actor, loadedBombEffect, updates);
    }

    const elementType = DAMAGE_TYPES.find(damageType => bomb.traits.has(damageType));

    const lesserIndex = bomb.name.indexOf(` (${localize("lesser")})`);
    const bombName = lesserIndex > -1 ? bomb.name.substring(0, lesserIndex) : bomb.name;

    const loadedBombEffectSource = await getItem(LOADED_BOMB_EFFECT_ID);
    setEffectTarget(loadedBombEffectSource, weapon, false);
    setChoice(loadedBombEffectSource, "damageType", elementType, bombName);
    loadedBombEffectSource.flags["pf2e-ranged-combat"] = {
        ...loadedBombEffectSource.flags["pf2e-ranged-combat"],
        bombItemId: bomb.id,
        bombSourceId: bomb.sourceId,
        bombName: bomb.name,
        bombCharges: 3,
        bombMaxCharges: 3,
        effectName: loadedBombEffectSource.name
    };
    loadedBombEffectSource.name += ` (3/3)`;

    updates.create(loadedBombEffectSource);

    // Remove one bomb from the stack
    updates.update(bomb, { "system.quantity": bomb.quantity - 1 });

    await postInChat(
        actor,
        bomb.img,
        format("tokenLoadsWeaponWithBomb", { token: token.name, weapon: weapon.name, bomb: bomb.name }),
        game.i18n.localize("PF2E.Actions.Interact.Title"),
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
        showWarning(format("warningWeaponNotLoaded", { token: token.name, wepaon: weapon.name }));
        return;
    }

    const updates = new Updates(actor);

    const loadedBombFlags = loadedBombEffect.flags["pf2e-ranged-combat"];
    const hasMaxCharges = bombHasMaxCharges(loadedBombFlags);

    if (!hasMaxCharges && loadedBombFlags.bombCharges > 0) {
        const shouldUnload = await dialogPrompt(
            format("shouldUnloadDialogTitle", { bomb: loadedBombFlags.bombName }),
            `
                <p>${format("weaponIsLoadedWithCharges", { weapon: weapon.name, bomb: loadedBombFlags.bombName, charges: loadedBombFlags.bombCharges, maxCharges: loadedBombFlags.bombMaxCharges })}
                ${localize("shouldUnloadDialogRestWasted")}</p>
                <p>${format("shouldUnloadInstead", { bomb: loadedBombFlags.bombName, weapon: weapon.name })}</p>
            `,
            localize("buttonUnload"),
            localize("buttonDoNotUnload")
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
            format(
                "tokenUnloadsBombFromWeapon",
                {
                    token: token.name,
                    weapon: weapon.name,
                    bomb: loadedBombFlags.bombName
                }
            ),
            game.i18n.localize("PF2E.Actions.Interact.Title"),
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
        updates.delete(loadedBombEffect);
        return;
    } else {
        const update = {
            "flags.pf2e-ranged-combat.bombCharges": flags.bombCharges - 1,
            "name": flags.effectName + ` (${flags.bombCharges - 1}/${flags.bombMaxCharges})`
        };

        if (bombHasMaxCharges(flags)) {
            const initiative = game.combat?.turns[game.combat.turn]?.initiative ?? null;
            update.system = {
                duration: {
                    value: 1,
                    unit: "minutes",
                    sustained: false,
                    expiry: "turn-start"
                },
                start: {
                    value: game.time.worldTime,
                    initiative: game.combat && game.combat.turns.length > game.combat.turn ? initiative : null
                }
            };
        }
        updates.update(loadedBombEffect, update);
        updates.floatyText(`${flags.effectName} (${flags.bombCharges - 1}/${flags.bombMaxCharges})`, false);
    }
}

function getAlchemicalCrossbow(actor, token, prioritise) {
    return getWeapon(
        actor,
        isAlchemicalCrossbow,
        format("warningNoAlchemicalCrossbow", { token: token.name }),
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
            && weapon.name.includes(localize("lesser"))
            && weapon.quantity > 0,
        format("warningNoLesserAlchemicalBombs", { token: token.name })
    );
}

async function unloadBomb(actor, bombLoadedEffect, updates) {
    const bombLoadedFlags = bombLoadedEffect.flags["pf2e-ranged-combat"];
    if (bombHasMaxCharges(bombLoadedFlags)) {
        const bombItem = findItemOnActor(actor, bombLoadedFlags.bombItemId, bombLoadedFlags.bombSourceId);
        if (bombItem) {
            // We found either the original bomb stack or a stack of the same type.
            // Add one to the stack
            updates.update(bombItem, { "system.quantity": bombItem.quantity + 1 });
        } else {
            // Create a new stack containing only this bomb
            const bombSource = await getItem(bombLoadedFlags.bombSourceId);
            bombSource.system.quantity = 1;
            updates.create(bombSource);
        }
    }

    updates.delete(bombLoadedEffect);
}

function bombHasMaxCharges(flags) {
    return flags.bombCharges === flags.bombMaxCharges;
}
