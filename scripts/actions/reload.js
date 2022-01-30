import { PF2eRangedCombat } from "../utils.js";

export async function reload() {
    const crossbowFeats = [
        {
            featId: PF2eRangedCombat.CROSSBOW_ACE_FEAT_ID,
            effectId: PF2eRangedCombat.CROSSBOW_ACE_EFFECT_ID
        },
        {
            featId: PF2eRangedCombat.CROSSBOW_CRACK_SHOT_FEAT_ID,
            effectId: PF2eRangedCombat.CROSSBOW_CRACK_SHOT_EFFECT_ID
        }
    ];

    const effectsToAdd = [];

    const myToken = PF2eRangedCombat.getControlledToken();
    const myActor = myToken?.actor;
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.")
        return;
    }

    let weapon = await PF2eRangedCombat.getSingleWeapon(getReloadableWeapons(myActor));
    if (!weapon) {
        return;
    }

    // Check if this weapon is already loaded
    const myLoadedEffect = PF2eRangedCombat.getEffectFromActor(myActor, PF2eRangedCombat.LOADED_EFFECT_ID, weapon.id);
    if (myLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is already loaded.`);
        return;
    }

    // Get the "Loaded" effect and set its target to the weapon we're reloading
    const loadedEffect = await PF2eRangedCombat.getItem(PF2eRangedCombat.LOADED_EFFECT_ID);
    PF2eRangedCombat.setEffectTarget(loadedEffect, weapon);
    effectsToAdd.push(loadedEffect);

    // Find out which reload action to use and post it to chat
    const reloadActions = weapon.reload;
    const reloadActionId = (() => {
        switch (reloadActions) {
            case 1:
                return PF2eRangedCombat.RELOAD_ACTION_ONE_ID;
            case 2:
                return PF2eRangedCombat.RELOAD_ACTION_TWO_ID;
            case 3:
                return PF2eRangedCombat.RELOAD_ACTION_THREE_ID;
            default:
                return PF2eRangedCombat.RELOAD_ACTION_EXPLORE_ID;
        }
    })();

    const myReloadAction = await PF2eRangedCombat.getItemFromActor(myActor, reloadActionId, true);
    await PF2eRangedCombat.postActionInChat(myActor, reloadActionId);
    await PF2eRangedCombat.postInChat(
        myActor,
        myReloadAction.name,
        reloadActions <= 3 ? String(reloadActions) : "",
        loadedEffect.img,
        `${myToken.name} reloads their ${weapon.name}.`
    );

    // Handle crossbow effects that trigger on reload
    if (weapon.isCrossbow && weapon.isEquipped) {
        for (const crossbowFeat of crossbowFeats) {
            const featId = crossbowFeat.featId;
            const effectId = crossbowFeat.effectId;

            if (PF2eRangedCombat.actorHasItem(myActor, featId)) {
                // Remove any existing effects
                const existing = PF2eRangedCombat.getEffectFromActor(myActor, effectId, weapon.id);
                if (existing) await existing.delete();

                // Add the new effect
                const effect = await PF2eRangedCombat.getItem(effectId);
                PF2eRangedCombat.setEffectTarget(effect, weapon);

                effectsToAdd.push(effect);
            }
        }
    }

    await myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
};

export async function reloadAll() {
    const myToken = PF2eRangedCombat.getControlledToken();
    const myActor = myToken?.actor;
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.");
        return;
    }

    const weapons = getReloadableWeapons(myActor);
    if (!weapons.length) {
        return;
    }

    weapons = weapons.filter(weapon =>
        !PF2eRangedCombat.getEffectFromActor(myActor, PF2eRangedCombat.LOADED_EFFECT_ID, weapon.id)
    );
    if (!weapons.length) {
        ui.notifications.info("All your weapons are already loaded.");
        return;
    }

    const effectsToAdd = [];

    const promises = weapons.map(async weapon => {
        const loadedEffect = await PF2eRangedCombat.getItem(PF2eRangedCombat.LOADED_EFFECT_ID);
        PF2eRangedCombat.setEffectTarget(loadedEffect, weapon);
        effectsToAdd.push(loadedEffect);
    });

    const loadedEffect = await fromUuid(PF2eRangedCombat.LOADED_EFFECT_ID);
    PF2eRangedCombat.postInChat(myActor, "Reload", "", loadedEffect.img, `${myToken.name} reloads their weapons.`);

    await Promise.all(promises);
    myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getReloadableWeapons(actor) {
    let weapons;

    if (actor.type === "character") {
        weapons = actor.itemTypes.weapon
            .filter(weapon => PF2eRangedCombat.requiresLoading(weapon))
            .map(weapon => {
                return {
                    id: weapon.data._id,
                    name: weapon.data.name,
                    img: weapon.data.img,
                    damageDie: weapon.data.data.damage.die,
                    reload: PF2eRangedCombat.getReloadTime(weapon),
                    isEquipped: weapon.data.data.equipped.value,
                    isCrossbow: weapon.data.data.traits.otherTags.includes("crossbow")
                }
            });
    } else if (actor.type === "npc") {
        weapons = actor.itemTypes.melee
            .filter(weapon => PF2eRangedCombat.requiredLoading(weapon))
            .map(weapon => {
                return {
                    id: weapon.data._id,
                    name: weapon.data.name,
                    img: weapon.data.img,
                    reload: PF2eRangedCombat.getReloadTime(weapon),
                    isEquipped: true,
                    isCrossbow: false
                }
            });
    } else {
        weapons = [];
    }

    if (!weapons.length) {
        ui.notifications.warn("You have no reloadable weapons.");
    }
    return weapons;
}
