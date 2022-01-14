/**
 * Macro to determine the range penalty to be applied based on the distance from the controlled token
 * and the targeted token. Note that you must have exactly one controlled token (or one token of your
 * assigned character in the scene) and one targetted token to calculate the range penalty.
 * 
 * If you have any ranged penalties already applied, they will be removed first.
 * 
 * The effect applied to your token is modified to only affect the selected ranged strike. If you have
 * more than one ranged strike ready, you will be presented with a choice.
 */

/**
 * Custom Dialog that shows a button for each available ranged strike
 */
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

calculateRangeIncrement();

async function calculateRangeIncrement() {
    const rangeIncrements = {
        2: { desc: "second", itemId: "Compendium.pf2e-ranged-combat.effects.dU7RDqMpPUQKhUK8" },
        3: { desc: "third", itemId: "Compendium.pf2e-ranged-combat.effects.TAL4IhfswaglWGRg" },
        4: { desc: "fourth", itemId: "Compendium.pf2e-ranged-combat.effects.4xqB3op2Gmy72civ" },
        5: { desc: "fifth", itemId: "Compendium.pf2e-ranged-combat.effects.P0XsocGrdldNL3Ml" },
        6: { desc: "sixth", itemId: "Compendium.pf2e-ranged-combat.effects.sqBuYhfwzyotmbBG" }
    };

    // Find the currently controlled token, if there is one
    const myToken = getControlledToken();
    if (!myToken) {
        return;
    }

    // Remove any range increment effects already on the token
    let hasRemovedExistingEffect = false;
    for (let key = 2; key <= 6; key++) {
        let rangeIncrementId = rangeIncrements[key];
        const existing = myToken.actor.itemTypes.effect.find((effect) =>
            effect.getFlag('pf2e-ranged-combat', 'sourceId') === rangeIncrementId.itemId
        );
        if (existing) {
            existing.delete();
            hasRemovedExistingEffect = true;
        }
    }

    // Find the currently targetted token, if there is one
    const targetToken = getTarget(hasRemovedExistingEffect);
    if (!targetToken) {
        return;
    }

    // Find the weapon to apply the penalty to
    let weapon = await getWeapon(myToken);
    if (!weapon) {
        return;
    }

    // Calculate the distance between the controlled and targetted tokens, measured on the grid, and then
    // which range increment of the weapon the target is in
    const distance = canvas.grid.measureDistance(myToken.center, targetToken.center, { gridSpaces: true });
    const rangeIncrement = Math.ceil(distance / weapon.data.range);

    if (rangeIncrement < 2) {
        ui.notifications.info(`Attack from ${myToken.name} to ${targetToken.name} is ${distance} ft, using ${weapon.name} with range increment ${weapon.data.range} ft. Attack is in the first range increment`);
        return;
    } else if (rangeIncrement > 6) {
        ui.notifications.error(`Attack from ${myToken.name} to ${targetToken.name} is ${distance} ft, using ${weapon.name} with range increment ${weapon.data.range} ft. Attack is past the sixth range increment and cannot be made`);
        return;
    }

    let rangeIncrementId = rangeIncrements[rangeIncrement];
    const rangeIncrementEffect = await getItem(rangeIncrementId.itemId);
    rangeIncrementEffect.data.rules[0].selector = `${weapon._id}-attack`;
    rangeIncrementEffect.name = `${rangeIncrementEffect.name} (${weapon.name})`;

    ui.notifications.info(`Attack from ${myToken.name} to ${targetToken.name} is ${distance} ft, using ${weapon.name} with range increment ${weapon.data.range} ft. Attack is in the ${rangeIncrementId.desc} range increment`);

    await myToken.actor.createEmbeddedDocuments('Item', [rangeIncrementEffect]);
}

function getControlledToken() {
    const myTokens = canvas.tokens.controlled;
    if (!myTokens.length) {
        let myCharacter = game.user.character;
        if (game.user.character) {
            let userTokens = myCharacter.getActiveTokens();
            if (!userTokens.length) {
                ui.notifications.warn("No token selected");
                return;
            } else if (userTokens.length > 1) {
                ui.notifications.warn("More than one current character token");
                return;
            } else {
                return userTokens[0];
            }
        } else {
            ui.notifications.warn("No token selected");
            return;
        }
    } else if (myTokens.length > 1) {
        ui.notifications.warn("You must have only one token selected");
        return;
    } else {
        let myToken = myTokens[0];
        if (!["character", "npc"].includes(myToken.actor.type)) {
            ui.notifications.warn("You must have a character selected");
            return;
        }
        return myToken;
    }
}

/**
 * Try to find exactly one targetted token
 * 
 * @param {boolean} hasRemovedExistingEffect If we've removed an existing effect, don't give a warning
 *                                           about no targetted token, just exit silently.
 * @returns The currently targetted token, if there is exactly one
 */
function getTarget(hasRemovedExistingEffect) {
    const targetTokenIds = game.user.targets.ids;
    const targetTokens = canvas.tokens.placeables.filter(token => targetTokenIds.includes(token.id));
    if (!targetTokens.length) {
        if (!hasRemovedExistingEffect) {
            ui.notifications.warn("No target selected");
        }
    } else if (targetTokens.length > 1) {
        if (!hasRemovedExistingEffect) {
            ui.notifications.warn("You must have only one target selected");
        }
    } else {
        return targetTokens[0];
    }
}

async function getWeapon(token) {
    let weapons;

    let strikes = token.actor.data.data.actions.filter(action => action.type === "strike");
    if (token.actor.type == "character") {
        // Characters' strikes, even thos granted by feats, all have weapon data associated with them, so we can find any associated with ranged weapons
        weapons = strikes.filter(action => action.ready).map(action => action.weapon.data).filter(weapon => weapon.data.range);
    } else if (token.actor.type == "npc") {
        // NPCs' strikes don't have weapon data, but ranged options will have a range-increment-x trait
        // Coerce the data to have everything we need, with the same structure as a PC's weapon data
        weapons = strikes.filter(action => action.traits.filter(trait => trait.name.startsWith("range-increment-")).length).map(strike => {
            return {
                _id: strike.sourceId,
                name: strike.name,
                img: strike.imageUrl,
                data: {
                    range: strike.traits.filter(trait => trait.name.startsWith("range-increment-"))[0].name.slice(16)
                }
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

async function getItem(id) {
    const source = (await fromUuid(id)).toObject();
    source.flags["pf2e-ranged-combat"] = {
        sourceId: id
    };
    return source;
}