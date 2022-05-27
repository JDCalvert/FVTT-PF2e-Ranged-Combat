import { getControlledActorAndToken, getItem, getItemFromActor, Updates } from "../../utils/utils.js";
import { DOUBLE_BARREL_EFFECT_ID } from "../constants.js";

export async function fireBothBarrels() {
    const { actor } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const updates = new Updates(actor);

    const doubleBarrelEffect = getItemFromActor(actor, DOUBLE_BARREL_EFFECT_ID);
    if (doubleBarrelEffect) {
        updates.remove(doubleBarrelEffect);
    } else {
        const doubleBarrelEffecctSource = await getItem(DOUBLE_BARREL_EFFECT_ID);
        updates.add(doubleBarrelEffecctSource);
    }

    updates.handleUpdates();
}

export function isFiringBothBarrels(actor, weapon) {
    return weapon.isDoubleBarrel && getItemFromActor(actor, DOUBLE_BARREL_EFFECT_ID);
}
