import { handleWeaponFired as alchemicalCrossbowHandleFired } from "./actions/alchemical-crossbow.js";
import { checkLoaded } from "./ammunition-system/fire-weapon-check.js";
import { fireWeapon } from "./ammunition-system/fire-weapon-handler.js";
import { CROSSBOW_ACE_EFFECT_ID, CROSSBOW_CRACK_SHOT_EFFECT_ID, getEffectFromActor, getFlag, Updates } from "./utils/utils.js";
import { transformWeapon } from "./utils/weapon-utils.js";

Hooks.on(
    "ready",
    () => {
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.character.prototype.consumeAmmo",
            function() {
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

                if (!checkLoaded(actor, weapon)) {
                    return;
                }

                // Actually make the roll.
                // If for some reason the roll doesn't get made, don't do any of the post-roll stuff
                const roll = await wrapper(...args);
                if (!roll) {
                    return;
                }

                const updates = new Updates(actor);

                await alchemicalCrossbowHandleFired(actor, weapon, updates);

                // Some effects only apply to the next shot fired. If that shot hadn't
                // already been fired, it has now. If it had already been fired, remove the effect.
                for (const effectId of [CROSSBOW_ACE_EFFECT_ID, CROSSBOW_CRACK_SHOT_EFFECT_ID]) {
                    const effect = getEffectFromActor(actor, effectId, weapon.id);
                    if (effect) {
                        if (getFlag(effect, "fired")) {
                            updates.remove(effect);
                        } else {
                            updates.update(() => effect.update({ "flags.pf2e-ranged-combat.fired": true }));
                        }
                    }
                }

                // Handle removing the ammunition from the weapon now that it's been fired
                fireWeapon(actor, weapon, updates);

                await updates.handleUpdates();

                return roll;
            },
            "MIXED"
        );
    }
);
