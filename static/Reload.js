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
                <button class="weapon-button" type="button" value="${weapon.id}" style="display: flex; align-items: center; margin: 4px auto">
                    <img src="${weapon.img}" style="border: 1px solid #444; height: 1.6em; margin-right: 0.5em"/>
                    <span>${weapon.name}</span>
                </button>
            `
        }
        content += `</div>`
        let weaponId = await new this(content).getWeaponId();
        return weapons.filter(weapon => weapon.id === weaponId)[0];
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
    const myLoadedEffect = PF2eRangedCombat.getEffectFromActor(myToken, PF2eRangedCombat.LOADED_EFFECT_ID, weapon.id);
    if (myLoadedEffect) {
        ui.notifications.warn(`${weapon.name} is already loaded`);
        return;
    }

    // If we don't already have it, add the reload action, and then post it
    const reloadActions = weapon.reload;
    const reloadActionId = (() => {
        switch (reloadActions) {
            case 1:
                return PF2eRangedCombat.RELOAD_ACTION_ONE_ID;
            case 2:
                return PF2eRangedCombat.RELOAD_ACTION_TWO_ID;
            case 3:
                return PF2eRangedCombat.RELOAD_ACTION_THREE_ID;
            default:
                return PF2eRangedCombat.RELOAD_ACTION_EXPLORE_ID;
        }
    })();
    const myReloadAction = await PF2eRangedCombat.getItemFromActor(myToken, reloadActionId, true);
    myReloadAction.toMessage();

    // Get the "Loaded" effect and set its target to the weapon we're reloading
    const loadedEffect = await getItem(PF2eRangedCombat.LOADED_EFFECT_ID);
    setEffectTarget(loadedEffect, weapon);
    effectsToAdd.push(loadedEffect);

    // Handle crossbow effects that trigger on reload
    if (weapon.isCrossbow && weapon.isEquipped) {
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

            if (actorHasItem(myToken, featId)) {
                // Remove any existing effects
                const existing = PF2eRangedCombat.getEffectFromActor(myToken, effectId, weapon.id);
                if (existing) await existing.delete();

                // Add the new effect
                const effect = await getItem(effectId);
                setEffectTarget(effect, weapon);

                // Until DamageDice "upgrade" is in the system, we have to hack it
                const damageDieRule = effect.data.rules.find(rule => rule.key === "DamageDice");
                damageDieRule.override.dieSize = getNextDieSize(weapon.damageDie);

                effectsToAdd.push(effect);
            }
        }
    }

    await myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getControlledToken() {
    return [canvas.tokens.controlled, game.user.character?.getActiveTokens()]
        .filter(tokens => !!tokens)
        .find(tokens => tokens.length === 1)
        ?.[0];
}

async function getWeapon(token) {
    let weapons;
    if (token.actor.type === "character") {
        weapons = token.actor.itemTypes.weapon
            .filter(weapon => PF2eRangedCombat.requiresLoading(weapon))
            .map(weapon => {
                return {
                    id: weapon.data._id,
                    name: weapon.data.name,
                    img: weapon.data.img,
                    damageDie: weapon.data.data.damage.die,
                    reload: PF2eRangedCombat.getReloadTime(weapon),
                    isEquipped: weapon.data.data.equipped.value,
                    isCrossbow: weapon.data.data.traits.otherTags.includes("crossbow")
                }
            });
    } else if (token.actor.type === "npc") {
        weapons = token.actor.itemTypes.melee
            .filter(weapon => PF2eRangedCombat.requiredLoading(weapon))
            .map(weapon => {
                return {
                    id: weapon.data._id,
                    name: weapon.data.name,
                    img: weapon.data.img,
                    reload: PF2eRangedCombat.getReloadTime(weapon),
                    isEquipped: true,
                    isCrossbow: false
                }
            });
    }

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

function actorHasItem(token, sourceId) {
    return token.actor.items.some(item => item.getFlag("core", "sourceId") === sourceId);
}

function setEffectTarget(effect, weapon) {
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
