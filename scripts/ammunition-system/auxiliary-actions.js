import { findGroupStacks } from "../thrown-weapons/change-carry-type.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eWeapon } from "../types/pf2e/weapon.js";
import { Updates, getEffectFromActor, getFlag, getFlags, getItemFromActor, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { characterWeaponTransform } from "../utils/weapon-utils.js";
import { performConjureBullet } from "./actions/conjure-bullet.js";
import { performNextChamber } from "./actions/next-chamber.js";
import { performReloadMagazine } from "./actions/reload-magazine.js";
import { performReload } from "./actions/reload.js";
import { isWeaponLoaded, performUnload } from "./actions/unload.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURE_BULLET_ACTION_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { getLoadedAmmunitions, isFullyLoaded } from "./utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.names." + key);

export function buildAuxiliaryActions(strike) {
    const pf2eWeapon = strike.item;
    const actor = pf2eWeapon.actor;
    const weapon = characterWeaponTransform(pf2eWeapon);

    const tokens = actor?.getActiveTokens();
    const token = tokens?.length === 1 ? tokens[0] : { name: actor.name, actor: actor };

    const auxiliaryActions = strike.auxiliaryActions;

    // Reload
    if (canReload(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("reload"),
                "interact",
                pf2eWeapon.reload,
                pf2eWeapon.reload,
                2,
                async () => {
                    const updates = new Updates(actor);
                    await performReload(actor, token, weapon, updates);
                    updates.handleUpdates();
                }
            )
        );
    }

    // Reload Magazine
    if (canReloadMagazine(weapon)) {
        const numActions = calculateReloadMagazineActions(weapon);

        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("reloadMagazine"),
                "interact",
                numActions,
                numActions,
                2,
                async () => performReloadMagazine(actor, token, weapon)
            )
        );
    }

    // Next Chamber
    if (canSwitchChamber(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("nextChamber"),
                "interact",
                1,
                "1",
                1,
                async () => performNextChamber(actor, token, weapon)
            )
        );
    }

    // Unload, if the weapon can be unloaded
    if (isWeaponLoaded(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                localize("unload"),
                "interact",
                1,
                "1",
                2,
                async () => performUnload(actor, token, weapon)
            )
        );
    }

    // Conjure Bullet
    if (canConjureBullet(weapon)) {
        auxiliaryActions.push(
            buildAuxiliaryAction(
                pf2eWeapon,
                game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.conjureBullet.chatActionName"),
                "interact",
                1,
                "1",
                1,
                async () => performConjureBullet(actor, token, weapon)
            )
        );
    }

    // If the weapon is equipped, and there are other stacks of the same type
    if (weapon.isEquipped) {
        const groupStacks = findGroupStacks(weapon);

        if (groupStacks.length && weapon.quantity === 0) {
            auxiliaryActions.findSplice(action =>
                action.label === game.i18n.localize("PF2E.Actions.Release.ChangeGrip.Title") ||
                action.label === game.i18n.localize("PF2E.Actions.Interact.ChangeGrip.Title")
            );

            auxiliaryActions.findSplice(action => action.label === game.i18n.localize("PF2E.Actions.Release.Drop.Title"));
            auxiliaryActions.findSplice(action => action.label === game.i18n.localize("PF2E.Actions.Interact.Sheathe.Title"));

            auxiliaryActions.push(
                buildAuxiliaryAction(
                    pf2eWeapon,
                    "Remove",
                    "",
                    0,
                    undefined,
                    0,
                    () => pf2eWeapon.delete()
                )
            );
        }

        const wornStack = groupStacks.find(weapon => weapon.carryType === "worn");
        if (wornStack) {
            if (weapon.quantity === 0) {
                auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw1H", 1));

                if (weapon.hands === 2) {
                    auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, "Draw2H", 2));
                }
            } else {
                auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, wornStack, `Draw${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
            }
        }

        const droppedStack = groupStacks.find(weapon => weapon.carryType === "dropped");
        if (droppedStack) {
            if (weapon.quantity === 0) {
                auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp1H", 1));

                if (weapon.hands === 2) {
                    auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, "PickUp2H", 2));
                }
            } else {
                auxiliaryActions.push(buildCarryTypeAuxiliaryAction(pf2eWeapon, droppedStack, `PickUp${pf2eWeapon.handsHeld}H`, pf2eWeapon.handsHeld));
            }
        }
    }
}

/**
 * @param {PF2eWeapon} weapon 
 * @param {string} action 
 * @param {string} actionType 
 * @param {number} numActions 
 * @param {string} glyph
 * @param {number} hands
 * @param {() => void} callback 
 */
function buildAuxiliaryAction(
    weapon,
    action,
    actionType,
    numActions,
    glyph,
    hands,
    callback,
) {
    return {
        weapon: weapon,
        action: actionType,
        hands: hands,
        actions: numActions,
        carryType: null,

        actor: weapon.actor,
        label: action,
        glyph: glyph,
        execute: callback
    };
}

/**
 * @param {Weapon} weapon 
 * @returns boolean
 */
function canReload(weapon) {
    if (!weapon.requiresLoading) {
        return false;
    }

    if (isFullyLoaded(weapon)) {
        return false;
    }

    if (useAdvancedAmmunitionSystem(weapon.actor)) {
        if (weapon.isRepeating) {
            const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            if (!magazineLoadedEffect) {
                return false;
            }

            if (getFlag(magazineLoadedEffect, "remaining") < 1) {
                return false;
            }
        } else {
            if (!weapon.ammunition) {
                return false;
            }
        }
    }

    return true;
}

/**
 * @param {Weapon} weapon
 * @returns boolean
 */
function canReloadMagazine(weapon) {
    if (!weapon.isRepeating) {
        return false;
    }

    if (!useAdvancedAmmunitionSystem(weapon.actor)) {
        return false;
    }

    if (!weapon.ammunition) {
        return false;
    }

    if (weapon.ammunition.quantity < 1) {
        return false;
    }

    const magazineLoadedEffect = getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    if (magazineLoadedEffect) {
        const magazineLoadedFlags = getFlags(magazineLoadedEffect);
        if (magazineLoadedFlags.ammunitionSourceId != weapon.ammunition.sourceId) {
            return true;
        }

        if (magazineLoadedFlags.remaining >= weapon.ammunition.system.uses.value) {
            return false;
        }
    }

    return true;
}

/**
 * @param {Weapon} weapon 
 * @returns number
 */
function calculateReloadMagazineActions(weapon) {
    return !!getEffectFromActor(weapon.actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id) ? 3 : 2;
}

/**
 * @param {Weapon} weapon 
 * @returns number
 */
function canSwitchChamber(weapon) {
    if (!useAdvancedAmmunitionSystem(weapon.actor)) {
        return false;
    }

    if (!weapon.isCapacity) {
        return false;
    }

    const loadedAmmunitions = getLoadedAmmunitions(weapon);
    if (loadedAmmunitions.length == 0) {
        return false;
    }

    const chamberLoadedEffect = getEffectFromActor(weapon.actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (!chamberLoadedEffect) {
        return true;
    }

    if (loadedAmmunitions.length == 1) {
        return false;
    }

    return true;
}

/**
 * @param {Weapon} weapon 
 * @returns 
 */
function canConjureBullet(weapon) {
    if (isFullyLoaded(weapon)) {
        return false;
    }

    const conjureBulletAction = getItemFromActor(weapon.actor, CONJURE_BULLET_ACTION_ID);
    if (!conjureBulletAction) {
        return false;
    }

    const conjuredRoundEffect = getEffectFromActor(weapon.actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        return false;
    }

    return true;
}

function buildCarryTypeAuxiliaryAction(pf2eWeapon, stack, action, hands) {
    return buildAuxiliaryAction(
        pf2eWeapon,
        game.i18n.localize(`PF2E.Actions.Interact.${action}.Title`),
        "interact",
        1,
        "1",
        hands,
        () => changeCarryType(stack, action, hands)
    );
}

async function changeCarryType(weapon, subAction, hands) {
    weapon.actor.changeCarryType(weapon, { carryType: "held", handsHeld: hands });

    if (!game.combat) return; // Only send out messages if in encounter mode

    const flavor = await renderTemplate(
        "./systems/pf2e/templates/chat/action/flavor.hbs",
        {
            action: {
                title: `PF2E.Actions.Interact.Title`,
                subtitle: `PF2E.Actions.Interact.${subAction}.Title`,
                glyph: "1",
            },
            traits: [traitSlugToObject("manipulate")]
        }
    );
    const content = await renderTemplate(
        "./systems/pf2e/templates/chat/action/content.hbs",
        {
            imgPath: weapon.img,
            message: game.i18n.format(
                `PF2E.Actions.Interact.${subAction}.Description`,
                {
                    actor: weapon.actor.name,
                    weapon: weapon.name,
                    shield: weapon.name,
                }
            )
        }
    );

    ChatMessage.create(
        {
            content,
            speaker: ChatMessage.getSpeaker({ actor: weapon.actor }),
            flavor,
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
        }
    );
}

function traitSlugToObject(trait) {
    return {
        name: trait,
        label: game.i18n.localize(CONFIG.PF2E.actionTraits[trait] ?? trait),
        description: CONFIG.PF2E.traitsDescriptions[trait]
    };
}
