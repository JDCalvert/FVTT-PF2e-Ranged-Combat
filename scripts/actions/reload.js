import * as Utils from "../utils.js";

export async function reload() {
    const crossbowFeats = [
        {
            featId: Utils.CROSSBOW_ACE_FEAT_ID,
            effectId: Utils.CROSSBOW_ACE_EFFECT_ID
        },
        {
            featId: Utils.CROSSBOW_CRACK_SHOT_FEAT_ID,
            effectId: Utils.CROSSBOW_CRACK_SHOT_EFFECT_ID
        }
    ];

    const effectsToAdd = [];

    const myToken = Utils.getControlledToken();
    const myActor = myToken?.actor;
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.")
        return;
    }

    let weapon = await Utils.getSingleWeapon(getReloadableWeapons(myActor));
    if (!weapon) {
        return;
    }

    // Check if this weapon is already loaded
    const myLoadedEffect = Utils.getEffectFromActor(myActor, Utils.LOADED_EFFECT_ID, weapon.id);
    if (myLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is already loaded.`);
        return;
    }

    // Get the "Loaded" effect and set its target to the weapon we're reloading
    const loadedEffect = await Utils.getItem(Utils.LOADED_EFFECT_ID);
    Utils.setEffectTarget(loadedEffect, weapon);
    effectsToAdd.push(loadedEffect);

    // Advanced Ammunition System: consume the ammunition on reload
    if (game.settings.get("pf2e-ranged-combat", "advancedAmmunitionSystem")) {
        // Consume the assigned ammunition
        const ammo = weapon.value.ammo;
        if (!ammo) {
            ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
            return;
        } else if (ammo.quantity < 1) {
            ui.notifications.warn(`Not enough ammunition to reload ${weapon.name}`);
            return;
        }

        // Track the ammunition ID and source on the loaded effect - if we unload the weapon later we'll want to
        // use a different 
        loadedEffect.flags["pf2e-ranged-combat"].ammoId = ammo.id;
        loadedEffect.flags["pf2e-ranged-combat"].ammoSourceId = ammo.getFlag("core", "sourceId");

        // Consume the ammunition
        ammo.consume();
    }

    // Find out which reload action to use and post it to chat
    const reloadActions = weapon.reload;
    const reloadActionId = (() => {
        switch (reloadActions) {
            case 1:
                return Utils.RELOAD_ACTION_ONE_ID;
            case 2:
                return Utils.RELOAD_ACTION_TWO_ID;
            case 3:
                return Utils.RELOAD_ACTION_THREE_ID;
            default:
                return Utils.RELOAD_ACTION_EXPLORE_ID;
        }
    })();

    const myReloadAction = await Utils.getItemFromActor(myActor, reloadActionId, true);
    await Utils.postActionInChat(myActor, reloadActionId);
    await Utils.postInChat(
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

            if (Utils.actorHasItem(myActor, featId)) {
                // Remove any existing effects
                const existing = Utils.getEffectFromActor(myActor, effectId, weapon.id);
                if (existing) await existing.delete();

                // Add the new effect
                const effect = await Utils.getItem(effectId);
                Utils.setEffectTarget(effect, weapon);

                effectsToAdd.push(effect);
            }
        }
    }

    await myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
};

export async function reloadMagazine() {
    const myToken = Utils.getControlledToken();
    const myActor = myToken?.actor || game.user.character;
    if (!myToken || !myActor) {
        ui.notifications.warn("You must have exactly one token selected or an assigned character.");
    }

    let weapon = await Utils.getSingleWeapon(getRepeatingWeapons(myActor));
    if (!weapon) {
        return;
    }

    // Find if the weapon is already loaded with a magazine. If it is, and there's some ammo left in it,
    // we'll put it back in our inventory
    const myMagazineLoadedEffect = Utils.getEffectFromActor(myActor, Utils.LOADED_EFFECT_ID, weapon.id);
    

    const myLoadedEffect = Utils.getEffectFromActor(myActor, Utils.LOADED_EFFECT_ID, weapon.id);
    if (myLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is already loaded.`);
        return;
    }

    // Advanced Ammunition System: consume the ammunition on reload
    if (game.settings.get("pf2e-ranged-combat", "advancedAmmunitionSystem")) {
        // Consume the assigned ammunition
        const ammo = weapon.value.ammo;
        if (!ammo) {
            ui.notifications.warn(`${weapon.name} has no ammunition selected.`);
            return;
        } else if (ammo.quantity < 1) {
            ui.notifications.warn(`Not enough ammunition to reload ${weapon.name}`);
            return;
        }

        // Track the ammunition ID and source on the loaded effect - if we unload the weapon later we'll want to
        // use a different 
        loadedEffect.flags["pf2e-ranged-combat"].ammoId = ammo.id;
        loadedEffect.flags["pf2e-ranged-combat"].ammoSourceId = ammo.getFlag("core", "sourceId");

        // Consume the ammunition
        ammo.consume();
    }
}

export async function reloadAll() {
    const myToken = Utils.getControlledToken();
    const myActor = myToken?.actor;
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token.");
        return;
    }

    let weapons = getReloadableWeapons(myActor);
    if (!weapons.length) {
        return;
    }

    weapons = weapons.filter(weapon =>
        !Utils.getEffectFromActor(myActor, Utils.LOADED_EFFECT_ID, weapon.id)
    );
    if (!weapons.length) {
        ui.notifications.info("All your weapons are already loaded.");
        return;
    }

    const effectsToAdd = [];

    const promises = weapons.map(async weapon => {
        const loadedEffect = await Utils.getItem(Utils.LOADED_EFFECT_ID);
        Utils.setEffectTarget(loadedEffect, weapon);
        effectsToAdd.push(loadedEffect);
    });

    const loadedEffect = await fromUuid(Utils.LOADED_EFFECT_ID);
    Utils.postInChat(myActor, "Reload", "", loadedEffect.img, `${myToken.name} reloads their weapons.`);

    await Promise.all(promises);
    myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getReloadableWeapons(actor) {
    let weapons;

    if (actor.type === "character") {
        weapons = actor.itemTypes.weapon
            .filter(weapon => Utils.requiresLoading(weapon))
            .map(characterWeaponTransform);
    } else if (actor.type === "npc") {
        weapons = actor.itemTypes.melee
            .filter(weapon => Utils.requiresLoading(weapon))
            .map(npcWeaponTransform);
    } else {
        weapons = [];
    }

    if (!weapons.length) {
        ui.notifications.warn("You have no reloadable weapons.");
    }
    return weapons;
}

function getRepeatingWeapons(actor) {
    let weapons;

    if (actor.type === "character") {
        weapons = actor.itemTypes.weapon
            .filter(weapon => weapon.traits.includes("repeating"))
            .map(characterWeaponTransform);
    } else if (actor.type === "npc") {
        weapons = actor.itemTypes.melee
            .filter(weapon => weapon.traits.includes("repeating"))
            .map(npcWeaponTransform);
    } else {
        weapons = [];
    }

    if (!weapons.length) {
        ui.notifications.warn("You have no repeating weapons.");
    }
    return weapons;
}

function characterWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.data._id,
        name: weapon.data.name,
        img: weapon.data.img,
        reload: Utils.getReloadTime(weapon),
        isEquipped: weapon.data.data.equipped.value,
        isCrossbow: weapon.data.data.traits.otherTags.includes("crossbow")
    }
}

function npcWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.data._id,
        name: weapon.data.name,
        img: weapon.data.img,
        reload: Utils.getReloadTime(weapon),
        isEquipped: true,
        isCrossbow: false
    }
}