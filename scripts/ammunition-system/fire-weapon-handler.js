import { findItemOnActor, getEffectFromActor, getFlag, getItem, postInChat, setEffectTarget, useAdvancedAmmunitionSystem } from "../utils/utils.js";
import { isFiringBothBarrels } from "./actions/fire-both-barrels.js";
import { AMMUNITION_EFFECT_ID, CHAMBER_LOADED_EFFECT_ID, CONJURED_ROUND_EFFECT_ID, CONJURE_BULLET_IMG, LOADED_EFFECT_ID, MAGAZINE_LOADED_EFFECT_ID } from "./constants.js";
import { buildLoadedEffectName, clearLoadedChamber, removeAmmunition } from "./utils.js";

export function fireWeapon(actor, weapon, updates) {
    // If the weapon doesn't use ammunition, we don't need to do anything else
    if (!weapon.usesAmmunition) {
        return;
    }

    // If there's an ammunition effect from the previous shot, remove it now
    const ammunitionEffect = getEffectFromActor(actor, AMMUNITION_EFFECT_ID, weapon.id);
    if (ammunitionEffect) {
        updates.remove(ammunitionEffect);
    }

    if (useAdvancedAmmunitionSystem(actor)) {
        if (weapon.isRepeating) {
            fireWeaponRepeating(actor, weapon, updates);
        } else if (weapon.requiresLoading) {
            fireWeaponReloadable(actor, weapon, updates);
        } else {
            fireWeaponAmmunition(actor, weapon, updates);
        }
    } else {
        fireWeaponSimple(actor, weapon, updates);
    }
}

export function fireWeaponSimple(actor, weapon, updates) {
    if (weapon.isCapacity) {
        clearLoadedChamber(actor, weapon, updates);
    }

    let ammunitionToFire = 1;
    if (isFiringBothBarrels(actor, weapon)) {
        ammunitionToFire++;
    }

    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        updates.remove(conjuredRoundEffect);
        postInChat(actor, CONJURE_BULLET_IMG, `${actor.name} fires their conjured round.`);
        ammunitionToFire--;
    }

    if (ammunitionToFire) {
        fireWeaponAmmunition(actor, weapon, updates, ammunitionToFire);
        removeAmmunition(actor, weapon, updates, ammunitionToFire);
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
    removeAmmunition(actor, weapon, updates);

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
    if (weapon.isCapacity) {
        fireWeaponCapacity(actor, weapon, updates);
    }

    let ammunitionToRemove = 1;
    if (isFiringBothBarrels(actor, weapon)) {
        ammunitionToRemove++;
    }

    // If the weapon was loaded with a conjured round, consume that one first
    const conjuredRoundEffect = getEffectFromActor(actor, CONJURED_ROUND_EFFECT_ID, weapon.id);
    if (conjuredRoundEffect) {
        updates.remove(conjuredRoundEffect);
        postInChat(actor, CONJURE_BULLET_IMG, `${actor.name} fires their conjured round.`);
        ammunitionToRemove--;
    }

    if (ammunitionToRemove) {
        removeAmmunition(actor, weapon, updates, ammunitionToRemove);

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
}

function fireWeaponCapacity(actor, weapon, updates) {
    clearLoadedChamber(actor, weapon, updates);

    const chamberLoadedEffect = getEffectFromActor(actor, CHAMBER_LOADED_EFFECT_ID, weapon.id);
    const chamberAmmunitionId = getFlag(chamberLoadedEffect, "ammunition");

    const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
    let loadedAmmunitions = getFlag(loadedEffect, "ammunition");
    
    const loadedAmmunition = loadedAmmunitions.findIndex(ammunition => ammunition.sourceId === chamberAmmunitionId.sourceId);
    if (loadedAmmunition.quantity > 1) {
        loadedAmmunition.quantity--;
    } else {
        loadedAmmunitions = loadedAmmunitions.filter(ammunition => ammunition.id !== loadedAmmunition.id);
    }

    if (loadedAmmunitions.length) {
        // The weapon is still loaded with something, so update
        updates.update(async () => {
            await loadedEffect.update({
                "flags.pf2e-ranged-combat.ammunition": loadedAmmunitions,
                "name": buildLoadedEffectName(loadedEffect)
            });
        });
    } else {
        updates.remove(loadedEffect);
    }
}

function fireWeaponAmmunition(actor, weapon, updates, ammunitionToFire = 1) {
    const ammunition = weapon.ammunition;
    updates.update(() => ammunition.update({ "data.quantity": ammunition.quantity - ammunitionToFire }));

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
