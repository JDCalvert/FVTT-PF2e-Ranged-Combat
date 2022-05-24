import { getControlledActorAndToken, getEffectFromActor, getItem, postInChat, setEffectTarget, showWarning, Updates } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CHAMBER_LOADED_EFFECT_ID, LOADED_EFFECT_ID, SELECT_NEXT_CHAMBER_IMG } from "../constants.js";

export async function nextChamber() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = await getSingleWeapon(
        getWeapons(actor, weapon => weapon.isCapacity, "You have no weapons with the capacity trait."),
        weapon => {
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
            return loadedEffect && !chamberLoadedEffect;
        }
    );
    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    if (!loadedEffect) {
        showWarning(`${weapon.name} is not loaded!`);
        return;
    }

    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    if (chamberLoadedEffect) {
        showWarning(`${weapon.name} already has a loaded chamber selected!`);
        return;
    }

    await setLoadedChamber(weapon, updates);

    await postInChat(
        token.actor,
        SELECT_NEXT_CHAMBER_IMG,
        `${token.name} selects the next loaded chamber on their ${weapon.name}.`,
        "Interact",
        1,
    );

    updates.handleUpdates();
}

export async function setLoadedChamber(weapon, updates) {
    const chamberLoadedSource = await getItem(CHAMBER_LOADED_EFFECT_ID);
    setEffectTarget(chamberLoadedSource, weapon);
    updates.add(chamberLoadedSource);
}
