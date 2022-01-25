class WeaponSelectDialog extends Dialog {
    weaponId;
    result;

    constructor(content) {
        super(
            {
                title: "Weapon Select",
                content: content,
                buttons: {
                }
            },
            {
                height: "100%",
                width: "100%",
                id: "weapon-dialog"
            }
        )
    }

    static async getWeapon(weapons) {
        let content = `
            <div class="weapon-buttons" style="max-width: max-content; justify-items: center; margin: auto;">
            <p>Select Weapon</p>
        `
        for (let weapon of weapons) {
            content += `
                <button class="weapon-button" type="button" value="${weapon._id}" style="display: flex; align-items: center; margin: 4px auto">
                    <img src="${weapon.img}" style="border: 1px solid #444; height: 1.6em; margin-right: 0.5em"/>
                    <span>${weapon.name}</span>
                </button>
            `
        }
        content += `</div>`
        let weaponId = await new this(content).getWeaponId();
        return weapons.filter(weapon => weapon._id === weaponId)[0];
    }

    activateListeners(html) {
        html.find(".weapon-button").click(this.clickWeaponButton.bind(this));
        super.activateListeners(html);
    }

    clickWeaponButton(event) {
        this.weaponId = event.currentTarget.value;
        this.close();
    }

    async close() {
        this.result?.(this.weaponId);
        await super.close();
    }

    async getWeaponId() {
        this.render(true);
        return new Promise(result => {
            this.result = result;
        });
    }
}

reload();

async function reload() {
    const RELOAD_ACTION_ONE_ID = "Compendium.pf2e-ranged-combat.actions.MAYuLJ4bsciOXiNM";
    const RELOAD_ACTION_TWO_ID = "Compendium.pf2e-ranged-combat.actions.lqjuYBOAjDb9ACfo";
    const LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.nEqdxZMAHlYVXI0Z";
    const CROSSBOW_ACE_FEAT_ID = "Compendium.pf2e.feats-srd.CpjN7v1QN8TQFcvI";
    const CROSSBOW_ACE_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.zP0vPd14V5OG9ZFv";
    const CROSSBOW_CRACK_SHOT_FEAT_ID = "Compendium.pf2e.feats-srd.s6h0xkdKf3gecLk6";
    const CROSSBOW_CRACK_SHOT_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.hG9i3aOBDZ9Bq9yi";

    const effectsToAdd = [];

    const myToken = getControlledToken();
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your assigned character must have one token")
        return;
    }

    let weapon = await getWeapon(myToken);
    if (!weapon) {
        return;
    }

    // Check if this weapon is already loaded
    const myLoadedEffect = myToken.actor.itemTypes.effect.find(effect =>
        effect.getFlag("core", "sourceId") === LOADED_EFFECT_ID
        && effect.getFlag("pf2e-ranged-combat", "weaponId") === weapon._id
    );
    if (myLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is already loaded`);
        return;
    }

    // If we don't already have it, add the reload action, and then post it
    const reloadActions = weapon.data.reload.value;
    const reloadActionId = (() => {
        switch (reloadActions) {
            case "1":
                return RELOAD_ACTION_ONE_ID;
            case "2":
                return RELOAD_ACTION_TWO_ID;
            default:
                return RELOAD_ACTION_ONE_ID;
        }
    })();
    const reloadAction = await getItem(reloadActionId);
    let myReloadAction = myToken.actor.itemTypes.action.find(action =>
        action.getFlag("core", "sourceId") === reloadActionId
    );
    if (!myReloadAction) {
        await myToken.actor.createEmbeddedDocuments("Item", [reloadAction]);
        myReloadAction = myToken.actor.itemTypes.action.find(action =>
            action.getFlag("core", "sourceId") === reloadActionId
        );
    }
    myReloadAction.toMessage();

    // Get the "Loaded" effect and set its target to the weapon we're reloading
    const loadedEffect = await getItem(LOADED_EFFECT_ID);
    setEffectTarget(loadedEffect, weapon);
    effectsToAdd.push(loadedEffect);

    // Handle crossbow effects that trigger on reload
    const weaponIsCrossbow = weapon.data.traits.otherTags.includes("crossbow");
    const weaponIsEquipped = weapon.data.equipped.value;
    if (weaponIsCrossbow && weaponIsEquipped) {
        const crossbowFeats = [
            {
                featId: CROSSBOW_ACE_FEAT_ID,
                effectId: CROSSBOW_ACE_EFFECT_ID
            },
            {
                featId: CROSSBOW_CRACK_SHOT_FEAT_ID,
                effectId: CROSSBOW_CRACK_SHOT_EFFECT_ID
            }
        ]

        for (const crossbowFeat of crossbowFeats) {
            const featId = crossbowFeat.featId;
            const effectId = crossbowFeat.effectId;

            const hasFeat = myToken.actor.itemTypes.feat.some(feat =>
                feat.data.flags.core.sourceId === featId
            );

            if (hasFeat) {
                // Remove any existing effects
                const existing = myToken.actor.itemTypes.effect.find(effect =>
                    effect.getFlag('core', 'sourceId') === effectId
                    && effect.getFlag("pf2e-ranged-combat", "weaponId") === weapon._id
                );
                if (existing) {
                    await existing.delete();
                }

                // Add the new effect
                const effect = await getItem(effectId);
                setEffectTarget(effect, weapon);

                // Until DamageDice "upgrade" is in the system, we have to hack it
                const damageDieRule = effect.data.rules.find(rule => rule.key === "DamageDice");
                damageDieRule.override.dieSize = getNextDieSize(weapon.data.damage.die);

                effectsToAdd.push(effect);
            }
        }
    }

    myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getControlledToken() {
    return [canvas.tokens.controlled, game.user.character?.getActiveTokens()]
        .filter(tokens => !!tokens)
        .find(tokens => tokens.length === 1)
        ?.[0];
}

async function getWeapon(token) {
    let weapons = token.actor.itemTypes.weapon.map(weapon => weapon.data).filter(weapon => weapon.data.reload.value > 0);
    if (!weapons.length) {
        ui.notifications.info(`You have no ranged weapons equipped`);
    } else if (weapons.length == 1) {
        return weapons[0];
    } else {
        return chooseWeapon(weapons);
    }
}

async function chooseWeapon(weapons) {
    let weapon = await WeaponSelectDialog.getWeapon(weapons);
    if (!weapon) {
        ui.notifications.warn("No weapon selected");
    }
    return weapon;
}

async function getItem(id) {
    const source = (await fromUuid(id)).toObject();
    source.flags.core ??= {};
    source.flags.core.sourceId = id;
    source._id = randomID();
    return source;
}

function setEffectTarget(effect, weapon) {
    effect.name = `${effect.name} (${weapon.name})`;
    effect.flags["pf2e-ranged-combat"] = {
        weaponId: weapon._id
    };
    
    const rules = effect.data.rules;
    const indexOfEffectTarget = rules.findIndex(rule =>
        rule.key === "EffectTarget"
    );
    rules.splice(indexOfEffectTarget, 1);

    rules.forEach(rule =>
        rule.selector = rule.selector.replace("{item|data.target}", weapon._id)
    );
}

function getNextDieSize(dieSize) {
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