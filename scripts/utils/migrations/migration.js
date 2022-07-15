import { Migration001MultipleAmmunitions } from "./migration-001-multiple-ammunitions.js";
import { Migration002ThrownWeaponGroups } from "./migration-002-thrown-weapon-groups.js";

const MIGRATIONS = [
    new Migration001MultipleAmmunitions(),
    new Migration002ThrownWeaponGroups()
];
const LATEST_SCHEMA_VERSION = 2;

export async function runMigrations() {
    const currentSchemaVersion = game.settings.get("pf2e-ranged-combat", "schemaVersion") || 0;

    if (currentSchemaVersion >= LATEST_SCHEMA_VERSION) {
        return;
    }

    for (const migration of MIGRATIONS) {
        if (migration.version > currentSchemaVersion) {
            await migration.runMigration();
        }
    }

    game.settings.set("pf2e-ranged-combat", "schemaVersion", LATEST_SCHEMA_VERSION);
}
