## 2.0.1 - 2022-01-30
- Fix bug preventing NPCs from reloading
- Fix bug stopping the "Reload All" macro from working

## 2.0.0 - 2022-01-30
- Remove range increment calculation macros and effects (implemented in Pathfinder 2e system)
- Refactor macros into scripts - future updates will not require macro re-import
- Add useful chat messages for running macros
- Automatically remove "loaded" effect on firing a weapon
- (Optional) Prevent firing an unloaded weapon

## 1.2.1 - 2022-01-25
- Fix issue with Reload and Hunt Prey macros duplicating effects

## 1.2.0 - 2022-01-25
- Add to actions compendium with one- and two-action reload versions
- Add item-targeted effects for Crossbow Ace and Crossbow Crack Shot
- Improved Reload macro to apply Crossbow Ace and Crossbow Crack Shot effects, and check if weapon is already loaded
- Add Hunted Prey effect to track which target is hunted
- Add Hunt Prey macro which applies the Hunted Prey effect for selected target, and applies Crossbow Ace effect for equipped crossbows
- Automate enabling/disabling "Hunted Prey" toggle based on current hunted prey and targeted token

## 1.1.0 - 2022-01-24
- Add Reload macro to apply the "Loaded" effect for a particular weapon
- Add actions compendium with Reload action
- Update range calculation to take into account large and larger creatures

## 1.0.0 - 2022-01-14
- Add compendia for range penalty effects and macros to automatically calculate which to use
