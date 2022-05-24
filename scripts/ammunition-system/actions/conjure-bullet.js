import { getControlledActorAndToken, getItem, getItemFromActor, postInChat, setEffectTarget, Updates } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CONJURED_ROUND_EFFECT_ID, CONJURE_BULLET_ACTION_ID, CONJURE_BULLET_IMG } from "../constants.js";
import { isFullyLoaded } from "../utils.js";

export async function conjureBullet() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const conjureBulletAction = getItemFromActor(actor, CONJURE_BULLET_ACTION_ID);
    if (!conjureBulletAction) {
        ui.notifications.warn(`${token.name} does not have the Conjure Bullet action.`);
        return;
    }

    const weapon = await getSingleWeapon(
        getWeapons(actor, weapon => weapon.requiresLoading && !weapon.isRepeating, "You have no reloadable weapons."),
        weapon => !isFullyLoaded(actor, weapon)
    );
    if (!weapon) {
        return;
    }

    // We can't conjure a bullet if the weapon is already (fully) loaded
    const weaponFullyLoaded = isFullyLoaded(actor, weapon);
    if (weaponFullyLoaded) {
        if (weapon.capacity) {
            ui.notifications.warn(`${weapon.name} is already fully loaded.`);
        } else {
            ui.notifications.warn(`${weapon.name} is already loaded.`);
        }
        return;
    }

    const updates = new Updates(actor);

    const conjuredRoundSource = await getItem(CONJURED_ROUND_EFFECT_ID);
    setEffectTarget(conjuredRoundSource, weapon);
    updates.add(conjuredRoundSource);

    // If we're not in combat, set the duration to one round so it doesn't expire immediately
    if (!token.inCombat) {
        conjuredRoundSource.data.duration.value = 1;
    }

    await postInChat(
        token.actor,
        CONJURE_BULLET_IMG,
        `${token.name} uses Conjure Bullet to load their ${weapon.name}.`,
        "Conjure Bullet",
        1,
    );

    updates.handleUpdates();
}
