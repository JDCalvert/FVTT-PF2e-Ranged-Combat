import { Weapon } from "../../types/pf2e-ranged-combat/weapon.js";
import { PF2eActor } from "../../types/pf2e/actor.js";
import { PF2eToken } from "../../types/pf2e/token.js";
import { Updates } from "../../utils/updates.js";
import { findItemOnActor, getControlledActorAndToken, getEffectFromActor, getFlag, getItem, postInteractToChat, setEffectTarget, showWarning, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { applyAmmunitionEffect } from "../ammunition-effects.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_ITEM_ID, SELECT_NEXT_CHAMBER_IMG } from "../constants.js";
import { getSelectedAmmunition, isLoaded } from "../utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.nextChamber." + key);
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.nextChamber." + key, data);

export async function nextChamber() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getWeapon(
        actor,
        weapon => weapon.isCapacity,
        localize("noCapacityWeapons"),
        weapon => isLoaded(weapon) && !getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)
    );
    if (!weapon) {
        return;
    }

    if (!isLoaded(weapon)) {
        showWarning(format("warningNotLoaded", { weapon: weapon.name }));
        return;
    }

    performNextChamber(actor, token, weapon);
}

/**
 * @param {PF2eActor} actor
 * @param {PF2eToken} token
 * @param {Weapon} weapon
 */
export async function performNextChamber(actor, token, weapon) {
    const updates = new Updates(actor);

    if (useAdvancedAmmunitionSystem(actor)) {
        const selectedAmmunition = await getSelectedAmmunition(weapon, "switch");
        if (!selectedAmmunition) {
            return;
        }

        const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
        if (chamberLoadedEffect) {
            const chamberAmmunition = getFlag(chamberLoadedEffect, "ammunition");
            if (chamberAmmunition.sourceId === selectedAmmunition.sourceId) {
                showWarning(format("warningAlreadyLoaded", { weapon: weapon.name, ammunition: selectedAmmunition.name }));
                return;
            }
        }

        await setLoadedChamber(actor, weapon, selectedAmmunition, updates);
        await postInteractToChat(
            token.actor,
            SELECT_NEXT_CHAMBER_IMG,
            format("chatMessageSelectChamber", { token: token.name, ammunition: selectedAmmunition.name, weapon: weapon.name }),
            1,
        );
    } else {
        const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
        if (chamberLoadedEffect) {
            showWarning(format("warningAlreadySelected", { weapon: weapon.name }));
            return;
        }

        await addChamberLoaded(actor, weapon, null, updates);
        await postInteractToChat(
            token.actor,
            SELECT_NEXT_CHAMBER_IMG,
            format("chatMessageSelectNextChamber", { token: token.name, weapon: weapon.name }),
            1,
        );
    }

    updates.handleUpdates();
    Hooks.callAll("pf2eRangedCombatNextChamber", actor, token, weapon);
}

export async function setLoadedChamber(actor, weapon, ammo, updates) {
    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (chamberLoadedEffect) {
        // If we're not setting some specific ammunition, then the presence of an effect means
        // we don't need another
        if (!ammo) {
            return;
        }

        // If the ammunition we're selecting is already selected, we don't need a new effect
        const ammunition = getFlag(chamberLoadedEffect, "ammunition");
        if (ammunition.sourceId === ammo.sourceId) {
            return;
        }

        // Remove the existing effect before creating the new one
        updates.delete(chamberLoadedEffect);
    }

    await addChamberLoaded(actor, weapon, ammo, updates);
}

async function addChamberLoaded(actor, weapon, ammo, updates) {
    const chamberLoadedSource = await getItem(CHAMBER_LOADED_EFFECT_ID);
    setEffectTarget(chamberLoadedSource, weapon);

    if (ammo) {
        chamberLoadedSource.flags["pf2e-ranged-combat"] = {
            ...chamberLoadedSource.flags["pf2e-ranged-combat"],
            ammunition: {
                name: ammo.name,
                img: ammo.img,
                id: ammo.id,
                sourceId: ammo.sourceId
            }
        };
        chamberLoadedSource.name = `${chamberLoadedSource.name} (${ammo.name})`;

        if (ammo.sourceId === CONJURED_ROUND_ITEM_ID) {
            chamberLoadedSource.system.duration = {
                expiry: "turn-end",
                sustained: false,
                unit: "rounds",
                value: actor.getActiveTokens().some(token => token.inCombat) ? 0 : 1
            };
        }

        const ammunitionItem = findItemOnActor(actor, ammo.id, ammo.sourceId);
        if (ammunitionItem) {
            applyAmmunitionEffect(weapon, ammunitionItem, updates);
        }
    }

    updates.create(chamberLoadedSource);
}
