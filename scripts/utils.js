import { WeaponSelectDialog } from "./dialog.js";

export class PF2eRangedCombat {

    // Loaded
    static LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.nEqdxZMAHlYVXI0Z";

    // Reload
    static RELOAD_ACTION_ONE_ID = "Compendium.pf2e-ranged-combat.actions.MAYuLJ4bsciOXiNM";
    static RELOAD_ACTION_TWO_ID = "Compendium.pf2e-ranged-combat.actions.lqjuYBOAjDb9ACfo";
    static RELOAD_ACTION_THREE_ID = "Compendium.pf2e-ranged-combat.actions.IOhJIXBqxCuWtAgr";
    static RELOAD_ACTION_EXPLORE_ID = "Compendium.pf2e-ranged-combat.actions.t8xTgsZqOIW02suc";

    // Hunt Prey
    static HUNT_PREY_FEATURE_ID = "Compendium.pf2e.classfeatures.0nIOGpHQNHsKSFKT";
    static HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.JYi4MnsdFu618hPm";
    static HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.rdLADYwOByj8AZ7r";

    // Crossbow Ace
    static CROSSBOW_ACE_FEAT_ID = "Compendium.pf2e.feats-srd.CpjN7v1QN8TQFcvI";
    static CROSSBOW_ACE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.zP0vPd14V5OG9ZFv";

    // Crossbow Crack Shot
    static CROSSBOW_CRACK_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.s6h0xkdKf3gecLk6";
    static CROSSBOW_CRACK_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.hG9i3aOBDZ9Bq9yi";

    /**
     * Get exactly one controlled token. If there are no tokens controlled, looks for a single
     * token belonging to the current user's character. If there are multiple tokens found,
     * returns undefined.
     */
    static getControlledToken() {
        return [canvas.tokens.controlled, game.user.character?.getActiveTokens()]
            .filter(tokens => !!tokens)
            .find(tokens => tokens.length === 1)
            ?.[0];
    }

    /**
     * Find exactly one targeted token
     */
    static getTarget(notifyNoToken = true) {
        const targetTokenIds = game.user.targets.ids;
        const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));
        if (!targetTokens.length) {
            if (notifyNoToken) ui.notifications.warn("No target selected");
        } else if (targetTokens.length > 1) {
            if (notifyNoToken) ui.notifications.warn("You must have only one target selected");
        } else {
            return targetTokens[0];
        }

        return null;
    }

    /**
     * Find out if a weapon requires loading (e.g. has a reload time of greater than 0)
     * 
     * @param {WeaponPF2e | MeleePF2e} item
     * @returns true if the weapon has a non-zero reload time
     */
    static requiresLoading(item) {
        return this.getReloadTime(item) > 0;
    }

    /**
     * Find the reload time of a weapon
     * @param {WeaponPF2e | MeleePF2e} item
     * @returns the reload time of the weapon, or 0 if it doesn't have one
     */
    static getReloadTime(item) {
        if (item.actor.type === "character") {
            return item.data.data.reload.value || 0;
        } else if (item.actor.type === "npc") {
            const reloadTrait = item.data.data.traits.value.find(trait => trait.startsWith("reload-"));
            if (reloadTrait) {
                const reloadTime = reloadTrait.slice("reload-".length);
                if (reloadTime === "1-min") {
                    return 30;
                } else {
                    return parseInt(reloadTime);
                }
            }
        }

        return 0;
    }

    /**
     * Find whether the actor has the specified item
     */
    static actorHasItem(actor, sourceId) {
        return actor.items.some(item => item.getFlag("core", "sourceId") === sourceId);
    }

    /**
     * Get a specific item from the actor, identified by its source ID. Optionally, add it if not already present
     */
    static async getItemFromActor(actor, sourceId, addIfNotPresent = false) {
        let myItem = actor.items.find(item => item.getFlag("core", "sourceId") === sourceId);
        if (!myItem && addIfNotPresent) {
            const newItem = await this.getItem(sourceId);
            await actor.createEmbeddedDocuments("Item", [newItem]);
            myItem = await this.getItemFromActor(actor, sourceId);
        }
        return myItem;
    }

    /**
     * Get an effect currently on the actor with the specified source ID and target
     */
    static getEffectFromActor(actor, sourceId, targetId) {
        return actor.itemTypes.effect.find(effect =>
            effect.getFlag("core", "sourceId") === sourceId
            && effect.getFlag("pf2e-ranged-combat", "targetId") === targetId
        );
    }

    /**
     * Find the item with the given ID, and make a copy of it with a new ID
     */
    static async getItem(id) {
        const source = (await fromUuid(id)).toObject();
        source.flags.core ??= {};
        source.flags.core.sourceId = id;
        source._id = randomID();
        return source;
    }

    static setEffectTarget(effect, weapon) {
        effect.name = `${effect.name} (${weapon.name})`;
        effect.flags["pf2e-ranged-combat"] = {
            targetId: weapon.id
        };

        const rules = effect.data.rules;
        const indexOfEffectTarget = rules.findIndex(rule =>
            rule.key === "EffectTarget"
        );
        rules.splice(indexOfEffectTarget, 1);

        rules.forEach(rule =>
            rule.selector = rule.selector.replace("{item|data.target}", weapon.id)
        );
    }

    static async getSingleWeapon(weapons) {
        if (!weapons.length) {
            ui.notifications.info("You have no applicable weapons");
        } else if (weapons.length == 1) {
            return weapons[0];
        } else {
            let weapon = await WeaponSelectDialog.getWeapon(weapons);
            if (!weapon) {
                ui.notifications.warn("No weapon selected");
            }
            return weapon;
        }
    }


    /**
     * From the given dice size, find the next bigger one, capped at d12
     */
    static getNextDieSize(dieSize) {
        switch (dieSize) {
            case "d4":
                return "d6";
            case "d6":
                return "d8";
            case "d8":
                return "d10";
            case "d10":
                return "d12";
            case "d12":
                return "d12";
        }
    }
}