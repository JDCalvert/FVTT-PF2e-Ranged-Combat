# FVTT PF2e Ranged Combat
A module for the Foundry VTT Pathfinder 2e system that provides helper effects and macros for ranged combat.

## Features

### Range Penalties
The <b>Ranged Combat Effects</b> compendium provides several effects for range penalties: Five effects representing each range increment from second to sixth, giving the appropriate penalty to all strikes, and a separate <b>Range Penalty</b> effect that, when added to a character, gives a choice of the five increments.

The <b>Ranged Combat Macros</b> compendium provides two macros for automatically calculating range penalties: <b>Calculate Range Penalty</b> and <b>Calculate Range Penalties</b>. They both work very similarly:

If you have a 0token controlled (or a token for your assigned character) and a token targeted, they calculate the distance between the two and apply the range increment effect depending on the strike's range increment. The effect is modified to apply _only_ to that strike, so your melee strikes aren't affected.

If you have only one ranged attack ready, they both work in the same way. If you have more than one, the <b>Calculate Range Penalty</b> macro gives you a choice of strike, whereas the <b>Calculate Range Penalties</b> macro applies the effect for each of your ranged strikes.

<b>Note:</b> Automatic range penalty calculation is in development for the Pathfinder 2e system. When that is released, this feature will be removed from the module.

#### Future Development
- <s>Automate the volley trait.</s> <b>Implemented in Pathfinder 2e system</b>
- <s>Automate Point-Blank Shot toggle.</s> <b>Implemented in Pathfinder 2e system</b>

### Reloading
#### Actions
Two <b>Reload</b> actions, for one-action and two-action reloads.

#### Effects
The <b>Loaded</b> effect serves as a reminder that a particular weapon is loaded. It currently has no other effect.

The <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b> effects can be applied to a particular crossbow.
<small>
- <b>Note:</b> Disable the "Reloaded crossbow or Hunted Prey" toggle when using these effects.
- <b>Note:</b> The damage dice override is currently hardcoded to d8. This is updated correctly when applied through the below macros, but will be incorrect if applied manually.
</small>

#### Macro
The <b>Reload</b> macro gives a choice of which equipped weapon to reload, posts the appropriate <b>Reload</b> action in the chat (adding the action to your character if needed) and applies the <b>Crossbow Ace</b> and <b>Crossbow Crack Shot</b> effects if you have the feats.

### Hunt Prey
The <b>Hunt Prey</b> macro applies the <b>Hunted Prey</b> effect to your character, with the name of your current target, as a reminder of who your hunted prey is. It also applies the <b>Crossbow Ace</b> effect for your equipped crossbow(s) if you have the feat.

While you have a hunted prey, the "Hunted Prey" toggle will automatically be enabled while you have your prey (and only your prey) targeted.
