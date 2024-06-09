import { buildAuxiliaryActions } from "../ammunition-system/auxiliary-actions.js";
import { disableAmmoConsumption } from "../ammunition-system/disable-ammo-consumption.js";
import { checkLoaded } from "../ammunition-system/fire-weapon-check.js";
import { checkThrownWeapon } from "../thrown-weapons/throw-weapon-check.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/utils.js";
import { transformWeapon } from "../utils/weapon-utils.js";

export function initialiseAdvancedWeaponSystem() {

    // Disable the PF2e system automatically applying ammunition ammunition rules its weapon
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Item.documentClasses.weapon.prototype.prepareSiblingData",
        function() {
            Object.getPrototypeOf(CONFIG.PF2E.Item.documentClasses.weapon).prototype.prepareSiblingData.apply(this);
        },
        "OVERRIDE"
    );

    // Disable the PF2e system's ammunition consumption
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareStrike",
        function(wrapper, ...args) {
            const strike = wrapper(...args);

            buildAuxiliaryActions(strike);
            disableAmmoConsumption(strike);

            return strike;
        },
        "WRAPPER"
    );

    // Wrapper around attack rolls, so we can make checks before the roll is made, and fire a trigger after
    libWrapper.register(
        "pf2e-ranged-combat",
        "game.pf2e.Check.roll",
        async function(wrapper, ...args) {
            const context = args[1];
            const actor = context.actor;
            const contextWeapon = context.item; // Either WeaponPF2e (for a character) or MeleePF2e (for an NPC)

            // If we don't have all the information we need, or this isn't an attack roll,
            // then just call the actual function
            if (!actor || !contextWeapon || context.type !== "attack-roll") {
                return wrapper(...args);
            }

            const weapon = transformWeapon(contextWeapon);
            if (!weapon) {
                return wrapper(...args);
            }

            if (!await checkLoaded(actor, weapon)) {
                return;
            }

            if (!await checkThrownWeapon(weapon)) {
                return;
            }

            // Actually make the roll.
            // If for some reason the roll doesn't get made, don't do any of the post-roll stuff
            const roll = await wrapper(...args);
            if (!roll) {
                return;
            }

            // Call the weapon attack hook and handle any updates that come out of it
            const updates = new Updates(actor);
            await HookManager.call("weapon-attack", { weapon, updates });
            await updates.handleUpdates();

            return roll;
        },
        "MIXED"
    );

    // When we get a message about rolling damage for a weapon, fire the weapon damage hook for that weapon
    Hooks.on(
        "preCreateChatMessage",
        async message => {
            const actor = message.actor;
            if (!actor) {
                return;
            }

            const flags = message.flags?.pf2e;
            if (!flags) {
                return;
            }

            if (flags.context?.type != "damage-roll") {
                return;
            }

            if (!(flags.origin?.type == "weapon" || flags.origin?.type == "melee")) {
                return;
            }

            const uuid = flags.origin?.uuid;
            if (!uuid) {
                return;
            }

            const item = await fromUuid(uuid);
            if (!item) {
                return;
            }

            const weapon = transformWeapon(item);
            if (!weapon) {
                return;
            }

            const updates = new Updates(item.actor);

            await HookManager.call(
                "weapon-damage",
                {
                    weapon,
                    target: message.target?.actor,
                    updates
                }
            );

            updates.handleUpdates();
        }
    );
}
