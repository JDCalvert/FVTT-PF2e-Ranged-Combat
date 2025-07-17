## 7.3.0 (Pathfinder 2e 7.2.3)
### Feature
- Add Jammed effect to represent a firearm which has misfired.
- Add automation for Risky Reload.
- Add option to actually fire the weapon when using the Fake Out feat.

## 7.2.2 - 2025-07-07 (Pathfinder 2e 7.2.2)
### Fix
- Fix issue with the Item Select Dialog.

## 7.2.1 - 2025-07-05 (Pathfinder 2e 7.2.2)
### Under the Hood
- Refactored Item Select Dialog into library module.

## 7.2.0 - 2025-06-27 (Pathfinder 2e 7.2.1)
### Feature
- Re-enabled compatibility with Foundry v12.

## 7.1.0 - 2025-06-26 (Pathfinder 2e 7.2.1)
### Feature
- Add automation for Hunt Prey on NPCs.

## 7.0.3 - 2025-06-23 (Pathfinder 2e 7.2.0)
### Fix
- Fix NPC weapon configuration dialog that was broken on the move to ApplicationV2.

## 7.0.2 - 2025-06-23 (Pathfinder 2e 7.2.0)
### Fix (System API Change)
- Fixed PF2eWeapon's `ammoRequired` function being replaced with `system.expend`.
- Reworked ammunition effects:
  - On-hit effects apply.
  - Damage effects should apply when using automatic damage rolling from PF2e Workbench.
- Updated translations from Weblate (#218).

## 7.0.1 - 2025-06-13 (Pathfinder 2e 7.1.1)
### Fix
- Update dialogs to ApplicationV2.

## 7.0.0 - 2025-06-12 (Pathfinder 2e 7.1.1)
### Feature
- Confirm basic functionality compatible with Foundry v13.

### Fix
- Move away from jQuery where possible.
- Updated Polish translation.

### Still to do
- Convert dialogs to DialogV2.

## 6.3.10 - 2025-02-10 (Pathfinder 2e 6.9.0)
### Fix
- Fix some Hunt Prey bonuses not working correctly.
- Fix uses of deprecated functions and constants.

## 6.3.9 - 2025-02-10 (Pathfinder 2e 6.9.0)
### Fix
- Update Hunt Prey automation to use TokenMarks.

## 6.3.8 - 2025-02-05 (Pathfinder 2e 6.8.5)
### Fix
- Fix ranger's animal companions' attack number label. (#207)
- Update the "loaded" effect image to match the loaded ammunition's image.
- Revert Hunt Prey automation to original method.

## 6.3.7 - 2024-11-11 (Pathfinder 2e 5.16.1/6.6.2)
### Fix
- Split "Prevent Firing without Ammunition" setting into Player and NPC settings.

## 6.3.6 - 2024-11-10 (Pathfinder 2e 5.16.1/6.6.2)
### Fix
- Update French translation.
- Update Polish translation.
- Add German translation.
- Add action roll option to Fake Out.
- Fix loaded requirement of Fake Out to include repeating weapons.
- Fix Alchemical Crossbow to use bomb slug instead of name for "lesser" check.

## 6.3.5 - 2024-08-04 (Pathfinder 2e 5.16.1/6.2.0)
### Fix
- Respect rolling with consumeAmmo set to false.

## 6.3.4 - 2024-07-03 (Pathfinder 2e 5.16.1/6.0.4)
### Fix
- Moved ammunition information from effect names to the description.

## 6.3.3 - 2024-07-02 (Pathfinder 2e 5.16.1/6.0.4)
- Update translations.
- Reorganise settings into categories.

## 6.3.2 - 2024-06-30 (Pathfinder 2e 5.16.1/6.0.4)
### Fix
- Fix issues with applying effects.

## 6.3.1 - 2024-06-28 (Pathfinder 2e 5.16.1/6.0.4)
### Fix
- Fix warnings about ammunition effects displaying incorrectly.

## 6.3.0 - 2024-06-28 (Pathfinder 2e 5.16.1)
### Features
- Rewrite Hunt Prey automation.
- Add traits to action messages.

### Fix
- Conjure Round auxiliary option will no longer appear on melee weapons.

## 6.2.2 - 2024-06-19 (Pathfinder 2e 5.16.1/6.0.3)
### Fix
- Add option to disable the module's ammunition effects and revert to the system's implementation.
- Add warnings for ammunition effects when weapon ammunition does not match ammunition effect.

## 6.2.1 - 2024-06-16 (Pathfinder 2e 5.16.1/6.0.1)
### Fix
- Fix errors posting some messages.
- Fix some ammunition effects not applying correctly.

## 6.2.0 - 2024-06-16 (Pathfinder 2e 5.16.1/6.0.1)
### Feature
- Add automation to the Fake Out Gunslinger feat.

### Fix
- Fix warnings starting the server due to missing author.

## 6.1.0 - 2024-06-14 (Pathfinder 2e 5.16.1/6.0.1)
### Feature
- Add automation to the Sword and Pistol Gunslinger feat.

## 6.0.2 - 2024-06-13 (Pathfinder 2e 5.16.1/6.0.1)
### Fix
- Fix instances where Hunt Prey messages could be posted twice.
- Trigger Alchemical Shot on posting the action to chat, and remove the effect after a damage roll.

## 6.0.1 - 2024-06-11 (Pathfinder 2e 5.16.1/6.0.1)
### Fix
- Updated Polish translation (thanks to Liohart).
- Verified backwards-compatibility with Foundry v11 and PF2e v5.

## 6.0.0 - 2024-06-10 (Pathfinder 2e 6.0.1)
### Features
- Compatibility with Foundry v12 and Pathfinder 2e v6.

## 5.3.1 - 2024-06-09 (Pathfinder 2e 5.16.1)
### Feature
- Allow selecting Hunted Prey by posting the action from the character sheet.

## 5.3.0 - 2024-06-07 (Pathfinder 2e 5.16.1)
### Feature
- Reintroduced ammunition effects, replacing the system effects, so the correct effect is applied even if ammunition is changed after loading.
- Update and improve Crossbow Crack Shot automation.

## 5.2.1 - 2024-06-02 (Pathfinder 2e 5.16.1)
### Fixes
- Fix failing to post messages about using ammunition.

## 5.2.0 - 2024-06-01 (Pathfinder 2e 5.16.1)
### Features
- Add more options to control chat message generation.
- Add Conjure Bullet to auxiliary actions.

## 5.1.5 - 2024-04-07 (Pathfinder 2e 5.15.0)
### Fix
- Allow firing the last piece of ammunition.

## 5.1.4 - 2024-03-17 (Pathfinder 2e 5.14.4)
### Fix
- Fix visual error displaying traits when using auxiliary actions.
- Fix action glyth not displaying when reloading.

## 5.1.3 - 2024-03-13 (Pathfinder 2e 5.14.3)
### Fix
- Restore automatically enabling the hunted prey toggle when choosing a hunted prey for flurry rangers.

## 5.1.2 - 2024-03-12 (Pathfinder 2e 5.14.3)
### Fix
- Fix for PF2eWeapon `requiresAmmo` function name change to `ammoRequired` causing all ammunition handling to be skipped.

### Remove
- Removed macro and effect for firing both barrels of a double-barrelled weapon, as this has been added to the system.

## 5.1.1 - 2024-02-19 (Pathfinder 2e 5.13.6)
### Minor Feature
- Skip using ammunition if the actor has the "skip-use-ammunition" roll option.
- Update Polish translation.

## 5.1.0 - 2024-02-14 (Pathfinder 2e 5.13.6)
### Feature
- Add buttons to equipped weapons with linked stacks to draw or pick up an item from those linked stacks.

### Fix
- Fix disabling the precision damage after the first damage instance per turn.

## 5.0.0 - 2024-02-07 (Pathfinder 2e 5.13.3)
### Feature
- Added the Link Companion macro, which allows you to link a ranger's animal companion to share your Hunt Prey benefits.
- Rewrote the hunt prey code to more gracefully handle targetting your hunted prey and automatically apply the precision edge damage.

## 4.2.3 - 2024-01-31 (Pathfinder 2e 5.13.0)
### Fix
- Fix libwrapper hook for `adjustCarryType` changing to `changeCarryType` in the system.

## 4.2.2 - 2024-01-27 (Pathfinder 2e 5.12.7)
### Fix
- Fix reloading actors with advanced ammunition system disabled.

## 4.2.1 - 2024-01-21 (Pathfinder 2e 5.12.7)
### Fix
- Only apply Crossbow Ace effect if the legacy Crossbow Ace feat is being used.

## 4.2.0 - 2024-01-20 (Pathfinder 2e 5.12.7)
### Features
- Add actions inside character sheets to reload, unload, reload magazine, and switch to next chamber.
- Updated Polish translations.

### Fixes
- Fix being able to use weapons as ammunition.

## 4.1.2 - 2024-01-07 (Pathfinder 2e 5.12.1)
### Fix
- Fixed checks for crossbow-type weapons to use the weapon group instead of additional tags

## 4.1.1 - 2023-12-26 (Pathfinder 2e 5.11.5)
### Fix
- Fixed advanced thrown weapon system error when creating stack when a token is targeted

## 4.1.0 - 2023-12-22 (Pathfinder 2e 5.11.5)
### Feature
- Add new Fully Reload macro to fully reload a capacity weapon

## 4.0.11 - 2023-12-18 (Pathfinder 2e 5.11.5)
### Fixes
- Fixed bad import causing a lot of functions to fail

## 4.0.10 - 2023-12-16 (Pathfinder 2e 5.11.3)
### Fixes
- Fixed use of ammunition `isAmmunition` to `isAmmo` as per system change

## 4.0.9 - 2023-12-15 (Pathfinder 2e 5.11.1)
### Fixes
- Fixed consuming repeating ammunition with the advanced ammunition system disabled
- Updated terminology of "charges" to "uses" to match system update

## 4.0.8 - 2023-12-09 (Pathfinder 2e 5.10.5)
### Feature
- Automatically open strike popouts for new stacks if created from a stack with an open strike popout
- Close strike popouts for deleted stacks

## 4.0.7 - 2023-12-01 (Pathfinder 2e 5.9.5)
### Fixes
- Do not post full chat card for repeating ammunition when the setting is disabled

## 4.0.6 - 2023-11-09 (Pathfinder 2e 5.8.3)
### Fixes
- Fixed thumbnail image not displaying when using a routePrefix
- Add force, vitality, and void damage types to alchemical crossbow
- Respect ammunition auto-destroy setting

## 4.0.5 - 2023-11-01
### Feature
- Add translations for Polish

## 4.0.4 - 2023-08-21 (Pathfinder 2e 5.3.2)
### Fixes
- When creating a new stack, wait for the stack to be created before continuing execution

## 4.0.3 - 2023-08-07 (Pathfinder 2e 5.3.1)
### Fixes
- Fixed the weapon name showing as "undefined" when loading a magazine into a repeating weapon

## 4.0.2 - 2023-07-07 (Pathfinder 2e 5.1.1)
### Fixes
- Improved the wording and localisation of some dialogs

## 4.0.1 - 2023-07-03 (Pathfinder 2e 5.1.0)
### Fixes
- Fixed an issue with the advanced thrown weapon system (and potentially other places in the module) caused by a change in the Foundry API

## 4.0.0 - 2023-06-15 (Pathfinder 2e 5.0.0-beta2)
### Feature
- Foundry v11 compatibility

## 3.9.3 - 2023-05-11 (Pathfinder 2e 4.11.2)
### Fixes
- Fix error shown to other players when removing the final thrown weapon from a stack

## 3.9.2 - 2023-04-26 (Pathfinder 2e 4.10.4)
### Fixes
- Fix language code for Chinese (Simplified)

## 3.9.1 - 2023-04-24 (Pathfinder 2e 4.10.4)
### Feature
- Added translations for Chinese (Simplified) and French

## 3.9.0 - 2023-04-18 (Pathfinder 2e 4.10.4)
### Feature
- Added localization support (currently English only)

## 3.8.0 - 2023-03-15 (Pathfinder 2e 4.9.2) 
### Feature
- New <b>Reload NPCs</b> macro to reload all NPCs on the scene.

### Removed
- <b>Reload All</b> macro, which didn't work with most configurations, has been removed.

## 3.7.0 - 2023-03-13 (Pathfinder 2e 4.9.1)
### Feature
- Add a "Prey" effect to the target(s) of the Hunt Prey macro to clarify which token is designated

### Removed
- Rule elements on ammunition will no longer spawn an effect applied to the weapon that fired it. A better version of this functionality has been added to the Pathfinder 2e system as of version 4.9.0.

## 3.6.3 - 2023-03-02 (Pathfinder 2e 4.8.3)
### Feature/Fix
- Alter the "Post Full Ammunition Description" option to only post the ammunition description for non-standard ammunition

## 3.6.2 - 2023-02-17 (Pathfinder 2e 4.7.4)
### Fix
- The Hunt Prey effect and message will now respect the system's settings around hiding token names

## 3.6.1 - 2023-02-09 (Pathfinder 2e 4.7.2)
### Fix
- Fix deleting weapons from the Items directory causing errors

## 3.6.0 - 2023-02-08 (Pathfinder 2e 4.7.2)
### Feature
- Add hooks for the following macros:
  - Reload (`pf2eRangedCombatReload`)
  - Reload Magazine (`pf2eRangedCombatReloadMagazine`)
  - Unload (`pf2eRangedCombatUnload`)
  - Switch Ammunition (`pf2eRangedCombatSwitchAmmunition`)
  - Next Chamber (`pf2eRangedCombatNextChamber`)
  - Conjure Bullet (`pf2eRangedCombatConjureBullet`)

### Fixes
- Fix detection of whether an item is ammunition, which was changed in a recent system update

## 3.5.1 - 2023-01-18 (Pathfinder 2e 4.6.8)
### Fixes
- Fix Alchemical Shot macro not working
- Add codified persistent damage to Alchemical Shot instead of a note

## 3.5.0 - 2023-01-13 (Pathfinder 2e 4.6.5)
### Feature
- Implement the NPC Advanced Thrown Weapon System

## 3.4.2 - 2023-01-13 (Pathfinder 2e 4.6.5)
### Fixes
- Fix error that occurred when rolling the default fist attack, due to the previous fix

## 3.4.1 - 2023-01-10 (Pathfinder 2e 4.6.5)
### Fixes
- Ignore strikes that originate from rule elements

## 3.4.0 - 2023-01-09 (Pathfinder 2e 4.6.5)
### Feature
- Implement the NPC Weapon and Ammunition System
- Set the Advanced Ammunition System to be enabled by default

## 3.3.0 - 2023-01-03 (Pathfinder 2e 4.6.2)
### Feature
- Add client option to hide token icons for effects generated by the module

## 3.2.2 - 2023-01-01 (Pathfinder 2e 4.6.0)
### Fixes
- Correct references to templates which were renamed in the system

## 3.2.1 - 2022-12-15 (Pathfinder 2e 4.5.0)
### Fixes
- Fix hazards' attack rolls causing errors

## 3.2.0 - 2022-10-07 (Pathfinder 2e 4.2.3)
### Features
- Allow characters with Double Prey and Triple Threat to select multiple hunted preys
- Prompt to select ammunition when trying to reload a weapon with no or empty ammunition

### Fixes
- Migrate predicates to new structure
- Fix several instances of manually-assigned effects not working
- Fix issue with macros that display multiple dialogs

## 3.1.1 - 2022-09-30 (Pathfinder 2e 4.1.3)
- Fix issues reloading magazines

## 3.1.0 - 2022-09-22 (Pathfinder 2e 4.1.2)
- Add macro to switch weapon ammunition

## 3.0.0 - 2022-09-07 (Pathfinder 2e 4.0.0)
- Foundry v10 compatibility

## 2.9.2 - 2022-08-22 (Pathfinder 2e 3.13.5)
- Correct an error when crafting bombs with the Advanced Thrown Weapon System enabled

## 2.9.1 - 2022-07-30 (Pathfinder 2e 3.13.2)
- Add additional damage types to Alchemical Shot

## 2.9.0 - 2022-07-27 (Pathfinder 2e 3.12.2)
- Add the Alchemical Shot macro and effect, implementing automation for the Alchemical Shot feat

## 2.8.3 - 2022-07-15 (Pathfinder 2e 3.12.2)
- Rewrite the Advanced Thrown Weapon system

## 2.8.2 - 2022-07-06 (Pathfinder 2e 3.12.2)
- Apply Crossbow Ace and Crossbow Crack Shot when using Conjure Bullet

## 2.8.1 - 2022-06-26 (Pathfinder 2e 3.11.3)
- Add missing file, which caused various parts of the module to break

## 2.8.0 - 2022-06-24 (Pathfinder 2e 3.11.3)
- Implement the Advanced Thrown Weapon System

## 2.7.0 - 2022-06-21 (Pathfinder 2e 3.11.2)
- Support loading capacity weapons with multiple ammunition types

## 2.6.1 - 2022-06-15 (Pathfinder 2e 3.11.1)
- Display an error message when trying to reload a weapon with two different ammunition types

## 2.6.0 - 2022-06-14 (Pathfinder 2e 3.11.1)
- Add the ability to fire double-barreled weapons with both barrels to increase damage 

## 2.5.1 - 2022-05-27 (Pathfinder 2e 3.10.4)
- Fix an issue preventing the Crossbow Ace and Crossbow Crack Shot effects being applied when reloading

## 2.5.0 - 2022-05-26 (Pathfinder 2e 3.10.4)
- Add the Conjure Bullet action, allowing Spellshot gunslingers to fire without using ammunition
- Fixed an issue which could cause the "Target is your Hunted Prey" checkbox to become stuck

## 2.4.1 - 2022-05-23 (Pathfinder 2e 3.10.3)
- Fix an issue with using macros after manually applying some effects

## 2.4.0 - 2022-05-22 (Pathfinder 2e 3.10.3)
- Add setting to set a minimum permission level to see messages generated by this module
- Add support for capacity and double barrel weapons

## 2.3.2 - 2022-04-22 (Pathfinder 2e 3.8.4)
- Fix an issue with determining if a weapon requires ammunition

## 2.3.2 - 2022-04-16 (Pathfinder 2e 3.8.4)
- Fix an issue with the Reload All macro not working correctly

## 2.3.1 - 2022-04-15 (Pathfinder 2e 3.8.4)
- Fix an issue with firing an alchemical crossbow with no bomb loaded

## 2.3.0 - 2022-04-02 (Pathfinder 2e 3.7.2)
- Add option to post full ammunition item to chat when firing a ranged weapon
- Add ammunition effects, copying rules from ammunition to an effect targeting your weapon

## 2.2.1 - 2022-04-01 (Pathfinder 2e 3.7.2)
- Separate equipped and unequipped weapons in the weapon select dialog
- If there is a single equipped weapon available when reloading, select it automatically

## 2.2.0 - 2022-03-29 (Pathfinder 2e 3.7.2)
- Add macro to load alchemical bombs into alchemical crossbows
- Ignore stowed items when finding weapons

## 2.1.7 - 2022-03-21 (Pathfinder 2e 3.7.2)
- Automatically remove the Crossbow Ace and Crossbow Crack Shot effects upon making a second attack roll
- Remove separate reload actions

## 2.1.6 - 2022-03-18 (Pathfinder 2e 3.7.2)
- Fix issue where Hunt Prey did not apply Crossbow Ace effect due to system data change

## 2.1.5 - 2022-03-14 (Pathfinder 2e 3.7.1)
- Update to support data structure changes in Pathfinder 2e 3.7.0 (thanks to MrVauxs)

## 2.1.4 - 2022-03-05
- Prevent melee usage of combination weapons consuming ammunition

## 2.1.3 - 2022-03-04
- Revert system change to disregard empty ammunition stacks
- Prevent unloading into stowed ammunition stacks

## 2.1.2 - 2022-02-26
- Add a dialog when first being unable to fire a weapon because of the module, linking to documentation

## 2.1.1 - 2022-02-20
- Fix issue with Hunted Prey effect not applying

## 2.1.0 - 2022-02-18
- Implement Advanced Ammunition System
- Add improved macro icons

## 2.0.2 - 2022-01-31
- Fix issue where the Loaded effect would be removed even if the attack roll was cancelled

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
