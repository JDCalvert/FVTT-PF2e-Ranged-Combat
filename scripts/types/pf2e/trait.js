export class PF2eTrait {
    /** @type string */
    name;

    /** @type string */
    description;

    /** @type string */
    label;
}

/** @type Map<string, PF2eTrait> */
export const traits = new Map();

export function initialiseTraits() {
    traits.set(
        "concentrate",
        {
            name: "concentrate",
            label: "PF2E.TraitConcentrate",
            description: game.i18n.localize("PF2E.TraitDescriptionConcentrate")
        }
    );

    traits.set(
        "magical",
        {
            name: "magical",
            label: "PF2E.TraitMagical",
            description: game.i18n.localize("PF2E.TraitDescriptionMagical")
        }
    );

    traits.set(
        "manipulate",
        {
            name: "manipulate",
            label: "PF2E.TraitManipulate",
            description: game.i18n.localize("PF2E.TraitDescriptionManipulate")
        }
    );

    traits.set(
        "visual",
        {
            name: "visual",
            label: "PF2E.TraitVisual",
            description: game.i18n.localize("PF2E.TraitDescriptionVisual")
        }
    );
}
