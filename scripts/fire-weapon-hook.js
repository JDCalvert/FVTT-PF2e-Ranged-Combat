import * as Utils from "./utils/utils.js";
import * as WeaponUtils from "./utils/weapon-utils.js";
import { handleWeaponFired as alchemicalCrossbowHandleFired } from "./actions/alchemical-crossbow.js";

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
            function () {
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
                const contextWeapon = context.item; // Either WeaponPF2e (for a character) or MeleePF2e (for an NPC)

                // If we don't have all the information we need, or this isn't an attack roll,
                // then just call the actual function
                if (!actor || !contextWeapon || context.type !== "attack-roll") {
                    return wrapper(...args);
                }

                const weapon = WeaponUtils.transformWeapon(contextWeapon);

                // If the weapon is repeating, check that it's loaded with a magazine, and there's still ammunition remaining
                if (Utils.useAdvancedAmmunitionSystem(actor)) {
                    // If the weapon is repeating, check that it's loaded with a magazine, and there's still ammunition remaining.
                    if (weapon.isRepeating) {
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
                    if (weapon.requiresLoading) {
                        const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
                        if (!loadedEffect) {
                            Utils.showWarning(`${weapon.name} is not loaded!`);
                            return;
                        }
                    }

                    // For non-repeating weapons that don't require loading, we need to have enough
                    // ammunition in our selected stack to fire
                    if (weapon.usesAmmunition && !weapon.isRepeating && !weapon.requiresLoading) {
                        const ammunition = weapon.ammunition;
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
                    const ammunition = weapon.ammunition;
                    if (ammunition && ammunition.quantity < 1) {
                        Utils.showWarning(game.i18n.localize("PF2E.ErrorMessage.NotEnoughAmmo"));
                        return;
                    }

                    // If the weapon requires loading and Prevent Fire if not Reloaded is enabled, check that is has been loaded
                    const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
                    if (game.settings.get("pf2e-ranged-combat", "preventFireNotLoaded") && weapon.requiresLoading && !loadedEffect) {
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

                const updates = new Utils.Updates(actor);

                await alchemicalCrossbowHandleFired(actor, weapon, updates);

                // Crossbow Ace and Crossbow Crack Shot only apply to the next shot fired. If that shot hadn't
                // already been fired, it has now. If it had already been fired, remove the effect.
                for (const effectId of [Utils.CROSSBOW_ACE_EFFECT_ID, Utils.CROSSBOW_CRACK_SHOT_EFFECT_ID]) {
                    const effect = Utils.getEffectFromActor(actor, effectId, weapon.id);
                    if (effect) {
                        if (effect.data.flags["pf2e-ranged-combat"].fired) {
                            updates.remove(effect);
                        } else {
                            updates.update(() => effect.update({ "flags.pf2e-ranged-combat.fired": true }));
                        }
                    }
                }

                // Remove the loaded effect if the weapon requires reloading. It could have a loaded effect
                // and not require reloading e.g. combination weapons
                const loadedEffect = Utils.getEffectFromActor(actor, Utils.LOADED_EFFECT_ID, weapon.id);
                if (loadedEffect && weapon.requiresLoading) {
                    updates.remove(loadedEffect);
                }

                // If the advanced ammunition system is not enabled, consume a piece of ammunition
                if (Utils.useAdvancedAmmunitionSystem(actor)) {
                    // Use up a round of the loaded magazine
                    if (weapon.isRepeating) {
                        const magazineLoadedEffect = Utils.getEffectFromActor(actor, Utils.MAGAZINE_LOADED_EFFECT_ID, weapon.id);
                        const magazineCapacity = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "capacity");
                        const magazineRemaining = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "remaining") - 1;

                        magazineLoadedEffect.setFlag("pf2e-ranged-combat", "remaining", magazineRemaining);
                        const magazineLoadedEffectName = magazineLoadedEffect.getFlag("pf2e-ranged-combat", "name");
                        updates.update(async () => {
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
                        const ammunitionItemId = magazineLoadedEffect.data.flags["pf2e-ranged-combat"]["ammunitionItemId"]
                        const ammunitionSourceId = magazineLoadedEffect.data.flags["pf2e-ranged-combat"]["ammunitionSourceId"];
                        const ammunition = Utils.findItemOnActor(actor, ammunitionItemId, ammunitionSourceId);
                        if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition") && ammunition) {
                            ammunition.toMessage();
                        } else {
                            Utils.postInChat(
                                actor,
                                magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionImg"),
                                `${actor.name} uses ${magazineLoadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")} (${magazineRemaining}/${magazineCapacity} remaining).`
                            );
                        }

                        if (ammunition?.rules.length) {
                            const ammunitionEffectSource = await Utils.getItem(Utils.AMMUNITION_EFFECT_ID);
                            Utils.setEffectTarget(ammunitionEffectSource, weapon);
                            ammunitionEffectSource.name = `${ammunition.name} (${weapon.name})`;
                            ammunitionEffectSource.data.rules = ammunition.data.data.rules;
                            ammunitionEffectSource.img = ammunition.img;  
                            ammunitionEffectSource.data.description = ammunition.data.description;
                            ammunitionEffectSource.flags["pf2e-ranged-combat"].fired = false;
                            updates.add(ammunitionEffectSource);
                        }
                    } else if (weapon.requiresLoading) {
                        const ammunitionItemId = loadedEffect.data.flags["pf2e-ranged-combat"]["ammunitionItemId"]
                        const ammunitionSourceId = loadedEffect.data.flags["pf2e-ranged-combat"]["ammunitionSourceId"];
                        const ammunition = Utils.findItemOnActor(actor, ammunitionItemId, ammunitionSourceId);
                        if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition") && ammunition) {
                            ammunition.toMessage();
                        } else {
                            Utils.postInChat(
                                actor,
                                loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionImg"),
                                `${actor.name} uses ${loadedEffect.getFlag("pf2e-ranged-combat", "ammunitionName")}.`
                            );
                        }

                        if (ammunition?.rules.length) {
                            const ammunitionEffectSource = await Utils.getItem(Utils.AMMUNITION_EFFECT_ID);
                            Utils.setEffectTarget(ammunitionEffectSource, weapon);
                            ammunitionEffectSource.name = `${ammunition.name} (${weapon.name})`;
                            ammunitionEffectSource.data.rules = ammunition.data.data.rules;
                            ammunitionEffectSource.img = ammunition.img;  
                            ammunitionEffectSource.data.description = ammunition.data.description;
                            ammunitionEffectSource.flags["pf2e-ranged-combat"].fired = false;
                            updates.add(ammunitionEffectSource);
                        }
                    } else if (weapon.usesAmmunition) {
                        const ammunition = weapon.ammunition;
                        updates.update(async () => {
                            await ammunition.update({
                                "data.quantity": ammunition.quantity - 1
                            });
                        });

                        if (game.settings.get("pf2e-ranged-combat", "postFullAmmunition")) {
                            ammunition.toMessage()
                        } else {
                            Utils.postInChat(actor, ammunition.img, `${actor.name} uses ${ammunition.name}.`);
                        }

                        if (ammunition.rules.length) {
                            const ammunitionEffectSource = await Utils.getItem(Utils.AMMUNITION_EFFECT_ID);
                            Utils.setEffectTarget(ammunitionEffectSource, weapon);
                            ammunitionEffectSource.name = `${ammunition.name} (${weapon.name})`;
                            ammunitionEffectSource.data.rules = ammunition.data.data.rules;
                            ammunitionEffectSource.img = ammunition.img;  
                            ammunitionEffectSource.data.description = ammunition.data.description;
                            ammunitionEffectSource.flags["pf2e-ranged-combat"].fired = false;
                            updates.add(ammunitionEffectSource);
                        }
                    }
                } else {
                    weapon.ammunition?.consume();
                }

                await updates.handleUpdates();

                return roll;
            },
            "MIXED"
        );
    }
);
