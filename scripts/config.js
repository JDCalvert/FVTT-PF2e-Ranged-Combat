import { reload } from "./actions/reload.js";
import { huntPrey } from "./actions/hunt-prey.js";
import { calculateRangeIncrement, calculateRangeIncrements } from "./actions/calculate-range-increments.js";

Hooks.on(
    "init",
    () => {
        game.settings.register(
            "pf2e-ranged-combat",
            "preventFireNotLoaded",
            {
                name: "Prevent Firing Weapon if not Loaded",
                hint: "For weapons with a reload of at least 1, prevent attack rolls using that weapon unless you have the loaded effect for that weapon",
                scope: "world",
                config: true,
                type: Boolean,
                default: true
            }
        );

        game.pf2eRangedCombat = {
            reload,
            huntPrey,
            calculateRangeIncrement, 
            calculateRangeIncrements
        };
    }
);
