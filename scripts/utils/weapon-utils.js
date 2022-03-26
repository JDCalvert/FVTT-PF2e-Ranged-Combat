import { ItemSelectDialog } from "./item-select-dialog.js";

export async function getWeapon(actor, predicate = () => true, noResultsMessage) {
    return getSingleWeapon(getWeapons(actor, predicate, noResultsMessage));
}

export async function getSingleWeapon(weapons) {
    if (!weapons.length) {
        return;
    } else if (weapons.length === 1) {
        return weapons[0];
    } else {
        return ItemSelectDialog.getItem("Weapon Select", "Select a Weapon", weapons);
    }
}

export function getWeapons(actor, predicate = () => true, noResultsMessage = null) {
    let weapons;
    if (actor.type === "character") {
        weapons = actor.itemTypes.weapon
            .map(characterWeaponTransform)
            .filter(predicate);
    } else if (actor.type === "npc") {
        weapons = actor.itemTypes.melee
            .map(npcWeaponTransform)
            .filter(predicate);
    } else {
        weapons = [];
    }

    if (!weapons.length && noResultsMessage) {
        ui.notifications.warn(noResultsMessage);
    }
    return weapons;
}

export function transformWeapon(weapon) {
    if (weapon.actor.type === "character") {
        return characterWeaponTransform(weapon);
    } else if (weapon.actor.type === "npc") {
        return npcWeaponTransform(weapon);
    } else {
        return null;
    }
}

function characterWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.id,
        name: weapon.name,
        img: weapon.img,
        usesAmmunition: usesAmmunition(weapon),
        ammunition: getAmmunition(weapon),
        requiresLoading: requiresLoading(weapon),
        reload: getReloadTime(weapon),
        isRepeating: isRepeating(weapon),
        isEquipped: weapon.isEquipped,
        isCrossbow: weapon.data.data.traits.otherTags.includes("crossbow")
    };
}

function npcWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.id,
        name: weapon.name,
        img: weapon.img,
        usesAmmunition: usesAmmunition(weapon),
        ammunition: getAmmunition(weapon),
        requiresLoading: requiresLoading(weapon),
        reload: getReloadTime(weapon),
        isRepeating: isRepeating(weapon),
        isEquipped: true,
        isCrossbow: false
    };
}

/**
 * Check if a weapon is repeating
 * @param {WeaponPF2e | MeleePF2e} weapon
 * @returns true if the weapon is a repeating weapon
 */
function isRepeating(weapon) {
    return weapon.traits.has("repeating");
}

/**
 * Find out if a weapon requires loading (e.g. has a reload time of greater than 0)
 * 
 * @param {WeaponPF2e | MeleePF2e} weapon
 * @returns true if the weapon has a non-zero reload time
 */
function requiresLoading(weapon) {
    return getReloadTime(weapon) > 0;
}

/**
 * Find the reload time of a weapon
 * @param {WeaponPF2e | MeleePF2e} weapon
 * @returns the reload time of the weapon, or 0 if it doesn't have one
 */
function getReloadTime(weapon) {
    if (weapon.actor.type === "character") {
        return Number(weapon.reload || 0);
    } else if (weapon.actor.type === "npc") {
        const reloadTrait = weapon.data.data.traits.value.find(trait => trait.startsWith("reload-"));
        if (reloadTrait) {
            const reloadTime = reloadTrait.slice("reload-".length);
            if (reloadTime === "1-min") {
                return 30;
            } else {
                return parseInt(reloadTime);
            }
        }
    }

    return 0;
}

/**
 * Find out if the weapon uses ammunition
 */
function usesAmmunition(weapon) {
    if (weapon.actor.type === "character") {
        return weapon.baseType === "blowgun" || ["firearm", "bow", "sling"].includes(weapon.group);
    } else if (weapon.actor.type === "npc") {
        return false; // TODO work this out
    } else {
        return false;
    }
}

function getAmmunition(weapon) {
    if (!usesAmmunition(weapon)) {
        return;
    } else if (weapon.actor.type === "character") {
        return weapon.ammo;
    } else if (weapon.actor.type === "npc") {
        return;
    } else {
        return;
    }
}
