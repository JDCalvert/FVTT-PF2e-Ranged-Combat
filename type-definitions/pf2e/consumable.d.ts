class ConsumablePF2e extends ItemPF2e {
    type: string = "consumable";
    system: ConsumablePF2eSystem;

    isAmmo: boolean; // Only for pre-v13
    
    isAmmoFor(weapon: WeaponPF2e): boolean;
}

class ConsumablePF2eSystem extends ItemPF2eSystem {

}
