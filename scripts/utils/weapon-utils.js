import { ItemSelectDialog } from "./item-select-dialog.js";
import { showWarning } from "./utils.js";

export async function getWeapon(actor, predicate, noResultsMessage, priorityPredicate) {
    return getSingleWeapon(getWeapons(actor, predicate, noResultsMessage), priorityPredicate);
}

export async function getSingleWeapon(weapons, priorityPredicate = () => false) {
    // If there are no weapons, then return nothing
    if (!weapons.length) {
        return;
    }

    // If there is only one weapon, we can return it
    if (weapons.length === 1) {
        return weapons[0];
    }

    // If the actor has equipped exactly one weapon with priority, we can return it
    const priorityWeapons = weapons
        .filter(weapon => weapon.isEquipped)
        .filter(priorityPredicate);
    if (priorityWeapons.length === 1) {
        return priorityWeapons[0];
    }

    // We need to choose a weapon
    const weaponsByEquipped = new Map();
    const equippedWeapons = weapons.filter(weapon => weapon.isEquipped);
    if (equippedWeapons.length) {
        weaponsByEquipped.set("Equipped", equippedWeapons);
    }
    const unequippedWeapons = weapons.filter(weapon => !weapon.isEquipped);
    if (unequippedWeapons.length) {
        weaponsByEquipped.set("Unequipped", unequippedWeapons);
    }

    return ItemSelectDialog.getItem("Weapon Select", "Select a Weapon", weaponsByEquipped);
}

export function getWeapons(actor, predicate = () => true, noResultsMessage = null) {
    let weapons;
    if (actor.type === "character") {
        weapons = actor.itemTypes.weapon
            .map(characterWeaponTransform)
            .filter(weapon => !weapon.isStowed)
            .filter(predicate);
    } else if (actor.type === "npc") {
        weapons = actor.itemTypes.melee
            .map(npcWeaponTransform)
            .filter(predicate);
    } else {
        weapons = [];
    }

    if (!weapons.length && noResultsMessage) {
        showWarning(noResultsMessage);
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
        sourceId: weapon.sourceId,
        baseType: weapon.baseType,
        name: weapon.name,
        img: weapon.img,
        traits: weapon.traits,
        quantity: weapon.quantity,
        usesAmmunition: usesAmmunition(weapon),
        ammunition: getAmmunition(weapon),
        requiresLoading: requiresLoading(weapon),
        reload: getReloadTime(weapon),
        isRepeating: isRepeating(weapon),
        capacity: getCapacity(weapon),
        isDoubleBarrel: isDoubleBarrel(weapon),
        isCapacity: isCapacity(weapon),
        isEquipped: weapon.isEquipped,
        isStowed: weapon.isStowed,
        isCrossbow: weapon.data.data.traits.otherTags.includes("crossbow")
    };
}

function npcWeaponTransform(weapon) {
    return {
        value: weapon,
        id: weapon.id,
        sourceId: null,
        baseType: null,
        name: weapon.name,
        img: weapon.img,
        traits: weapon.traits,
        quantity: weapon.quantity,
        usesAmmunition: usesAmmunition(weapon),
        ammunition: getAmmunition(weapon),
        requiresLoading: requiresLoading(weapon),
        reload: getReloadTime(weapon),
        isRepeating: isRepeating(weapon),
        capacity: getCapacity(weapon),
        isDoubleBarrel: isDoubleBarrel(weapon),
        isCapacity: isCapacity(weapon),
        isEquipped: true,
        isStowed: false,
        isCrossbow: false
    };
}

function getCapacity(weapon) {
    const match = weapon.data.data.traits.value
        .map(trait => trait.match(/capacity-(\d+)/))
        .find(match => !!match);

    return match
        ? Number(match[1])
        : isDoubleBarrel(weapon)
            ? 2
            : null;
}

function isDoubleBarrel(weapon) {
    return weapon.traits.has("double-barrel");
}

function isCapacity(weapon) {
    return weapon.data.data.traits.value.some(trait => !!trait.match(/capacity-\d+/));
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
        return weapon.requiresAmmo;
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
