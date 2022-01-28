import { PF2eRangedCombat } from "../utils.js";

const rangeIncrements = {
    2: { desc: "second", itemId: "Compendium.pf2e-ranged-combat.effects.dU7RDqMpPUQKhUK8" },
    3: { desc: "third", itemId: "Compendium.pf2e-ranged-combat.effects.TAL4IhfswaglWGRg" },
    4: { desc: "fourth", itemId: "Compendium.pf2e-ranged-combat.effects.4xqB3op2Gmy72civ" },
    5: { desc: "fifth", itemId: "Compendium.pf2e-ranged-combat.effects.P0XsocGrdldNL3Ml" },
    6: { desc: "sixth", itemId: "Compendium.pf2e-ranged-combat.effects.sqBuYhfwzyotmbBG" }
};

export async function calculateRangeIncrements() {
    const details = await gatherDetails();
    if (!details) {
        return;
    }
    const { myToken, targetToken, weapons, distance } = details;

    const effectsToAdd = [];

    for (const weapon of weapons) {
        const rangeIncrement = Math.ceil(distance / weapon.rangeIncrement);
        if (rangeIncrement < 2) {
            continue;
        } else if (rangeIncrement > 6) {
            continue;
        }

        effectsToAdd.push(buildRangeIncrementEffect(weapon, rangeIncrement, effectsToAdd));
    }

    myToken.actor.createEmbeddedDocuments('Item', await Promise.all(effectsToAdd));

    ui.notifications.info(`Calculated range increments for attack from ${myToken.name} to ${targetToken.name} (${distance} ft.)`);
}

export async function calculateRangeIncrement() {
    const details = await gatherDetails();
    if (!details) {
        return;
    }
    const { myToken, targetToken, weapons, distance } = details;

    const weapon = await PF2eRangedCombat.getSingleWeapon(weapons);
    if (!weapon) {
        return;
    }

    const rangeIncrement = Math.ceil(distance / weapon.rangeIncrement);
    const notificationPrefix = `Attack from ${myToken.name} to ${targetToken.name} is ${distance} ft, using ${weapon.name} with range increment ${weapon.rangeIncrement} ft.`;
    if (rangeIncrement < 2) {
        ui.notifications.info(`${notificationPrefix} is in the first range increment`);
        return;
    } else if (rangeIncrement > 6) {
        ui.notifications.error(`${notificationPrefix} is past the sixth range increment and cannot be made`);
        return;
    }

    ui.notifications.info(`${notificationPrefix} is in the ${rangeIncrements[rangeIncrement].desc} range increment`);

    const rangeIncrementEffect = await buildRangeIncrementEffect(weapon, rangeIncrement);
    await myToken.actor.createEmbeddedDocuments('Item', [rangeIncrementEffect]);
}

async function gatherDetails() {
    const myToken = PF2eRangedCombat.getControlledToken();
    if (!myToken) {
        ui.notifications.warn("You must have exactly one token selected, or your character must have one token");
        return;
    }

    // Remove any range increment effects already on the token
    let hasRemovedExistingEffect = false;
    const effectsToDelete = [];
    for (let key = 2; key <= 6; key++) {
        let rangeIncrementId = rangeIncrements[key];
        const rangeIncrementEffects = myToken.actor.itemTypes.effect.filter(effect => effect.getFlag("core", "sourceId") === rangeIncrementId.itemId);
        for (const rangeIncrementEffect of rangeIncrementEffects) {
            effectsToDelete.push(rangeIncrementEffect.delete());
            hasRemovedExistingEffect = true;
        }
    }

    // Find the currently targeted token, if there is one
    const targetToken = PF2eRangedCombat.getTarget(!hasRemovedExistingEffect);
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

    const distance = canvas.grid.measureDistance({ x: 0, y: 0 }, { x: dx, y: dy }, { gridSpaces: true });

    await Promise.all(effectsToDelete);

    return {
        myToken,
        targetToken,
        weapons,
        distance
    };
}

function getRangedWeapons(token) {
    let weapons;

    let strikes = token.actor.data.data.actions.filter(action => action.type === "strike");
    if (token.actor.type == "character") {
        // Characters' strikes, even those granted by feats, all have weapon data associated with them, so we can find any associated with ranged weapons
        weapons = strikes
            .filter(strike => strike.ready && strike.weapon.isRanged)
            .map(strike => {
                return {
                    id: strike.weapon.data._id,
                    name: strike.name,
                    img: strike.weapon.img,
                    rangeIncrement: strike.weapon.data.data.range
                }
            });
    } else if (token.actor.type == "npc") {
        // NPCs' strikes don't have weapon data, but ranged options will have a range-increment-x trait
        // Coerce the data to have everything we need, with the same structure as a PC's weapon data
        weapons = strikes
            .filter(action => action.traits.some(trait => trait.name.startsWith("range-increment-")))
            .map(strike => {
                return {
                    id: strike.sourceId,
                    name: strike.name,
                    img: strike.imageUrl,
                    rangeIncrement: strike.traits.find(trait => trait.name.startsWith("range-increment-")).name.slice("range-increment-".length)
                }
            });
    }

    if (!weapons.length) {
        ui.notifications.info("You have no ranged weapons equipped.");
    }
    return weapons;
}

async function buildRangeIncrementEffect(weapon, rangeIncrement) {
    let rangeIncrementId = rangeIncrements[rangeIncrement];
    const rangeIncrementEffect = await PF2eRangedCombat.getItem(rangeIncrementId.itemId);
    rangeIncrementEffect.data.rules[0].selector = `${weapon.id}-attack`;
    rangeIncrementEffect.name = `${rangeIncrementEffect.name} (${weapon.name})`;

    return rangeIncrementEffect;
}