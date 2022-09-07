import { handleReload } from "../../feats/crossbow-feats.js";
import { getControlledActorAndToken, getEffectFromActor, getItem, getItemFromActor, postInChat, setEffectTarget, showWarning, Updates } from "../../utils/utils.js";
import { getSingleWeapon, getWeapons } from "../../utils/weapon-utils.js";
import { CONJURED_ROUND_EFFECT_ID, CONJURED_ROUND_ITEM_ID, CONJURE_BULLET_ACTION_ID, CONJURE_BULLET_IMG } from "../constants.js";
import { checkFullyLoaded, isFullyLoaded } from "../utils.js";
import { setLoadedChamber } from "./next-chamber.js";

export async function conjureBullet() {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    const conjureBulletAction = getItemFromActor(actor, CONJURE_BULLET_ACTION_ID);
    if (!conjureBulletAction) {
        showWarning(`${token.name} does not have the Conjure Bullet action.`);
        return;
    }

    const weapon = await getSingleWeapon(
        getWeapons(actor, weapon => weapon.requiresLoading && !weapon.isRepeating, "You have no reloadable weapons."),
        weapon => !isFullyLoaded(actor, weapon)
    );
    if (!weapon) {
        return;
    }

    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        showWarning(`${weapon.name} can only be loaded with one conjured round.`);
        return;
    }

    // We can't conjure a bullet if the weapon is already (fully) loaded
    if (checkFullyLoaded(actor, weapon)) {
        return;
    }

    const updates = new Updates(actor);

    const conjuredRoundSource = await getItem(CONJURED_ROUND_EFFECT_ID);
    setEffectTarget(conjuredRoundSource, weapon);
    updates.add(conjuredRoundSource);

    if (weapon.isCapacity) {
        await setLoadedChamber(
            actor,
            weapon,
            {
                name: conjuredRoundSource.name,
                img: CONJURE_BULLET_IMG,
                id: CONJURED_ROUND_ITEM_ID,
                sourceId: CONJURED_ROUND_ITEM_ID
            },
            updates
        );
    }

    // If we're not in combat, set the duration to one round so it doesn't expire immediately
    if (!token.inCombat) {
        conjuredRoundSource.system.duration.value = 1;
    }

    await postInChat(
        token.actor,
        CONJURE_BULLET_IMG,
        `${token.name} uses Conjure Bullet to load their ${weapon.name}.`,
        "Conjure Bullet",
        1,
    );

    await handleReload(weapon, updates);

    updates.handleUpdates();
}
