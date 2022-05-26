import { clearLoadedChamber, removeAmmunition } from "./utils.js";
import {
    AMMUNITION_EFFECT_ID,
    CONJURED_ROUND_EFFECT_ID,
    CONJURE_BULLET_IMG,
    LOADED_EFFECT_ID,
    MAGAZINE_LOADED_EFFECT_ID
} from "./constants.js";
import { findItemOnActor, getEffectFromActor, getFlag, getItem, postInChat, setEffectTarget, useAdvancedAmmunitionSystem } from "../utils/utils.js";

export function fireWeapon(actor, weapon, updates) {
    // If there's an ammunition effect from the previous shot, remove it now
    const ammunitionEffect = getEffectFromActor(actor, AMMUNITION_EFFECT_ID, weapon.id);
    if (ammunitionEffect) {
        updates.remove(ammunitionEffect);
    }

    consumeLoadedRound(actor, weapon, updates);

    // If the advanced ammunition system is not enabled, consume a piece of ammunition
    if (useAdvancedAmmunitionSystem(actor)) {
        fireWeaponAdvanced(actor, weapon, updates);
    } else {
        const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
        if (conjuredRoundEffect) {
            postInChat(actor, CONJURE_BULLET_IMG, `${actor.name} fires their conjured round.`);
        } else {
            updates.update(() => weapon.ammunition?.consume());
            postInChat(actor, ammunition.img, `${actor.name} uses ${ammunition.name}.`);
        }
    }
}

export function consumeLoadedRound(actor, weapon, updates) {
    // If the weapon doesn't require loading (e.g. the melee usage of a combination weapon) then
    // we don't need to do anything
    if (!weapon.requiresLoading) {
        return;
    }

    // If the weapon was loaded with a conjured round, consume that one first
    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        updates.remove(conjuredRoundEffect);
    } else {
        removeAmmunition(actor, weapon, updates);
    }

    clearLoadedChamber(actor, weapon, updates);
}

export function fireWeaponAdvanced(actor, weapon, updates) {
    // Use up a round of the loaded magazine
    if (weapon.isRepeating) {
        fireWeaponRepeating(actor, weapon, updates);
    } else if (weapon.requiresLoading) {
        fireWeaponReloadable(actor, weapon, updates);
    } else if (weapon.usesAmmunition) {
        fireWeaponAmmunition(actor, weapon, updates);
    }
}

function fireWeaponRepeating(actor, weapon, updates) {
    const magazineLoadedEffect = getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
    const magazineCapacity = getFlag(magazineLoadedEffect, "capacity");
    const magazineRemaining = getFlag(magazineLoadedEffect, "remaining") - 1;

    const magazineLoadedEffectName = getFlag(magazineLoadedEffect, "name");
    updates.update(async () => {
        await magazineLoadedEffect.update({
            "name": `${magazineLoadedEffectName} (${magazineRemaining}/${magazineCapacity})`,
            "flags.pf2e-ranged-combat.remaining": magazineRemaining
        });
    });
    updates.floatyText(`${getFlag(magazineLoadedEffect, "ammunitionName")} ${magazineRemaining}/${magazineCapacity}`, false);

    // Post in chat saying some ammunition was used
    const ammunitionItemId = getFlag(magazineLoadedEffect, "ammunitionItemId");
    const ammunitionSourceId = getFlag(magazineLoadedEffect, "ammunitionSourceId");
    const ammunition = findItemOnActor(actor, ammunitionItemId, ammunitionSourceId);

    if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition") && ammunition) {
        ammunition.toMessage();
    } else {
        postInChat(
            actor,
            getFlag(magazineLoadedEffect, "ammunitionImg"),
            `${actor.name} uses ${getFlag(magazineLoadedEffect, "ammunitionName")} (${magazineRemaining}/${magazineCapacity} remaining).`
        );
    }

    createAmmunitionEffect(weapon, ammunition, updates);
}

function fireWeaponReloadable(actor, weapon, updates) {
    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        postInChat(actor, CONJURE_BULLET_IMG, `${actor.name} fires their conjured round.`);
        return;
    }

    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    const ammunitionItemId = getFlag(loadedEffect, "ammunitionItemId");
    const ammunitionSourceId = getFlag(loadedEffect, "ammunitionSourceId");
    const ammunition = findItemOnActor(actor, ammunitionItemId, ammunitionSourceId);

    if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition") && ammunition) {
        ammunition.toMessage();
    } else {
        postInChat(
            actor,
            getFlag(loadedEffect, "ammunitionImg"),
            `${actor.name} uses ${getFlag(loadedEffect, "ammunitionName")}.`
        );
    }

    createAmmunitionEffect(weapon, ammunition, updates);
}

function fireWeaponAmmunition(actor, weapon, updates) {
    const ammunition = weapon.ammunition;
    updates.update(() => ammunition.update({ "data.quantity": ammunition.quantity - 1 }));

    if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition")) {
        ammunition.toMessage();
    } else {
        postInChat(actor, ammunition.img, `${actor.name} uses ${ammunition.name}.`);
    }

    createAmmunitionEffect(weapon, ammunition, updates);
}

function createAmmunitionEffect(weapon, ammunition, updates) {
    if (ammunition?.rules.length) {
        updates.update(async () => {
            const ammunitionEffectSource = await getItem(AMMUNITION_EFFECT_ID);
            setEffectTarget(ammunitionEffectSource, weapon);
            ammunitionEffectSource.name = `${ammunition.name} (${weapon.name})`;
            ammunitionEffectSource.data.rules = ammunition.data.data.rules;
            ammunitionEffectSource.img = ammunition.img;
            ammunitionEffectSource.data.description.value = ammunition.description;
            updates.add(ammunitionEffectSource);
        });
    }
}
