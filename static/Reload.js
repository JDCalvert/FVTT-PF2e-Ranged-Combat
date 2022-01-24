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
            <p>Select Strike Weapon</p>
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
    const LOADED_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.nEqdxZMAHlYVXI0Z";

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

    // Get the "Loaded" effect and change its name
    const loadedEffect = await getItem(LOADED_EFFECT_ID);
    setEffectTarget(loadedEffect, weapon.name);

    effectsToAdd.push(loadedEffect);

    myToken.actor.createEmbeddedDocuments("Item", effectsToAdd);
}

function getControlledToken() {
    return [canvas.tokens.controlled, game.user.character?.getActiveTokens()]
        .filter(tokens => !!tokens)
        .find(tokens => tokens.length === 1)
        ?.[0];
}

async function getWeapon(token) {
    let weapons = token.actor.itemTypes.weapon.map(weapon => weapon.data).filter(weapon => weapon.data.reload.value);
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

function setEffectTarget(effect, targetName) {
    effect.name = `${effect.name} (${targetName})`;
    const rules = effect.data.rules;
    const indexOfEffectTarget = rules.findIndex(rule =>
        rule.key === "EffectTarget"
    );
    rules.splice(indexOfEffectTarget, 1);
}
