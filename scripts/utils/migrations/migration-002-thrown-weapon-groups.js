import { useAdvancedThrownWeaponSystem } from "../../thrown-weapons/utils.js";
import { getFlags } from "../utils.js";
import { getWeapons } from "../weapon-utils.js";

export class Migration002ThrownWeaponGroups {
    version = 2;

    async runMigration() {
        console.info("PF2e Ranged Combat - Running Migration 1: Multiple Ammunition Update");

        const actors = game.actors.contents;

        for (const actor of actors) {
            if (!useAdvancedThrownWeaponSystem(actor)) {
                continue;
            }

            const updates = [];

            const weapons = actor.itemTypes.weapon;

            for (const weapon of weapons) {
                weapon.unsetFlag("pf2e-ranged-combat", "groupIds");

                const flags = getFlags(weapon)?.droppedFrom;
                if (!flags) {
                    continue;
                }

                const droppedFrom = flags.droppedFrom;
                if (droppedFrom) {

                    // Remove the droppedFrom flag and reset the name
                    updates.push(
                        {
                            _id: weapon.id,
                            name: droppedFrom.name,
                            flags: {
                                "pf2e-ranged-combat": {
                                    "-=droppedFrom": null
                                }
                            }
                        }
                    );

                    // Look for the weapon this was dropped from
                    const originalWeapon = weapons.find(w => w.id === droppedFrom.id);
                    if (originalWeapon) {
                        const groupIds = [originalWeapon.id, weapon.id];

                        // Update the original weapon to set the group
                        updates.push(
                            {
                                _id: originalWeapon.id,
                                flags: {
                                    "pf2e-ranged-combat": {
                                        groupIds
                                    }
                                }
                            }
                        );

                        // Update the current weapon to set the group
                        updates.push(
                            {
                                _id: weapon.id,
                                flags: {
                                    "pf2e-ranged-combat": {
                                        groupIds
                                    }
                                }
                            }
                        );
                    }
                }
            }

            actor.updateEmbeddedDocuments("Item", updates);
        }
    }
}
