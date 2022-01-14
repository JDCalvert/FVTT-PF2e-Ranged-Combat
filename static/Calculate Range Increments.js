/**
 * Macro to determine the range penalties to be applied based on the distance bwtween the controlled
 * token and the targeted token. Note that you must have exactly one controlled token (or one token
 * of your assigned character in the scene) and one targetted token to calculate the range penalties.
 * 
 * If you already have any ranged penalties already applied, they will be removed first.
 * 
 * The effect applied to your token is modified to only affect the relevant strike. If you have
 * more than one ranged strike ready, you will gain the effect for each strike separately.
 */
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
    let weapons = getWeapons(myToken);
    if (!weapons.length) {
        return;
    }

    // Calculate the distance between the controlled and targetted tokens, measured on the grid, and then
    // which range increment of the weapon the target is in
    const distance = canvas.grid.measureDistance(myToken.center, targetToken.center, { gridSpaces: true });

    for (weapon of weapons) {
        const rangeIncrement = Math.ceil(distance / weapon.data.range);

        if (rangeIncrement < 2) {
            continue;
        } else if (rangeIncrement > 6) {
            continue;
        }

        let rangeIncrementId = rangeIncrements[rangeIncrement];
        const rangeIncrementEffect = await getItem(rangeIncrementId.itemId);
        rangeIncrementEffect.data.rules[0].selector = `${weapon._id}-attack`;
        rangeIncrementEffect.name = `${rangeIncrementEffect.name} (${weapon.name})`;

        myToken.actor.createEmbeddedDocuments('Item', [rangeIncrementEffect]);
    }

    ui.notifications.info(`Calculated range increments for attack from ${myToken.name} to ${targetToken.name} (${distance} ft.)`);
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

function getWeapons(token) {
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
        return [];
    } else {
        return weapons;
    }
}

async function getItem(id) {
    const source = (await fromUuid(id)).toObject();
    source.flags["pf2e-ranged-combat"] = {
        sourceId: id
    };
    return source;
}
