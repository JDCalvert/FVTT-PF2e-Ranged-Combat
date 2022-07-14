/**
 * For the given actor type, check if the advanced thrown weapon system is enabled
 */
export function useAdvancedThrownWeaponSystem(actor) {
    if (actor.type === "character") {
        return game.settings.get("pf2e-ranged-combat", "advancedThrownWeaponSystemPlayer");
    } else if (actor.type === "npc") {
        return false; // Placeholder for NPC advanced thrown weapon system
    } else {
        return false;
    }
}
