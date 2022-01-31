import { PF2eRangedCombat } from "./utils.js";

Hooks.on(
    "ready",
    () => {
        libWrapper.register(
            "pf2e-ranged-combat",
            "game.pf2e.Check.roll",
            function (wrapper, ...args) {
                const context = args[1];
                const actor = context.actor;
                const item = context.item; // Either WeaponPF2e (for a character) or MeleePF2e (for an NPC)

                // If we don't have all the information we need, or this isn't an attack roll,
                // then just call the actual function
                if (!actor || !item || context.type !== "attack-roll") {
                    return wrapper(...args);
                }

                // Find out if the weapon needs reloading
                let requiresLoading = PF2eRangedCombat.requiresLoading(item);

                // Try to find the "loaded" effect for the attack. If it's not present, then don't allow
                // the attack to happen
                const loadedEffect = actor.itemTypes.effect.find(effect =>
                    effect.getFlag("core", "sourceId") === PF2eRangedCombat.LOADED_EFFECT_ID
                    && effect.getFlag("pf2e-ranged-combat", "targetId") === item.id
                );

                if (requiresLoading && !loadedEffect && game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded")) {
                    ui.notifications.warn(`${item.name} is not loaded!`);
                    return;
                }

                // Amend the roll callback to delete the loaded effect after
                if (loadedEffect) {
                    const existingCallback = args[3];
                    args[3] = roll => {
                        existingCallback?.(roll);
                        loadedEffect.delete();
                    }
                }

                return wrapper(...args);
            },
            "MIXED"
        );
    }
);
