import { Section } from "../../lib/lib-item-select-dialog-types/types.js";
import { PF2eActor } from "../types/pf2e/actor.js";
import { PF2eConsumable } from "../types/pf2e/consumable.js";
import { PF2eWeapon } from "../types/pf2e/weapon.js";
import * as ItemSelect from "../utils/item-select-dialog.js";
import { Updates } from "../utils/updates.js";
import { getEffectFromActor, getItem, postInteractToChat, postToChat, setEffectTarget, showWarning } from "../utils/utils.js";
import { LOADED_EFFECT_ID } from "./constants.js";

const localize = key => game.i18n.localize(`pf2e-ranged-combat.ammunitionSystem.${key}`);
const format = (key, params) => game.i18n.format(`pf2e-ranged-combat.ammunitionSystem.${key}`, params);

class Item {
    /** @type string */
    id;

    /** @type string */
    sourceId;

    /** @type string */
    name;

    /** @type string */
    img;
}

class Weapon extends Item {
    /** @type {boolean} */
    isEquipped;

    /** @type {boolean} */
    isStowed;

    /** @type {number} */
    capacity;

    /** @type {number} */
    remainingCapacity;

    /** @type {Ammunition[]} */
    loadedAmmunition;

    /** @type {number} */
    numLoadedRounds;

    /** @type {boolean} */
    isReadyToFire;

    /** @type {boolean} */
    isRepeating;

    /** @type {number} */
    reloadActions;

    /** @type {Ammunition[]} */
    compatibleAmmunition;

    /** @type {(ammunition: Ammunition, updates: Updates) => Promise<void>} */
    addAmmunition;

    /** 
     * @type {(ammunition: Ammunition, updates: Updates) => void}
     */
    removeAmmunition;
}

class Ammunition extends Item {
    /** @type {string} */
    slug;

    /** @type {number} */
    quantity;

    /** @type {number} */
    remainingUses;

    /** @type {number} */
    maxUses;

    /** @type {boolean} */
    isHeld;
}

export class SystemAmmunition {

    /**
     * @param {PF2eActor} actor 
     */
    static async reload(actor) {
        const weapon = await SystemAmmunition.getWeapon(
            actor,
            {
                priority: weapon => {
                    // The weapon has capacity remaining, and we have ammunition to load into it
                    if (weapon.remainingCapacity > 0 && weapon.compatibleAmmunition.length > 0) {
                        return true;
                    }

                    // The weapon is a repeating weapon which takes at least an action to reload, and is not loaded
                    if (weapon.isRepeating && !weapon.isReadyToFire) {
                        return true;
                    }
                }
            },
            "actions.reload.warningNoReloadableWeapons"
        );
        if (!weapon) {
            return;
        }

        const updates = new Updates(actor);

        if (weapon.isRepeating) {
            // A repeating weapon might need to be loaded because it doesn't have a magazine loaded, or because it needs to be cocked.            
            if (weapon.isReadyToFire) {
                showWarning(format(`actions.reload.warningAlreadyLoaded`, { weapon: weapon.name }));
                return;
            }

            let numActions = 0;
            let ammunition = null;

            // If there's no magazine in the weapon, or the existing magazine is empty, we need to load the weapon with a fresh magazine
            if (weapon.loadedAmmunition.length === 0 || weapon.loadedAmmunition[0].remainingUses === 0) {
                // If there's a magazine in the weapon with no remaining uses, we need to remove it first
                if (weapon.loadedAmmunition.length > 0) {
                    weapon.removeAmmunition(ammunitionToRemove, updates);
                    numActions++;
                }

                ammunition = await SystemAmmunition.getCompatibleAmmunition(weapon);
                if (!ammunition) {
                    return;
                }

                // If we're not already holding the ammunition, we need to spend an action retrieving it.
                if (!ammunition.isHeld) {
                    numActions++;
                }

                numActions++;
                updates.update(ammunition, { "system.quantity": ammunition.quantity - 1 });
                await weapon.addAmmunition(ammunition, updates);
            }

            if (numActions === 0) {
                numActions = weapon.reloadActions;
            }

            // Cock the weapon, if required
            if (weapon.reloadActions > 0) {
                const loadedEffectSource = await getItem(LOADED_EFFECT_ID);
                setEffectTarget(loadedEffectSource, weapon);
                updates.create(loadedEffectSource);
            }

            SystemAmmunition.postReloadToChat(actor, weapon, ammunition, { numActions: numActions });
        } else {
            if (weapon.remainingCapacity <= 0) {
                showWarning(format(`actions.reload.${weapon.capacity > 1 ? "warningAlreadyFullyLoaded" : "warningAlreadyLoaded"}`, { weapon: weapon.name }));
                return;
            }

            const ammunition = await SystemAmmunition.getCompatibleAmmunition(weapon);
            if (!ammunition) {
                return;
            }

            updates.update(ammunition, { "system.quantity": ammunition.quantity - 1 });

            await weapon.addAmmunition(ammunition, updates);

            SystemAmmunition.postReloadToChat(actor, weapon, ammunition);
        }

        updates.handleUpdates();
    }

    /**
     * @param {PF2eActor} actor
     */
    static async unload(actor) {
        // Find a weapon that is currently loaded
        const weapon = await SystemAmmunition.getWeapon(
            actor,
            {
                required: weapon => weapon.loadedAmmunition.length > 0
            },
            "actions.unload.noLoadedWeapons"
        );

        if (!weapon) {
            return;
        }

        /** @type {Ammunition} */
        let ammunition;

        if (weapon.loadedAmmunition.length === 1) {
            ammunition = weapon.loadedAmmunition[0];
        } else {
            ammunition = await ItemSelect.getItem(
                `Unload Ammunition (${weapon.name})`,
                `Select ammunition to unload from ${weapon.name}.`,
                [
                    new Section(
                        localize("ammunitionSelect.header.loadedAmmunition"),
                        weapon.loadedAmmunition.map(ItemSelect.buildChoice)
                    )
                ]
            );
        }

        if (!ammunition) {
            return;
        }

        const updates = new Updates(actor);

        weapon.removeAmmunition(ammunition, updates);

        if (ammunition.remainingUses === ammunition.maxUses) {
            // If the ammunition still has all its uses remaining, try to add it to an existing stack that has all its uses remaining.
            // If no existing stack can be found, create a new stack.
            const existingStack = weapon.compatibleAmmunition
                .filter(candidate => candidate.remainingUses === candidate.maxUses)
                .find(candidate => candidate.slug === ammunition.slug);
            if (existingStack) {
                updates.update(existingStack, { "system.quantity": existingStack.quantity + 1 });
            } else {
                const ammunitionSource = await getItem(ammunition.sourceId);
                ammunitionSource.system.quantity = 1;

                updates.create(ammunitionSource);
            }
        } else if (ammunition.remainingUses > 0) {
            // If the ammunition still has some uses remaining, create a new stack.
            const ammunitionSource = await getItem(ammunition.sourceId);
            ammunitionSource.system.quantity = 1;
            ammunitionSource.system.uses.value = ammunition.remainingUses;

            updates.create(ammunitionSource);
        }

        // If the weapon is a repeating weapon, remove its loaded effect, if any
        if (weapon.isRepeating) {
            const loadedEffect = getEffectFromActor(actor, LOADED_EFFECT_ID, weapon.id);
            if (loadedEffect) {
                updates.delete(loadedEffect);
            }
        }

        updates.handleUpdates();

        SystemAmmunition.postUnloadToChat(actor, weapon, ammunition);
    }

    /**
     * Find a single weapon that can be reloaded. If multiple weapons are found, offer a choice of weapon.
     * 
     * @param {PF2eActor} actor
     * @param {{
     *      required: (weapon: Weapon) => bool
     *      priority: (weapon: Weapon) => bool
     * }} predicates Predicates to determine which weapons will be available for selection, or automatically selected
     * @param {string} noWeaponsMessage The message to show if there are no weapons that satisfy the main predicate
     * 
     * @returns {Promise<Weapon | null>}
     */
    static async getWeapon(
        actor,
        predicates = {},
        noWeaponsMessage
    ) {
        // Find all wielded or worn weapons that have capacity, and meet the given requirements
        const weapons = actor.itemTypes.weapon
            .map(SystemAmmunition.transformWeapon)
            .filter(weapon => !weapon.isStowed)
            .filter(weapon => weapon.capacity > 0)
            .filter(predicates.required ?? (_ => true));

        if (!weapons.length) {
            showWarning(localize(noWeaponsMessage));
            return null;
        }

        if (weapons.length === 1) {
            // If we only found one weapon that met the conditions, choose that one automatically
            return weapons[0];
        } else {
            // Prioritise equipped weapons, and those that fulfil the priority predicate
            const priorityWeapons = weapons
                .filter(weapon => weapon.isEquipped)
                .filter(predicates.priority ?? (_ => true));

            if (priorityWeapons.length === 1) {
                return priorityWeapons[0];
            }
        }

        /** @type Section<PF2eWeapon> */
        const sections = [];
        const equippedWeapons = weapons.filter(weapon => weapon.isEquipped);
        if (equippedWeapons.length) {
            sections.push(
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.equipped"),
                    equippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        const unequippedWeapons = weapons.filter(weapon => !weapon.isEquipped);
        if (unequippedWeapons.length) {
            sections.push(
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.worn"),
                    unequippedWeapons.map(ItemSelect.buildChoice)
                )
            );
        }

        return ItemSelect.getItem("Weapon Select", "Select a Weapon", sections);
    }

    /**
     * Find any ammunition that is compatible with the weapon. If multiple are found, offer a choice.
     * 
     * @param {Weapon} weapon 
     * @returns {Promise<Ammunition | null>} The selected ammunition, if any was found and selected.
     */
    static async getCompatibleAmmunition(weapon) {
        if (!weapon.compatibleAmmunition.length) {
            showWarning(game.i18n.localize("pf2e-ranged-combat.ammunitionSystem.actions.reload.warningNoCompatibleAmmunition"));
            return null;
        }

        if (weapon.compatibleAmmunition.length === 1) {
            return weapon.compatibleAmmunition[0];
        }

        /** @type {Section<Ammunition>[]} */
        const sections = [];

        const heldAmmunition = weapon.compatibleAmmunition.filter(ammunition => ammunition.isHeld);
        if (heldAmmunition.length > 0) {
            sections.push(
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.held"),
                    heldAmmunition.map(ItemSelect.buildChoice)
                )
            );
        }

        const wornAmmunition = weapon.compatibleAmmunition.filter(ammunition => !ammunition.isHeld);
        if (wornAmmunition.length > 0) {
            sections.push(
                new Section(
                    game.i18n.localize("pf2e-ranged-combat.weaponSystem.carried.worn"),
                    wornAmmunition.map(ItemSelect.buildChoice)
                )
            );
        }


        return ItemSelect.getItem(
            format("ammunitionSelect.titleWithWeapon", { weapon: weapon.name }),
            localize("ammunitionSelect.action.load"),
            sections
        );
    }

    /**
     * @param {PF2eWeapon} pf2eWeapon
     */
    static transformWeapon(pf2eWeapon) {
        const weapon = new Weapon();

        weapon.id = pf2eWeapon.id;
        weapon.name = pf2eWeapon.name;
        weapon.img = pf2eWeapon.img;

        weapon.isStowed = pf2eWeapon.isStowed;
        weapon.isEquipped = pf2eWeapon.isEquipped;

        weapon.reloadActions = pf2eWeapon.system.reload.value;
        weapon.isRepeating = pf2eWeapon.traits.has("repeating");
        weapon.capacity = pf2eWeapon.system.ammo?.capacity ?? 0;

        // Find the weapon's sub-items that are ammunition
        weapon.loadedAmmunition = pf2eWeapon.subitems.contents
            .filter(item => item.isAmmoFor(pf2eWeapon))
            .map(SystemAmmunition.transformAmmunition);

        // The number of ammunition items loaded into the weapon
        weapon.numLoadedAmmunition = weapon.loadedAmmunition
            .map(item => item.quantity)
            .reduce((current, quantity) => current + quantity, 0);

        // The total number of rounds loaded into the weapon
        weapon.numLoadedRounds = weapon.loadedAmmunition
            .map(item => {
                if (item.quantity === 0) {
                    return 0;
                }

                return item.remainingUses + (item.quantity - 1) * item.maxUses;
            })
            .reduce((current, quantity) => current + quantity, 0);

        weapon.remainingCapacity = weapon.capacity - weapon.numLoadedAmmunition;

        weapon.isReadyToFire = weapon.numLoadedRounds > 0;

        // A repeating weapon that has a reload value must be cocked to be ready to fire
        if (weapon.isReadyToFire && weapon.isRepeating && weapon.reloadActions > 0) {
            weapon.isReadyToFire = !!getEffectFromActor(pf2eWeapon.actor, LOADED_EFFECT_ID, weapon.id);;
        }

        weapon.compatibleAmmunition = [
            ...pf2eWeapon.actor.itemTypes.weapon,
            ...pf2eWeapon.actor.itemTypes.ammo
        ]
            .filter(ammo => ammo.system.quantity > 0)
            .filter(ammo => !ammo.isStowed)
            .filter(ammo => ammo.isAmmoFor(pf2eWeapon))
            .map(SystemAmmunition.transformAmmunition);

        weapon.addAmmunition = async (ammunition, updates) => {
            const subitems = pf2eWeapon.system.subitems;

            const matchingAmmunition = subitems.find(subitem => subitem.system.slug === ammunition.slug);
            if (matchingAmmunition) {
                // If we already have a matching item loaded, just add one to the quantity
                matchingAmmunition.system.quantity++;
            } else {
                // Otherwise, create a new entry and add it as a new sub-item
                const ammunitionSource = await getItem(ammunition.sourceId);
                ammunitionSource.system.quantity = 1;
                ammunitionSource.sort = subitems.length;
                if (weapon.isRepeating) {
                    ammunitionSource.system.uses.autoDestroy = false;
                }

                subitems.push(ammunitionSource);
            }

            updates.update(weapon, { "system.subitems": subitems });
        };

        weapon.removeAmmunition = (ammunition, updates) => {
            const subitems = pf2eWeapon.system.subitems;

            // Find the index of the item to remove
            const matchingAmmunitionIndex = subitems.findIndex(subitem => subitem._id === ammunition.id);

            // We shouldn't end up here, but return out just in case
            if (matchingAmmunitionIndex === -1) {
                return;
            }

            const matchingAmmunition = subitems[matchingAmmunitionIndex];

            if (matchingAmmunition.system.quantity <= 1) {
                // If the quantity is zero or one, remove it from the sub-items
                subitems.splice(matchingAmmunitionIndex, 1);
                for (const subitem of subitems) {
                    if (subitem.sort > matchingAmmunition.sort) {
                        subitem.sort--;
                    }
                }
            } else {
                // If the quantity is more than one, reduce the quantity by one
                matchingAmmunition.system.quantity--;
                matchingAmmunition.system.uses.value = ammunition.maxUses;
            }

            updates.update(weapon, { "system.subitems": subitems });
        };

        return weapon;
    }

    /**
     * @param {PF2eConsumable} pf2eAmmunition
     * @returns {Ammunition}
     */
    static transformAmmunition(pf2eAmmunition) {
        const ammunition = new Ammunition();
        ammunition.id = pf2eAmmunition.id;
        ammunition.sourceId = pf2eAmmunition.sourceId;
        ammunition.name = pf2eAmmunition.name;
        ammunition.img = pf2eAmmunition.img;

        ammunition.slug = pf2eAmmunition.slug;
        ammunition.quantity = pf2eAmmunition.system.quantity;

        if (pf2eAmmunition.system.uses) {
            ammunition.remainingUses = pf2eAmmunition.system.uses.value;
            ammunition.maxUses = pf2eAmmunition.system.uses.max;
        } else {
            ammunition.remainingUses = 1;
            ammunition.maxUses = 1;
        }

        return ammunition;
    }

    /**
     * @param {PF2eActor} actor
     * @param {Weapon} weapon
     * @param {Ammunition | null} ammunition 
     * @param {*} options
     */
    static postReloadToChat(actor, weapon, ammunition, options = {}) {
        let desc = format("actions.reload.tokenReloadsWeapon", { token: actor.name, weapon: weapon.name });
        if (ammunition) {
            desc = desc + " " + format("actions.reload.withAmmunition", { ammunition: ammunition.name });
        } else {
            desc = `${desc}.`;
        }

        postInteractToChat(
            actor,
            (ammunition ?? weapon).img,
            desc,
            options.numActions ?? weapon.reloadActions
        );
    }

    /**
     * 
     * @param {PF2eActor} actor 
     * @param {Weapon} weapon 
     * @param {Ammunition} ammunition 
     */
    static postUnloadToChat(actor, weapon, ammunition) {
        postInteractToChat(
            actor,
            weapon.img,
            format(
                "actions.unload.tokenUnloadsAmmunitionFromWeapon",
                {
                    token: actor.name,
                    ammunition: ammunition.name,
                    weapon: weapon.name
                }
            ),
            "1"
        );
    }
}
