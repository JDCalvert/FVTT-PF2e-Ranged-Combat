import * as Utils from "./utils.js";

Hooks.on(
    "ready",
    () => {
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.character.prototype.consumeAmmo",
            function () {
                return true;
            },
            "OVERRIDE"
        );

        libWrapper.register(
            "pf2e-ranged-combat",
            "game.pf2e.Check.roll",
            function (wrapper, ...args) {
                const context = args[1];
                const actor = context.actor;
                const weapon = context.item; // Either WeaponPF2e (for a character) or MeleePF2e (for an NPC)

                // If we don't have all the information we need, or this isn't an attack roll,
                // then just call the actual function
                if (!actor || !weapon || context.type !== "attack-roll") {
                    return wrapper(...args);
                }

                // Find out if the weapon needs reloading
                let requiresLoading = Utils.requiresLoading(weapon);

                // Try to find the "loaded" effect for the attack. If it's not present, then don't allow
                // the attack to happen
                const loadedEffect = actor.itemTypes.effect.find(effect =>
                    effect.getFlag("core", "sourceId") === Utils.LOADED_EFFECT_ID
                    && effect.getFlag("pf2e-ranged-combat", "targetId") === weapon.id
                );

                if (requiresLoading && !loadedEffect && game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded")) {
                    ui.notifications.warn(`${weapon.name} is not loaded!`);
                    return;
                }

                const roll = wrapper(...args);

                // Remove the loaded effect
                loadedEffect?.delete();

                return roll;
            },
            "MIXED"
        );
    }
);
