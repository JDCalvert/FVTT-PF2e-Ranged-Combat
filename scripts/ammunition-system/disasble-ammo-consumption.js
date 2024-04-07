export function disableAmmoConsumption(strike) {
    const newVariants = strike.variants.map(variant => {
        return {
            ...variant,
            roll: (...args) => {
                return variant.roll(...[{ ...(args[0]), consumeAmmo: false}, args.slice(1)]);
            }
        };
    });
    strike.variants = newVariants;
    strike.attack = strike.roll = strike.variants[0].roll;
}
