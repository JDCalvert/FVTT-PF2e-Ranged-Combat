import { handleWeaponFired as handleAlchemicalCrossbowFired } from "./actions/alchemical-crossbow.js";
import { handleWeaponFiredAlchemicalShot } from "./actions/alchemical-shot.js";
import { checkLoaded } from "./ammunition-system/fire-weapon-check.js";
import { fireWeapon } from "./ammunition-system/fire-weapon-handler.js";
import { handleWeaponFired as crossbowFeatsHandleFired } from "./feats/crossbow-feats.js";
import { changeCarryType, changeStowed, findGroupStacks } from "./thrown-weapons/change-carry-type.js";
import { checkThrownWeapon } from "./thrown-weapons/throw-weapon-check.js";
import { handleThrownWeapon } from "./thrown-weapons/throw-weapon-handler.js";
import { getFlag, Updates } from "./utils/utils.js";
import { transformWeapon } from "./utils/weapon-utils.js";

Hooks.on(
    "ready",
    () => {
        /**
         * Override the function for changing an items carrying position
         */
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.character.prototype.adjustCarryType",
            changeCarryType,
            "MIXED"
        );

        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.npc.prototype.adjustCarryType",
            changeCarryType,
            "MIXED"
        );

        /** 
         * Override the function for stowing or unstowing an item
         */
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.character.prototype.stowOrUnstow",
            changeStowed,
            "MIXED"
        );

        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.npc.prototype.stowOrUnstow",
            changeStowed,
            "MIXED"
        );

        /**
         * Override the system function of consuming ammunition so we can handle it ourselves
         */
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Actor.documentClasses.character.prototype.consumeAmmo",
            function() {
                return true;
            },
            "OVERRIDE"
        );

        /**
         * Override the system function of determining a weapon's ammunition, so we still consider
         * an empty stack as selected ammunition
         */
        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Item.documentClasses.weapon.prototype.ammo",
            function() {
                const ammo = this.actor?.items.get(this.system.selectedAmmoId ?? "");
                return ammo?.type === "consumable" ? ammo : null;
            },
            "OVERRIDE"
        );

        libWrapper.register(
            "pf2e-ranged-combat",
            "CONFIG.PF2E.Item.documentClasses.weapon.prototype._onDelete",
            function(wrapper, ...args) {
                if (this.actor && this.actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
                    const updates = new Updates(this.actor);

                    const groupStacks = findGroupStacks(this);
                    const groupStackIds = groupStacks.map(stack => stack.id);

                    // Update all the weapons in the group to remove this item's ID
                    groupStacks.forEach(stack =>
                        updates.update(
                            stack,
                            {
                                flags: {
                                    "pf2e-ranged-combat": {
                                        groupIds: groupStackIds
                                    }
                                }
                            }
                        )
                    );

                    if (groupStacks.length) {
                        this.actor.itemTypes.melee.filter(melee => getFlag(melee, "weaponId") === this.id)
                            .forEach(melee =>
                                updates.update(
                                    melee,
                                    {
                                        flags: {
                                            "pf2e-ranged-combat": {
                                                weaponId: groupStackIds[0]
                                            }
                                        }
                                    }
                                )
                            );
                    }

                    updates.handleUpdates();
                }

                wrapper(...args);
            },
            "WRAPPER"
        );

        /**
         * Override rolling an attack, so we can make checks before the roll is made,
         * and handle what happens after the roll
         */
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

                const updates = new Updates(actor);

                // Run the various handlers for the weapon being used
                crossbowFeatsHandleFired(weapon, updates);
                handleAlchemicalCrossbowFired(actor, weapon, updates);
                fireWeapon(actor, weapon, updates);
                handleThrownWeapon(weapon);
                handleWeaponFiredAlchemicalShot(weapon, updates);

                await updates.handleUpdates();

                return roll;
            },
            "MIXED"
        );
    }
);
