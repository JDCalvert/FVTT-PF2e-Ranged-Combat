import { getItem, setEffectTarget, showWarning, Updates } from "../../utils/utils.js";
import { getWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { DOUBLE_BARREL_EFFECT_ID } from "../constants.js";
import { isFullyLoaded } from "../utils.js";

export async function fireBothBarrels() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const weapon = getWeapon(
        actor,
        weapon => weapon.isDoubleBarrel && weapon.isEquipped,
        `${token.name} is not wielding a double barrel weapon.`,
        weapon => isFullyLoaded(weapon)
    );
    if (!weapon) {
        return;
    }

    if (!isFullyLoaded(weapon)) {
        showWarning(`${weapon.name} is not fully loaded.`);
        return;
    }

    const updates = new Updates(actor);

    const doubleBarrelEffecctSource = await getItem(DOUBLE_BARREL_EFFECT_ID);
    setEffectTarget()
    updates.add(doubleBarrelEffecctSource);
}
