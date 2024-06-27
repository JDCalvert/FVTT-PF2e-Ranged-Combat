import { buildAuxiliaryActions } from "../ammunition-system/auxiliary-actions.js";
import { isTargetHuntedPrey } from "../hunt-prey/hunted-prey-hook.js";
import { Weapon } from "../types/pf2e-ranged-combat/weapon.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { transformWeapon } from "../utils/weapon-utils.js";

export function initialiseAdvancedWeaponSystem() {

    // Wrapper around preparing strikes
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareStrike",
        function(wrapper, ...args) {
            const strike = wrapper(...args);

            buildAuxiliaryActions(strike);

            const actor = args[0]?.actor;

            strike.variants = strike.variants.map(
                variant => {
                    return {
                        ...variant,
                        roll: params => {
                            // Disable the system's ammunition consumption - we handle it ourselves
                            params.consumeAmmo = false;

                            // If our current target is our hunted prey, add the "hunted-prey" roll option
                            params.options ??= [];
                            if (isTargetHuntedPrey(actor)) {
                                params.options.push("hunted-prey");
                            }

                            return variant.roll(params);
                        }
                    };
                }
            );

            strike.attack = strike.roll = strike.variants[0].roll;

            // When we roll damage, set the hunted-prey roll option if we're targeting our prey
            for (const method of ["damage", "critical"]) {
                const damage = strike[method];
                strike[method] = async (params) => {
                    if (isTargetHuntedPrey(actor)) {
                        params.options ??= [];
                        params.options.push("hunted-prey");
                    }
    
                    return damage(params);
                };
            }

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

            // If the current target is our hunted prey, add the "hunted-prey" roll option
            if (isTargetHuntedPrey(actor)) {
                context.options.add("hunted-prey");
            }

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

            // Run any registered checks before rolling the attack
            if (!await HookManager.runCheck("weapon-attack", { weapon })) {
                return;
            }

            // Actually make the roll.
            // If for some reason the roll doesn't get made, don't do any of the post-roll stuff
            const roll = await wrapper(...args);
            if (!roll) {
                return;
            }

            // Call the weapon attack hook and handle updates, unless we're skipping post-processing
            if (!context.options.has("skip-post-processing")) {
                const updates = new Updates(actor);
                HookManager.call("weapon-attack", { weapon, updates, context, roll });
                await updates.handleUpdates();
            }

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

            const updates = new Updates(actor);

            HookManager.call(
                "damage-roll",
                {
                    actor,
                    target: message.target?.actor,
                    updates
                }
            );

            const weapon = await getWeapon(flags);
            if (weapon) {
                HookManager.call(
                    "weapon-damage",
                    {
                        weapon,
                        target: message.target?.actor,
                        updates
                    }
                );
            }

            updates.handleUpdates();
        }
    );
}

/**
 * Find the weapon used for the attack on the message flags
 * 
 * @param {any} flags 
 * @returns {Promise<Weapon | null>}
 */
async function getWeapon(flags) {
    if (!(flags.origin?.type == "weapon" || flags.origin?.type == "melee")) {
        return null;
    }

    const uuid = flags.origin?.uuid;
    if (!uuid) {
        return null;
    }

    const item = await fromUuid(uuid);
    if (!item) {
        return null;
    }

    return transformWeapon(item);
}
