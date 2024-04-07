export function disableAmmoConsumption(strike) {
    strike.variants = strike.variants.map(
        variant => {
            return {
                ...variant,
                roll: params => {
                    params.consumeAmmo = false;
                    return variant.roll(params);
                }
            };
        }
    );

    strike.attack = strike.roll = strike.variants[0].roll;
}
