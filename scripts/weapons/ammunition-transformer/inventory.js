import { Ammunition, InventoryAmmunition } from "../types.js";

export class InventoryAmmunitionTransformer {
    /**
     * @param {Ammunition} ammunition 
     * @returns {InventoryAmmunition}
     */
    static transform(ammunition) {
        const inventoryAmmunition = new InventoryAmmunition();
        ammunition.copyData(inventoryAmmunition);

        return inventoryAmmunition;
    }
}
