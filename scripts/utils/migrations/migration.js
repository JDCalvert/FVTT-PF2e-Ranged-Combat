import { Migration001MultipleAmmunitions } from "./migration-001-multiple-ammunitions.js";

const MIGRATIONS = [
    new Migration001MultipleAmmunitions()
];
const LATEST_SCHEMA_VERSION = 1;

export async function runMigrations() {
    const currentSchemaVersion = game.settings.get("pf2e-ranged-combat", "schemaVersion") || 0;

    if (currentSchemaVersion === LATEST_SCHEMA_VERSION) {
        return;
    }

    for (const migration of MIGRATIONS) {
        if (migration.version > currentSchemaVersion) {
            migration.runMigration();
        }
    }

    game.settings.set("pf2e-ranged-combat", "schemaVersion", LATEST_SCHEMA_VERSION);
}
