import { PF2eWeapon } from "../types/pf2e/weapon.js";

/**
 * @param {PF2eWeapon} weapon
 * @param {string} action
 * @param {string} actionType
 * @param {number} numActions
 * @param {string} glyph
 * @param {number} hands
 * @param {() => void} callback
 */
export function buildAuxiliaryAction(
    weapon,
    action,
    actionType,
    numActions,
    glyph,
    hands,
    callback
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

export function buildCarryTypeAuxiliaryAction(pf2eWeapon, stack, action, hands) {
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

    const flavor = await render(
        "./systems/pf2e/templates/chat/action/flavor.hbs",
        {
            action: {
                title: `PF2E.Actions.Interact.Title`,
                subtitle: `PF2E.Actions.Interact.${subAction}.Title`,
                glyph: "1",
            },
            traits: ["manipulate"]
        }
    );
    const content = await render(
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
