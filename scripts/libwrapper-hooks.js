import { buildAuxiliaryActions } from "./ammunition-system/auxiliary-actions.js";
import { disableAmmoConsumption } from "./ammunition-system/disable-ammo-consumption.js";
import { checkLoaded } from "./ammunition-system/fire-weapon-check.js";
import { changeCarryType, changeStowed, findGroupStacks } from "./thrown-weapons/change-carry-type.js";
import { checkThrownWeapon } from "./thrown-weapons/throw-weapon-check.js";
import { HookManager } from "./utils/hook-manager.js";
import { Updates, getAttackPopout, getFlag } from "./utils/utils.js";
import { transformWeapon } from "./utils/weapon-utils.js";

export function initialiseLibWrapperHooks() {
    /**
     * Override the function for changing an items carrying position
     */
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.changeCarryType",
        changeCarryType,
        "MIXED"
    );

    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Actor.documentClasses.npc.prototype.changeCarryType",
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

            // If there's an attack popout open for this item, close it
            getAttackPopout(this)?.close({ force: true });

            wrapper(...args);
        },
        "WRAPPER"
    );

    // Stop ammunition rules from automatically applying to its weapon
    libWrapper.register(
        "pf2e-ranged-combat",
        "CONFIG.PF2E.Item.documentClasses.weapon.prototype.prepareSiblingData",
        function() {
            Object.getPrototypeOf(CONFIG.PF2E.Item.documentClasses.weapon).prototype.prepareSiblingData.apply(this);
        },
        "OVERRIDE"
    );

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

            // Call the weapon attack hook and handle any updates that come out of it
            const updates = new Updates(actor);
            await HookManager.call("weapon-attack", weapon, updates);
            await updates.handleUpdates();

            return roll;
        },
        "MIXED"
    );
}
