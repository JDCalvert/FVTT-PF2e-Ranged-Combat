import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eConsumable } from "../types/pf2e/consumable.js";
import { PF2eWeapon } from "../types/pf2e/weapon.js";
import { ItemSelectDialog } from "./item-select-dialog.js";
import { getFlag, showWarning } from "./utils.js";

/**
 * Choose a single weapon from the given actor that matches the given conditions.
 *
 * @param {PF2eActor} actor 
 * @param {(weapon: Weapon) => boolean} predicate 
 * @param {string} noResultsMessage 
 * @param {(weapon: Weapon) => boolean} priorityPredicate 
 * @returns {Promise<Weapon | null>}
 */
export async function getWeapon(actor, predicate, noResultsMessage, priorityPredicate) {
    return getSingleWeapon(getWeapons(actor, predicate, noResultsMessage), priorityPredicate);
}

/**
 * 
 * @param {Array<PF2eWeapon>} weapons 
 * @param {(weapon: Weapon) => boolean} priorityPredicate 
 * @returns {Promise<Weapon | null>}
 */
async function getSingleWeapon(weapons, priorityPredicate = () => true) {
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
    /** @type Map<string, Weapon> */
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

/**
 * 
 * @param {PF2eActor} actor 
 * @param {(weapon: Weapon) => boolean} predicate 
 * @param {string} noResultsMessage 
 * @returns {Weapon[]}
 */
export function getWeapons(actor, predicate = () => true, noResultsMessage = null) {
    /** @type Weapon[] */
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

/**
 * @param {PF2eWeapon} weapon 
 * 
 * @returns {Weapon | null}
 */
export function transformWeapon(weapon) {
    const originalItem = weapon.actor.items.get(weapon.id);
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

/**
 * @param {PF2eWeapon} weapon 
 * @returns {Weapon}
 */
export function characterWeaponTransform(weapon) {
    return {
        actor: weapon.actor,
        id: weapon.id,
        slug: weapon.slug,
        weaponId: weapon.id,
        sourceId: weapon.sourceId,
        baseType: weapon.baseType,
        name: weapon.name,
        level: weapon.level,
        damageType: weapon.system.damage.damageType,
        damageDice: weapon.system.damage.dice,
        img: weapon.img,
        hands: weapon.handsHeld,
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
        isFiringBothBarrels: isFiringBothBarrels(weapon),
        isCapacity: isCapacity(weapon),
        isEquipped: weapon.isEquipped,
        isStowed: weapon.isStowed,
    };
}

/**
 * @param {PF2eWeapon} weapon 
 * @returns {Weapon}
 */
function npcWeaponTransform(melee) {
    const weaponId = melee.flags["pf2e-ranged-combat"]?.weaponId;
    const weapon = weaponId ? melee.actor.items.get(weaponId) : null;
    if (weapon) {
        return {
            actor: weapon.actor,
            id: melee.id,
            slug: weapon.slug,
            weaponId: weapon.id,
            sourceId: weapon.sourceId,
            baseType: weapon.baseType,
            name: weapon.name,
            img: weapon.img,
            hands: weapon.handsHeld,
            flags: weapon.flags,
            group: weapon.system.group,
            traits: weapon.traits,
            quantity: weapon.quantity,
            propertyRunes: weapon.system.runes.property,
            isRanged: melee.traits.some(trait => trait.includes("range-increment") || trait.includes("thrown")),
            usesAmmunition: usesAmmunition(weapon),
            isAmmunitionForWeapon: (ammunition) => ammunition.isAmmoFor(weapon),
            requiresAmmunition: requiresAmmunition(weapon),
            ammunition: getAmmunition(melee),
            requiresLoading: requiresLoading(weapon),
            reload: getReloadTime(weapon),
            isRepeating: isRepeating(weapon),
            capacity: getCapacity(weapon),
            isDoubleBarrel: isDoubleBarrel(weapon),
            isFiringBothBarrels: isFiringBothBarrels(weapon),
            isCapacity: isCapacity(weapon),
            isEquipped: weapon.isEquipped,
            isStowed: weapon.isStowed
        };
    } else {
        return {
            actor: melee.actor,
            id: melee.id,
            slug: "",
            weaponId: null,
            sourceId: null,
            baseType: null,
            name: melee.name,
            img: melee.img,
            hands: null,
            flags: melee.flags,
            group: null,
            traits: melee.traits,
            quantity: 1,
            propertyRunes: [],
            isRanged: melee.traits.some(trait => trait.includes("range-increment") || trait.includes("thrown")),
            usesAmmunition: usesAmmunition(melee),
            isAmmunitionForWeapon: (ammunition) => isRepeating(melee) === ammunition.uses.max > 1,
            requiresAmmunition: requiresAmmunition(melee),
            ammunition: getAmmunition(melee),
            requiresLoading: requiresLoading(melee),
            reload: getReloadTime(melee),
            isRepeating: isRepeating(melee),
            capacity: getCapacity(melee),
            isDoubleBarrel: isDoubleBarrel(melee),
            isFiringBothBarrels: false,
            isCapacity: isCapacity(melee),
            isEquipped: true,
            isStowed: false
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

function isFiringBothBarrels(weapon) {
    return weapon.system.traits.toggles.doubleBarrel.selected;
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
 * 
 * @param {PF2eWeapon} weapon 
 */
function usesAmmunition(weapon) {
    const expend = foundry.utils.isNewerVersion(game.system.version, "7.1.1")
        ? weapon => weapon.system.expend
        : weapon => weapon.ammoRequired;

    if (weapon.actor.type === "character") {
        return expend(weapon) > 0;
    } else if (weapon.actor.type === "npc") {
        if (weapon.type === "weapon") {
            return expend(weapon) > 0;
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

/**
 * @param {PF2eWeapon} weapon 
 * @returns {PF2eConsumable | null}
 */
function getAmmunition(weapon) {
    if (!usesAmmunition(weapon)) {
        return null;
    } else if (weapon.actor.type === "character") {
        return weapon.ammo;
    } else if (weapon.actor.type === "npc") {
        const ammoId = getFlag(weapon, "ammunitionId");
        return ammoId ? weapon.actor.items.get(ammoId) : null;
    } else {
        return null;
    }
}
