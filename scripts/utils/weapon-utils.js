import { ItemSelectDialog } from "./item-select-dialog.js";
import { showWarning } from "./utils.js";

export async function getWeapon(actor, predicate, noResultsMessage, priorityPredicate) {
    return getSingleWeapon(getWeapons(actor, predicate, noResultsMessage), priorityPredicate);
}

export async function getSingleWeapon(weapons, priorityPredicate = () => true) {
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
    const originalItem = weapon.actor.items.get(weapon.id)
    if (!["weapon", "melee"].includes(originalItem?.type)) {
        return null;
    }

    if (weapon.actor.type === "character") {
        return characterWeaponTransform(weapon);
    } else if (["npc", "hazard"].includes(weapon.actor.type)) {
        return npcWeaponTransform(weapon);
    } else {
        return null;
    }
}

function characterWeaponTransform(weapon) {
    return {
        actor: weapon.actor,
        id: weapon.id,
        weaponId: weapon.id,
        sourceId: weapon.sourceId,
        baseType: weapon.baseType,
        name: weapon.name,
        level: weapon.level,
        damageType: weapon.system.damage.damageType,
        img: weapon.img,
        flags: weapon.flags,
        group: weapon.system.group,
        traits: weapon.traits,
        quantity: weapon.quantity,
        propertyRunes: weapon.system.runes.property,
        isRanged: weapon.isRanged,
        usesAmmunition: usesAmmunition(weapon),
        isAmmunitionForWeapon: (ammunition) => ammunition.isAmmoFor(weapon),
        requiresAmmunition: requiresAmmunition(weapon),
        ammunition: getAmmunition(weapon),
        requiresLoading: requiresLoading(weapon),
        reload: getReloadTime(weapon),
        isRepeating: isRepeating(weapon),
        capacity: getCapacity(weapon),
        isDoubleBarrel: isDoubleBarrel(weapon),
        isCapacity: isCapacity(weapon),
        isEquipped: weapon.isEquipped,
        isStowed: weapon.isStowed,
        isCrossbow: weapon.system.traits.otherTags.includes("crossbow")
    };
}

function npcWeaponTransform(melee) {
    const weaponId = melee.flags["pf2e-ranged-combat"]?.weaponId;
    const weapon = weaponId ? melee.actor.items.get(weaponId) : null;
    if (weapon) {
        return {
            actor: weapon.actor,
            id: melee.id,
            weaponId: weapon.id,
            sourceId: weapon.sourceId,
            baseType: weapon.baseType,
            name: weapon.name,
            img: weapon.img,
            flags: weapon.flags,
            group: weapon.system.group,
            traits: weapon.traits,
            quantity: weapon.quantity,
            propertyRunes: weapon.system.runes.property,
            isRanged: melee.system.weaponType.value === "ranged",
            usesAmmunition: usesAmmunition(weapon),
            isAmmunitionForWeapon: (ammunition) => ammunition.isAmmoFor(weapon),
            requiresAmmunition: requiresAmmunition(weapon),
            ammunition: getAmmunition(melee),
            requiresLoading: requiresLoading(weapon),
            reload: getReloadTime(weapon),
            isRepeating: isRepeating(weapon),
            capacity: getCapacity(weapon),
            isDoubleBarrel: isDoubleBarrel(weapon),
            isCapacity: isCapacity(weapon),
            isEquipped: weapon.isEquipped,
            isStowed: weapon.isStowed,
            isCrossbow: weapon.system.traits.otherTags.includes("crossbow")
        };
    } else {
        return {
            actor: melee.actor,
            id: melee.id,
            weaponId: null,
            sourceId: null,
            baseType: null,
            name: melee.name,
            img: melee.img,
            flags: melee.flags,
            group: null,
            traits: melee.traits,
            quantity: 1,
            propertyRunes: [],
            isRanged: melee.system.weaponType.value === "ranged",
            usesAmmunition: usesAmmunition(melee),
            isAmmunitionForWeapon: (ammunition) => isRepeating(melee) === ammunition.uses.max > 1,
            requiresAmmunition: requiresAmmunition(melee),
            ammunition: getAmmunition(melee),
            requiresLoading: requiresLoading(melee),
            reload: getReloadTime(melee),
            isRepeating: isRepeating(melee),
            capacity: getCapacity(melee),
            isDoubleBarrel: isDoubleBarrel(melee),
            isCapacity: isCapacity(melee),
            isEquipped: true,
            isStowed: false,
            isCrossbow: false
        };
    }
}

function getCapacity(weapon) {
    const match = weapon.system.traits.value
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
    return weapon.system.traits.value.some(trait => !!trait.match(/capacity-\d+/));
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
        if (weapon.type === "weapon") {
            return Number(weapon.reload || 0);
        } else {
            const reloadTrait = weapon.system.traits.value.find(trait => trait.startsWith("reload-"));
            if (reloadTrait) {
                const reloadTime = reloadTrait.slice("reload-".length);
                if (reloadTime === "1-min") {
                    return 30;
                } else {
                    return parseInt(reloadTime);
                }
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
        if (weapon.type === "weapon") {
            return weapon.requiresAmmo;
        } else {
            return weapon.system.traits.value.some(trait => trait.startsWith("reload-"));
        }
    } else {
        return false;
    }
}

function requiresAmmunition(weapon) {
    if (weapon.actor.type === "character") {
        return usesAmmunition(weapon);
    } else if (weapon.actor.type === "npc") {
        if (weapon.type === "weapon") {
            return usesAmmunition(weapon);
        } else {
            return false;
        }
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
        const ammoId = weapon.system.selectedAmmoId;
        return ammoId ? weapon.actor.items.get(ammoId) : null;
    } else {
        return;
    }
}
