import { isTargetHuntedPrey } from "../hunt-prey/hunted-prey-hook.js";
import { HookManager } from "../utils/hook-manager.js";
import { Updates } from "../utils/updates.js";
import { Weapon } from "../weapons/types.js";
import { WeaponSystem } from "../weapons/system.js";
import { AuxiliaryActionHookParams } from "./auxiliary-actions.js";
import { WeaponAttackCheckParams, WeaponAttackProcessParams } from "./hook-params.js";

export class Core {
    static initialise() {
        // Wrapper around preparing strikes
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareStrike",
            function (wrapper, ...args) {
                const strike = wrapper(...args);

                Core.buildAuxiliaryActions(strike);

                const actor = args[0]?.actor;

                strike.variants.forEach(
                    variant => {
                        const roll = variant.roll;
                        variant.roll = params => {
                            const extraOptions = [];
                            // Disable the system's ammunition consumption - we handle it ourselves
                            if (params.consumeAmmo === false) {
                                extraOptions.push("skip-post-processing");
                            }

                            params.consumeAmmo = false;

                            // If our current target is our hunted prey, add the "hunted-prey" roll option
                            if (isTargetHuntedPrey(actor)) {
                                extraOptions.push("hunted-prey");
                            }

                            if (extraOptions.length > 0) {
                                params.options = new Set([...(params.options ?? []), ...extraOptions]);
                            }

                            return roll(params);
                        };
                    }
                );

                strike.attack = strike.roll = strike.variants[0].roll;

                // When we roll damage, set the hunted-prey roll option if we're targeting our prey
                for (const method of ["damage", "critical"]) {
                    const damage = strike[method];
                    strike[method] = async params => {
                        if (isTargetHuntedPrey(actor)) {
                            params.options = new Set([...(params.options ?? []), "hunted-prey"]);
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
            /**
             * @param {function(...any)} wrapper
             * @param {any[]} args
             */
            async function (wrapper, ...args) {
                const context = args[1];

                /** @type {ActorPF2e} */
                const actor = context.actor;

                // If the current target is our hunted prey, add the "hunted-prey" roll option
                if (isTargetHuntedPrey(actor)) {
                    context.options.add("hunted-prey");
                }

                /** @type {WeaponPF2e | MeleePF2e} */
                const contextWeapon = context.item; // Either WeaponPF2e (for a character) or MeleePF2e (for an NPC)

                // If we don't have all the information we need, or this isn't an attack roll,
                // then just call the actual function
                if (!actor || !contextWeapon || context.type !== "attack-roll") {
                    return wrapper(...args);
                }

                const weapon = WeaponSystem.transformWeapon(actor, contextWeapon);
                if (!weapon) {
                    return wrapper(...args);
                }

                // Run any registered checks before rolling the attack
                if (!await HookManager.runCheck("weapon-attack", new WeaponAttackCheckParams(weapon))) {
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
                    HookManager.call("weapon-attack", new WeaponAttackProcessParams(weapon, updates));
                    await updates.commit();
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

                const weapon = await Core.getWeapon(actor, flags);
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

                updates.commit();
            }
        );
    }

    /**
     * Find the weapon used for the attack on the message flags
     * 
     * @param {ActorPF2e} actor 
     * @param {any} flags 
     * @returns {Promise<Weapon | null>}
     */
    static async getWeapon(actor, flags) {
        const type = flags.origin?.type;
        if (!(type == "weapon" || type == "melee")) {
            return null;
        }

        const uuid = flags.origin?.uuid;
        if (!uuid) {
            return null;
        }

        const item = /** @type {WeaponPF2e | MeleePF2e} */ (await fromUuid(uuid));
        if (!item) {
            return null;
        }

        return WeaponSystem.transformWeapon(actor, item);
    }

    /**
     * @param {StrikePF2e} strike
     */
    static buildAuxiliaryActions(strike) {
        const pf2eWeapon = strike.item;
        const actor = pf2eWeapon.actor;
        const weapon = WeaponSystem.transformWeapon(actor, pf2eWeapon);

        const auxiliaryActions = strike.auxiliaryActions;

        /** @type {AuxiliaryActionHookParams} */
        const params = {
            auxiliaryActions,
            actor,
            weapon,
            pf2eWeapon
        };

        HookManager.call("auxiliary-actions", params);
    }
}
