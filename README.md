# FVTT PF2e Ranged Combat
A module for the Foundry VTT Pathfinder 2e system that provides helper effects and macros for ranged combat.

## Features

### Reloading System

#### Macros
The <b>Reload</b> macro gives you a choice of which weapon to reload, and adds a <b>Loaded</b> effect showing that the weapon has been loaded. If you have the feats, this also applies the effects of <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b>. Firing the weapon removes the <b>Loaded</b> effect.

If <b>Prevent Firing Weapon if not Loaded</b> is enabled <i>(default: true)</i> then a reloadable weapon <i>must</i> be loaded before it can be fired.

The <b>Reload All</b> macro reloads all of your unloaded reloadable weapons at once, and does not apply feat effects. This is intended to be used outside of combat.

#### Actions
Four <b>Reload</b> actions, for one- two-, three-action and "exploration" (more than three-action) reloads.

#### Effects
The <b>Loaded</b> effect targets a specific weapon and serves as a reminder that the weapon is loaded. This effect is removed if the weapon is fired and, optionally, the weapon cannot be fired if it isn't loaded.

The <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b> effects apply the feat effects and can be applied to a particular crossbow.
<small>
- <b>Note:</b> Disable the "Reloaded crossbow or Hunted Prey" toggle when using these effects.
- <b>Note:</b> The effect is not currently removed automatically. This must be done manually.
</small>

### Advanced Ammunition System

### Hunt Prey
The <b>Hunt Prey</b> macro applies the <b>Hunted Prey</b> effect to your character, with the name of your current target, as a reminder of who your hunted prey is. It also applies the <b>Crossbow Ace</b> effect for your equipped crossbow(s) if you have the feat.

While you have a hunted prey, the "Hunted Prey" toggle will automatically be enabled while you have your prey (and only your prey) targeted.

## Configuration
### Prevent Firing Weapon if not Loaded (default: enabled)
If enabled, weapons with a reload entry (or reload trait, for NPCs) cannot be fired unless they're loaded.

### Post Full Action from Macros (default: enabled)
If enabled, the action represented used by a macro is posted to chat, as well as the summary of what happened. If disabled, the summary is still posted.
