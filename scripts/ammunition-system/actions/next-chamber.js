import { getControlledActorAndToken, getEffectFromActor, getFlag, getItem, postInChat, setEffectTarget, showWarning, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_ITEM_ID, SELECT_NEXT_CHAMBER_IMG } from "../constants.js";
import { getSelectedAmmunition, isLoaded } from "../utils.js";

export async function nextChamber() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getSingleWeapon(
        getWeapons(actor, weapon => weapon.isCapacity, "You have no weapons with the capacity trait."),
        weapon => isLoaded(actor, weapon) && !getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id)
    );
    if (!weapon) {
        return;
    }

    if (!isLoaded(actor, weapon)) {
        showWarning(`${weapon.name} is not loaded!`);
        return;
    }

    const updates = new Updates(actor);

    if (useAdvancedAmmunitionSystem(actor)) {
        const selectedAmmunition = await getSelectedAmmunition(actor, weapon);
        if (!selectedAmmunition) {
            return;
        }

        const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
        if (chamberLoadedEffect) {
            const chamberAmmunition = getFlag(chamberLoadedEffect, "ammunition");
            if (chamberAmmunition.sourceId === selectedAmmunition.sourceId) {
                showWarning(`${weapon.name} already has a chamber loaded with ${selectedAmmunition.name} selected!`);
                return;
            }
        }

        await setLoadedChamber(actor, weapon, selectedAmmunition, updates);
        await postInChat(
            token.actor,
            SELECT_NEXT_CHAMBER_IMG,
            `${token.name} selects a chamber loaded with ${selectedAmmunition.name} on their ${weapon.name}.`,
            "Interact",
            1,
        );
    } else {
        const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
        if (chamberLoadedEffect) {
            showWarning(`${weapon.name} already has a loaded chamber selected!`);
            return;
        }

        await addChamberLoaded(actor, weapon, null, updates);
        await postInChat(
            token.actor,
            SELECT_NEXT_CHAMBER_IMG,
            `${token.name} selects the next loaded chamber on their ${weapon.name}.`,
            "Interact",
            1,
        );
    }

    updates.handleUpdates();
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
        updates.remove(chamberLoadedEffect);
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
            chamberLoadedSource.data.duration = {
                expiry: "turn-end",
                sustained: false,
                unit: "rounds",
                value: actor.getActiveTokens().some(token => token.inCombat) ? 0 : 1
            }
        }
    }

    updates.add(chamberLoadedSource);
}
