export function handleThrownWeapon(weapon, updates) {
    if (!game.settings.get("pf2e-ranged-combat", "advancedThrownWeaponSystemPlayer")) {
        return;
    }

    if (weapon.actor.type !== "character") {
        return;
    }

    // If the weapon is a consumable, then it gets destroyed on use.
    // The system handles reducing the quantity, but set it to worn instead of equipped 
    if (weapon.traits.has("consumable")) {
        setWeaponToWorn(weapon, updates);
    }

    // Thrown weapons aren't destroyed on use. We need to set it to dropped.
    // If there's more than one in the stack, then we want to set the current stack to worn
    // and make a new stack for the dropped weapon, or add to an existing dropped stack
    if (weapon.value.isRanged && Array.from(weapon.traits).some(trait => trait.startsWith("thrown"))) {
        // Do nothing if the weapon has a returning rune
        if (weapon.value.data.data.runes.property.includes("returning")) {
            return;
        }

        const quantity = weapon.value.quantity;

        // First, see if we have a stack of dropped weapons to add the thrown weapon to
        const droppedWeapon = getDroppedWeapon(weapon);
        if (droppedWeapon) {
            // Remove the thrown weapon from the original stack and, if the weapon must be
            // drawn to throw another, set the stack to worn
            reduceQuantity(weapon, updates);
            if (weapon.value.reload === "-") {
                setWeaponToWorn(weapon, updates);
            }

            // Add the thrown weapon to the stack of dropped weapons
            updates.update(() => {
                droppedWeapon.update({
                    "data.quantity": droppedWeapon.quantity + 1
                });
            });
        } else if (quantity === 1) {
            // We only have one of this weapon, and we don't have a dropped stack,
            // so just set this set to dropped
            setWeaponToDropped(weapon, updates);
        } else {
            // We don't have a dropped stack, and we have more than one weapon in this stack,
            // so create a new dropped stack.
            reduceQuantity(weapon, updates);
            if (weapon.value.reload === "-") {
                setWeaponToWorn(weapon, updates);
            }

            updates.update(async () => {
                // Make a copy of this item, with a quantity of one, dropped, and a flag to
                // say that this was created from dropped items in the original stack
                const weaponSource = weapon.value.toObject();
                const [ droppedWeapon ] = await weapon.actor.createEmbeddedDocuments(
                    "Item",
                    [
                        {
                            ...weaponSource,
                            name: `${weaponSource.name} (Dropped)`,
                            data: {
                                ...weaponSource.data,
                                quantity: 1
                            },
                            flags: {
                                ...weaponSource.flags,
                                "pf2e-ranged-combat": {
                                    droppedFrom: {
                                        id: weapon.id,
                                        name: weapon.name
                                    }
                                }
                            }
                        }
                    ]
                );

                // Items are automatically added worn, so we need to set it to dropped here
                droppedWeapon?.update({
                    "data.equipped.handsHeld": 0,
                    "data.equipped.carryType": "dropped"
                });
            });
        }
    }
}

function getDroppedWeapon(weapon) {
    return weapon.actor.itemTypes.weapon.find(w => w.data.flags["pf2e-ranged-combat"]?.droppedFrom?.id === weapon.id);
}

function setWeaponToWorn(weapon, updates) {
    if (weapon.value.data.data.equipped.carryType === "held") {
        updates.update(() => weapon.value.update({
            "data.equipped.handsHeld": 0,
            "data.equipped.carryType": "worn"
        }));
    }
}

function setWeaponToDropped(weapon, updates) {
    if (weapon.value.data.data.equipped.carryType === "held") {
        updates.update(() => weapon.value.update({
            "data.equipped.handsHeld": 0,
            "data.equipped.carryType": "dropped"
        }));
    }
}

function reduceQuantity(weapon, updates) {
    if (weapon.value.data.data.quantity > 0) {
        updates.update(() => weapon.value.update({
            "data.quantity": weapon.value.data.data.quantity - 1
        }));
    }
}
