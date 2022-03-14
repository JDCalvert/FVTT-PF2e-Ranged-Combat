# FVTT PF2e Ranged Combat
A module for the Foundry VTT Pathfinder 2e system that provides helper effects and macros for ranged combat.

## Issues and System Compatibility
This module is built for the Pathfinder 2e system, which receives regular updates, and some of those updates may occassionally break the functionality of this module. I will do my best to fix issues caused by updates, but this may require losing support for earlier versions of the system.

Also, some parts of this module may require features/functions from the latest release of the Pathfinder 2e system.

In summary, each release of this module only officially supports the latest release of the Pathfinder 2e system at the time of release, which will be listed in the [Changelog](/CHANGELOG.md). If you encounter an issue, please make sure you're using the latest system version. If the issue persists on the most recent version, please [report it](https://github.com/JDCalvert/FVTT-PF2e-Ranged-Combat/issues/new)!

## Features

### Reloading System
When you have a reloadable weapon (e.g. reload 1 or higher), you can use the <b>Reload</b> macro to choose a weapon to reload (if you have more than one) and give yourself the <b>Loaded</b> effect showing that the weapon has been loaded. If you have the feats, this also applies the effects of <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b>. Firing the weapon removes the <b>Loaded</b> effect.

You can also use the <b>Reload All</b> macro to reload all of your reloadable weapons at once. This is intended to be used outside of combat and so doesn't apply the <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b> feat effects.

If <b>Prevent Firing Weapon if not Loaded</b> is enabled <i>(default: true)</i> in the macro settings, then you <i>must</i> reload weapons before you can fire them.

#### Actions
Four <b>Reload</b> actions, for one- two-, three-action and "exploration" (more than three-action) reloads.

#### Effects
The <b>Loaded</b> effect targets a specific weapon and serves as a reminder that the weapon is loaded. This effect is removed if the weapon is fired and, optionally, the weapon cannot be fired if it isn't loaded.

The <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b> effects apply the feat effects and can be applied to a particular crossbow.
<small>
- <b>Note:</b> You do not need to use the "Reloaded crossbow or Hunted Prey" toggle when using these effects.
- <b>Note:</b> You must remove the effects manually once you've made your damage roll.
</small>

### Advanced Ammunition System
This advanced version of the reloading system handles ammunition management for reloadable and repeating weapons. A Game Master can enable this in the module settings <i>(default: disabled)</i>. This feature is currently implemented only for PCs.

With the Advanced Ammunition System, there are a few changes that affect all weapons that use ammunition:
 - You <i>must</i> have selected ammunition to use the weapon.
 - When the last piece of ammunition in a stack is consumed, the quantity of the stack is reduced to 0 instead of being deleted.

How the rest of the system works depends on the type of weapon:

#### Reload 0 <small>(e.g. [Longbow](https://2e.aonprd.com/Weapons.aspx?ID=76))</small>
You don't need to do anything to prepare to fire the weapon. The selected ammunition is consumed when you make the attack roll.

#### Reload 1+ <small>(e.g. [Crossbow](https://2e.aonprd.com/Weapons.aspx?ID=67))</small>
You must reload the weapon using the <b>Reload</b> macro before you can fire. The selected ammunition is consumed when you reload the weapon, and the <b>Loaded</b> effect will specify what ammunition is loaded.

If you change the weapon's selected ammunition and use the <b>Reload</b> macro again, the loaded ammunition will be put back in your inventory and the new ammunition loaded.

You can also use the <b>Unload</b> macro to remove the loaded ammunition from the weapon and put it back in your inventory.

#### Repeating <small>(e.g. [Repeating Crossbow](https://2e.aonprd.com/Weapons.aspx?ID=176))</small>
Repeating weapons work similarly to reloadable weapons, except you use the <b>Reload Magazine</b> to load a magazine, creating the <b>Magazine Loaded</b> effect.

The <b>Magazine Loaded</b> works similarly to the <b>Loaded</b> effect, except the effect also tracks the number of rounds remaining in the magazine. Ammunition is consumed from the magazine when you fire the weapon. When the magazine is empty, it remains loaded (representing the need to remove the existing magazine before replacing it with a new one) but you cannot fire the weapon while the magazine is empty.

You can also use the <b>Reload Magazine</b> macro while a magazine is already loaded:
- If you've changed the weapon's selected ammunition, the new magazine will be loaded. If the current magazine had any remaining ammunition, it is put back in your inventory.
- If the weapon's selected ammunition is the same as the loaded magazine, it will only be swapped if reloading will change the remaining ammunition in the magazine.

You can use the <b>Unload</b> macro to just remove the loaded magazine and, if it still has ammunition remaining, put it back in your inventory.

When a magazine with remaining (but not full) ammunition is removed from a weapon, it creates a new item in your inventory with one magazine with that amount of ammunition remaining. This can create a number of separate items all for the same type of ammunition. You can use the <b>Consolidate Repeating Weapon Ammunition</b> macro to tidy your inventory. This gathers up all the repeating ammunition of each type you have and creates as many full magazines as possible in one stack, and one extra magazine (in a separate stack) with any remaining ammunition left over.

#### Repeating and Reload 1+ <small>(e.g. [Repeating Heavy Crossbow](https://2e.aonprd.com/Weapons.aspx?ID=178))</small>
Repeating weapons that still require reloading work almost identically to other repeating weapons, with the extra step that you must use the <b>Reload</b> macro before firing each shot. The ammunition is still only consumed when you fire the weapon. Using the <b>Unload</b> macro will also remove the <b>Loaded</b> effect.

### Hunt Prey
The <b>Hunt Prey</b> macro applies the <b>Hunted Prey</b> effect to your character, with the name of your current target, as a reminder of who your hunted prey is. It also applies the <b>Crossbow Ace</b> effect for your equipped crossbow(s) if you have the feat.

While you have a hunted prey, the "Hunted Prey" toggle will automatically be enabled while you have your prey (and only your prey) targeted.

## Configuration
These are the settings available for the module (all world-scope).

### Post Full Action from Macros (default: enabled)
If enabled, the action represented used by a macro is posted to chat, as well as the summary of what happened. If disabled, the summary is still posted.

### Prevent Firing Weapon if not Loaded (default: enabled)
If enabled, weapons with a reload entry (or reload trait, for NPCs) cannot be fired unless they're loaded.

### Advanced Ammunition System (Player) (default: disabled)
Enable the Advanced Ammunition System, as described above, for PCs.
