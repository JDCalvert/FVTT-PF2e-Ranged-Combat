class AmmoPF2e extends ItemPF2e {
    type: string = "ammo";
    system: AmmoPF2eSystem;

    isAmmoFor(weapon: WeaponPF2e): boolean
}

class AmmoPF2eSystem extends ItemPF2eSystem {
}
