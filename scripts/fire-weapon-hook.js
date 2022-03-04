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
            "CONFIG.PF2E.Item.documentClasses.weapon.prototype.ammo",
            function() {
                const ammo = this.actor?.items.get(this.data.data.selectedAmmoId ?? "");
                return ammo?.type === "consumable" ? ammo : null;
            },
            "OVERRIDE"
        );

        libWrapper.register(
            "pf2e-ranged-combat",
            "game.pf2e.Check.roll",
            async function (wrapper, ...args) {
                const context = args[1];
                const actor = context.actor;
                const weapon = context.item; // Either WeaponPF2e (for a character) or MeleePF2e (for an NPC)

                // If we don't have all the information we need, or this isn't an attack roll,
                // then just call the actual function
                if (!actor || !weapon || context.type !== "attack-roll") {
                    return wrapper(...args);
                }

                // If the weapon is repeating, check that it's loaded with a magazine, and there's still ammunition remaining
                if (Utils.useAdvancedAmmunitionSystem(actor)) {
                    // If the weapon is repeating, check that it's loaded with a magazine, and there's still ammunition remaining.
                    if (Utils.isRepeating(weapon)) {
                        const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
                        if (!magazineLoadedEffect) {
                            Utils.showWarning(`${weapon.name} has no magazine loaded!`);
                            return;
                        } else if (magazineLoadedEffect.getFlag("pf2e-ranged-combat", "remaining") < 1) {
                            Utils.showWarning(`${weapon.name}'s magazine is empty!`);
                            return;
                        }
                    }

                    // If the weapon requires reloading, check that it has been loaded
                    if (Utils.requiresLoading(weapon)) {
                        const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id)
                        if (!loadedEffect) {
                            Utils.showWarning(`${weapon.name} is not loaded!`);
                            return;
                        }
                    }

                    // For non-repeating weapons that don't require loading, we need to have enough
                    // ammunition in our selected stack to fire
                    if (Utils.usesAmmunition(weapon) && !Utils.isRepeating(weapon) && !Utils.requiresLoading(weapon)) {
                        const ammunition = Utils.getAmmunition(weapon);
                        if (!ammunition) {
                            Utils.showWarning(`${weapon.name} has no ammunition selected!`);
                            return;
                        } else if (ammunition.quantity <= 0) {
                            Utils.showWarning(`${weapon.name} has no ammunition remaining!`);
                            return;
                        }
                    }
                } else {
                    // Use the standard system logic: allow the attack to be made if no ammo is selected,
                    // but not if ammo is selected and it is empty
                    const ammunition = Utils.getAmmunition(weapon);
                    if (ammunition && ammunition.quantity < 1) {
                        Utils.showWarning(game.i18n.localize("PF2E.ErrorMessage.NotEnoughAmmo"));
                        return;
                    }

                    // If the weapon requires loading and Prevent Fire if not Reloaded is enabled, check that is has been loaded
                    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id)
                    if (game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded") && Utils.requiresLoading(weapon) && !loadedEffect) {
                        Utils.showWarning(`${weapon.name} is not loaded!`);
                        return;
                    }
                }

                // Actually make the roll.
                // If for some reason the roll doesn't get made, don't do any of the post-roll stuff
                const roll = await wrapper(...args);
                if (!roll) {
                    return;
                }

                const itemsToRemove = [];
                const itemsToUpdate = [];

                // Remove the loaded effect
                const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id)
                if (loadedEffect) {
                    itemsToRemove.push(loadedEffect);
                }

                // If the advanced ammunition system is not enabled, consume a piece of ammunition
                if (Utils.useAdvancedAmmunitionSystem(actor)) {
                    // Use up a round of the loaded magazine
                    if (Utils.isRepeating(weapon)) {
                        const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
                        const magazineCapacity = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "capacity");
                        const magazineRemaining = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "remaining") - 1;

                        magazineLoadedEffect.setFlag("pf2e-ranged-combat", "remaining", magazineRemaining);
                        const magazineLoadedEffectName = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "name");
                        itemsToUpdate.push(async () => {
                            await magazineLoadedEffect.update({
                                "name": `${magazineLoadedEffectName} (${magazineRemaining}/${magazineCapacity})`
                            });
                        });
                        // Show floaty text with the new effect name
                        const tokens = actor.getActiveTokens();
                        for (const token of tokens) {
                            token.showFloatyText({
                                update: {
                                    name: `${magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")} ${magazineRemaining}/${magazineCapacity}`
                                }
                            });
                        }

                        // Post in chat saying some ammunition was used
                        Utils.postInChat(
                            actor,
                            magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionImg"),
                            `${actor.name} uses ${magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")} (${magazineRemaining}/${magazineCapacity} remaining).`
                        );
                    } else if (Utils.requiresLoading(weapon)) {
                        Utils.postInChat(
                            actor,
                            loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionImg"),
                            `${actor.name} uses ${loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")}.`
                        )
                    } else if (Utils.usesAmmunition(weapon)) {
                        const ammo = Utils.getAmmunition(weapon);
                        itemsToUpdate.push(async () => {
                            await ammo.update({
                                "data.quantity.value": ammo.quantity - 1
                            });
                        });
                        Utils.postInChat(actor, ammo.img, `${actor.name} uses ${ammo.name}.`);
                    }
                } else {
                    weapon.ammo?.consume();
                }

                Utils.handleUpdates(actor, [], itemsToRemove, itemsToUpdate);

                return roll;
            },
            "MIXED"
        );
    }
);
