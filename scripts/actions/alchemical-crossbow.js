import { Chat } from "../utils/chat.js";
import { HookManager } from "../hook-manager/hook-manager.js";
import { dialogPrompt } from "../utils/prompt-dialog.js";
import { Updates } from "../utils/updates.js";
import { setChoice, Util } from "../utils/utils.js";
import { WeaponSystem } from "../weapons/system.js";
import { Weapon } from "../weapons/types.js";

const LOADED_BOMB_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.cA9sBCFAxY2EJgrC";
const UNLOAD_BOMB_IMG = "modules/pf2e-ranged-combat/art/unload-alchemical-crossbow.webp";

const DAMAGE_TYPES = ["acid", "cold", "electricity", "fire", "force", "sonic", "vitality", "void"];

export class AlchemicalCrossbow {
    /**
     * @param {string} key 
     * @param {object} data 
     * 
     * @returns {string}
     */
    static localize(key, data) {
        return Util.localize(`actions.alchemicalCrossbow.${key}`, data);
    }

    static initialise() {
        HookManager.register("weapon-attack", handleWeaponFired);
    }

    static async load() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await getAlchemicalCrossbow(actor, true);
        if (!weapon) {
            return;
        }

        const bomb = await getElementalBomb(actor);
        if (!bomb) {
            return;
        }

        const updates = new Updates(actor);

        const loadedBombEffect = Util.getEffect(weapon, LOADED_BOMB_EFFECT_ID);
        if (loadedBombEffect) {
            const loadedBombFlags = loadedBombEffect.flags["pf2e-ranged-combat"];
            if (loadedBombFlags.bombCharges > 0) {
                const hasMaxCharges = bombHasMaxCharges(loadedBombFlags);
                if (loadedBombFlags.bombSourceId === bomb.sourceId && hasMaxCharges) {
                    Util.warn(AlchemicalCrossbow.localize("warningAlreadyLoaded", { token: actor.name, weapon: weapon.name, bomb: loadedBombFlags.bombName }));
                    return;
                }

                const existingResult = AlchemicalCrossbow.localize(
                    hasMaxCharges ? "bombWillBeReturned" : "usesWillBeWasted",
                    { bomb: loadedBombFlags.bombName }
                );

                const shouldLoad = await dialogPrompt(
                    AlchemicalCrossbow.localize("loadInsteadDialogTitle", { weapon: weapon.name }),
                    `<p>${AlchemicalCrossbow.localize(
                        "weaponIsLoadedWithCharges",
                        {
                            weapon: weapon.name,
                            bomb: loadedBombFlags.bombName,
                            charges: loadedBombFlags.bombCharges,
                            maxCharges: loadedBombFlags.bombMaxCharges
                        }
                    )}</p>
                    <p>${AlchemicalCrossbow.localize("loadInstead", { bomb: bomb.name })} ${existingResult}</p>`,
                    AlchemicalCrossbow.localize("buttonLoad"),
                    AlchemicalCrossbow.localize("buttonDoNotLoad")
                );

                if (!shouldLoad) {
                    return;
                }
            }

            await unloadBomb(actor, loadedBombEffect, updates);
        }

        const elementType = DAMAGE_TYPES.find(damageType => bomb.hasTrait(damageType));

        const lesserIndex = bomb.name.indexOf(` (${AlchemicalCrossbow.localize("lesser")})`);
        const bombName = lesserIndex > -1 ? bomb.name.substring(0, lesserIndex) : bomb.name;

        const loadedBombEffectSource = await Util.getSource(LOADED_BOMB_EFFECT_ID);
        Util.setEffectTarget(loadedBombEffectSource, weapon, false);
        setChoice(loadedBombEffectSource, "damageType", elementType, bombName);
        foundry.utils.mergeObject(
            loadedBombEffectSource.flags["pf2e-ranged-combat"],
            {
                bombItemId: bomb.id,
                bombSourceId: bomb.sourceId,
                bombName: bomb.name,
                bombCharges: 3,
                bombMaxCharges: 3,
                effectName: loadedBombEffectSource.name
            }
        );
        loadedBombEffectSource.name += ` (3/3)`;

        updates.create(loadedBombEffectSource);

        // Remove one bomb from the stack
        updates.update(bomb, { "system.quantity": bomb.quantity - 1 });

        await Chat.postInteract(
            actor,
            bomb.img,
            AlchemicalCrossbow.localize("tokenLoadsWeaponWithBomb", { token: actor.name, weapon: weapon.name, bomb: bomb.name }),
            {
                actionSymbol: "1"
            }
        );

        updates.commit();
    }

    static async unload() {
        const actor = Util.getControlledActor();
        if (!actor) {
            return;
        }

        const weapon = await getAlchemicalCrossbow(actor, false);
        if (!weapon) {
            return;
        }

        const loadedBombEffect = Util.getEffect(weapon, LOADED_BOMB_EFFECT_ID);
        if (!loadedBombEffect) {
            Util.warn(AlchemicalCrossbow.localize("warningWeaponNotLoaded", { token: actor.name, wepaon: weapon.name }));
            return;
        }

        const updates = new Updates(actor);

        const loadedBombFlags = loadedBombEffect.flags["pf2e-ranged-combat"];
        const hasMaxCharges = bombHasMaxCharges(loadedBombFlags);

        if (!hasMaxCharges && loadedBombFlags.bombCharges > 0) {
            const shouldUnload = await dialogPrompt(
                AlchemicalCrossbow.localize("shouldUnloadDialogTitle", { bomb: loadedBombFlags.bombName }),
                `
                <p>${AlchemicalCrossbow.localize(
                    "weaponIsLoadedWithCharges",
                    {
                        weapon: weapon.name,
                        bomb: loadedBombFlags.bombName,
                        charges: loadedBombFlags.bombCharges,
                        maxCharges: loadedBombFlags.bombMaxCharges
                    }
                )}
                ${AlchemicalCrossbow.localize("shouldUnloadDialogRestWasted")}</p>
                <p>${AlchemicalCrossbow.localize("shouldUnloadInstead", { bomb: loadedBombFlags.bombName, weapon: weapon.name })}</p>
                `,
                AlchemicalCrossbow.localize("buttonUnload"),
                AlchemicalCrossbow.localize("buttonDoNotUnload")
            );
            if (!shouldUnload) {
                return;
            }
        }

        await unloadBomb(actor, loadedBombEffect, updates);

        if (loadedBombFlags.bombCharges > 0) {
            await Chat.postInteract(
                actor,
                UNLOAD_BOMB_IMG,
                AlchemicalCrossbow.localize(
                    "tokenUnloadsBombFromWeapon",
                    {
                        token: actor.name,
                        weapon: weapon.name,
                        bomb: loadedBombFlags.bombName
                    }
                ),
                {
                    actionSymbol: "1"
                }
            );
        }

        updates.commit();
    }
}


function handleWeaponFired({ weapon, updates }) {
    if (!isAlchemicalCrossbow(weapon)) {
        return;
    }

    const loadedBombEffect = Util.getEffect(weapon, LOADED_BOMB_EFFECT_ID);
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

/**
 * @param {ActorPF2e} actor
 * @param {boolean} prioritise
 * 
 * @returns {Promise<Weapon | null>}
 */
function getAlchemicalCrossbow(actor, prioritise) {
    return WeaponSystem.getWeapon(
        actor,
        {
            required: weapon => weapon.baseItem === "alchemical-crossbow",
            priority: weapon => prioritise && weapon.isEquipped && !Util.getEffect(weapon, LOADED_BOMB_EFFECT_ID)
        },
        "generic",
        AlchemicalCrossbow.localize("warningNoAlchemicalCrossbow", { token: actor.name })
    );
}

function isAlchemicalCrossbow(weapon) {
    return weapon.baseType === "alchemical-crossbow";
}

/**
 * @param {ActorPF2e} actor 
 * @returns {Promise<Weapon | null>}
 */
async function getElementalBomb(actor) {
    return WeaponSystem.getWeapon(
        actor,
        {
            required: weapon =>
                weapon.baseItem === "alchemical-bomb"
                && DAMAGE_TYPES.some(element => weapon.traits.some(trait => trait === element))
                && weapon.slug.includes("lesser")
                && weapon.quantity > 0
        },
        "load",
        AlchemicalCrossbow.localize("warningNoLesserAlchemicalBombs", { token: actor.name })
    );
}

/**
 * @param {ActorPF2e} actor
 * @param {EffectPF2e} bombLoadedEffect,
 * @param {Updates} updates
 */
async function unloadBomb(actor, bombLoadedEffect, updates) {
    const bombLoadedFlags = bombLoadedEffect.flags["pf2e-ranged-combat"];
    if (bombHasMaxCharges(bombLoadedFlags)) {
        const bombItem = actor.items.find(item => item.id === bombLoadedFlags.bombItemId && !item.isStowed)
            ?? actor.items.find(item => item.sourceId === bombLoadedFlags.bombSourceId && !item.isStowed);
        if (bombItem) {
            // We found either the original bomb stack or a stack of the same type.
            // Add one to the stack
            updates.update(bombItem, { "system.quantity": bombItem.quantity + 1 });
        } else {
            // Create a new stack containing only this bomb
            const bombSource = await Util.getSource(bombLoadedFlags.bombSourceId);
            bombSource.system.quantity = 1;
            updates.create(bombSource);
        }
    }

    updates.delete(bombLoadedEffect);
}

function bombHasMaxCharges(flags) {
    return flags.bombCharges === flags.bombMaxCharges;
}
