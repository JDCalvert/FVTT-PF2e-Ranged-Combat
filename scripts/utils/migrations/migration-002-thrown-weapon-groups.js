import { useAdvancedThrownWeaponSystem } from "../../thrown-weapons/utils.js";
import { getFlags } from "../utils.js";

export class Migration002ThrownWeaponGroups {
    version = 2;

    async runMigration() {
        console.info(game.i18n.localize("pf2e-ranged-combat.utils.migration.thrownWeaponGroups.consoleInfo"));

        const actors = game.actors.contents;

        for (const actor of actors) {
            if (!useAdvancedThrownWeaponSystem(actor)) {
                continue;
            }

            const updates = [];

            const weapons = actor.itemTypes.weapon;

            for (const weapon of weapons) {
                const droppedFrom = getFlags(weapon)?.droppedFrom;
                if (!droppedFrom) {
                    continue;
                }

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

            actor.updateEmbeddedDocuments("Item", updates);
        }
    }
}
