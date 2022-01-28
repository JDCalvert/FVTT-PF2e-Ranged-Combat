/**
 * Macro to determine the range penalties to be applied based on the distance bwtween the controlled
 * token and the targeted token. Note that you must have exactly one controlled token (or one token
 * of your assigned character in the scene) and one targeted token to calculate the range penalties.
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

    // Find the currently targeted token, if there is one
    const targetToken = getTarget(hasRemovedExistingEffect);
    if (!targetToken) {
        return;
    }

    // Find the weapon to apply the penalty to
    let weapons = getRangedWeapons(myToken);
    if (!weapons.length) {
        return;
    }

    // Calculate the distance between the controlled and targeted tokens, measured on the grid, and then
    // which range increment of the weapon the target is in
    const gridSize = canvas.dimensions.size;
    const dx = Math.max(0, myToken.x - (targetToken.x + targetToken.w - gridSize), targetToken.x - (myToken.x + myToken.w - gridSize));
    const dy = Math.max(0, myToken.y - (targetToken.y + targetToken.h - gridSize), targetToken.y - (myToken.y + myToken.h - gridSize));

    const distance = canvas.grid.measureDistance({x: 0, y: 0}, {x: dx, y: dy}, { gridSpaces: true });

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



async function getItem(id) {
    const source = (await fromUuid(id)).toObject();
    source.flags["pf2e-ranged-combat"] = {
        sourceId: id
    };
    return source;
}
