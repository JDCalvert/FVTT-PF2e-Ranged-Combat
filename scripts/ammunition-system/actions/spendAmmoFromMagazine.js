import { getControlledActorAndToken, getEffectFromActor, getFlag, postInChat, showWarning, Updates, useAdvancedAmmunitionSystem } from "../../utils/utils.js";
import { getWeapon } from "../../utils/weapon-utils.js";
import { MAGAZINE_LOADED_EFFECT_ID } from "../constants.js";
import { isLoaded } from "../utils.js";

const localize = (key) => game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.spendAmmoFromMagazine." + key)
const format = (key, data) => game.i18n.format("pf2e-ranged-combat.ammunitionSystem.actions.spendAmmoFromMagazine." + key, data)

export async function spendAmmoFromMagazine(amount = 1) {
    const { actor, token } = getControlledActorAndToken();
    if (!actor) {
        return;
    }

    if (!useAdvancedAmmunitionSystem(actor)) {
        if (actor.type === "character") {
            showWarning(localize("warningAdvancedAmmunitionNeeded"));
            return;
        } else if (actor.type === "npc") {
            showWarning(localize("warningNpcNotSupported"));
            return;
        }
    }

    const weapon = await getWeapon(
        actor,
        (weapon) => weapon.isRepeating,
        localize("warningNoRepeatingWeapons"),
        (weapon) => getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id)
    );

    if (!weapon) {
        return;
    }

    const updates = new Updates(actor);

    const magazineLoadedEffect = getEffectFromActor(
        actor,
        MAGAZINE_LOADED_EFFECT_ID,
        weapon.id
    );


    if (!magazineLoadedEffect) {
        showWarning(format("warningNotLoaded", { weapon: weapon.name }));
        return;
    }

    const ammunitionRemaining = getFlag(magazineLoadedEffect, "remaining");
    if (ammunitionRemaining < amount) {
        showWarning(format("warningNotEnoughAmmo", { weapon: weapon.name }));
        return;
    }

    const ammunitionCapacity = getFlag(magazineLoadedEffect, "capacity");
    updates.update(magazineLoadedEffect, {
        name: `${getFlag(magazineLoadedEffect, "name")} (${ammunitionRemaining - amount
            }/${ammunitionCapacity})`,
        "flags.pf2e-ranged-combat.remaining": ammunitionRemaining - amount,
    });

    postInChat(
        actor,
        magazineLoadedEffect.img,
        format("tokenSpendAmmunitionFromMagazine", {
            token: token.name,
            amount,
            weapon: weapon.name,
        }),
    );

    updates.handleUpdates();
    Hooks.callAll("pf2eRangedCombatUnload", actor, token, weapon);
}

function getLoadedWeapon(actor) {
    return getWeapon(
        actor,
        weapon => {
            if (useAdvancedAmmunitionSystem(actor) && weapon.isRepeating) {
                return getEffectFromActor(actor, MAGAZINE_LOADED_EFFECT_ID, weapon.id);
            } else if (weapon.requiresLoading) {
                return isLoaded(actor, weapon);
            }
            return false;
        },
        localize("noLoadedWeapons")
    );
}