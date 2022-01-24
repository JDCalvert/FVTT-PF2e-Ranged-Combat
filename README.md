# FVTT PF2e Ranged Combat
A module for the Foundry VTT Pathfinder 2e system that provides helper effects and macros for ranged combat.

## Features

### Range Penalties
The "Ranged Combat Effects" compendium provides several effects for range penalties: Five effects representing each range increment from second to sixth, giving the appropriate penalty to all strikes, and a separate "Range Penalty" effect that, when added to a character, gives a choice of the five increments.

The "Ranged Combat Macros" compendium provides two macros for automatically calculating range penalties: Calculate Range Penalty and Calculate Range Penalties. They both work very similarly:

If you have a token controlled (or a token for your assigned character) and a token targetted, they calculate the distance between the two and apply the range increment effect depending on the strike's range increment. The effect is modified to apply _only_ to that strike, so your melee strikes aren't affected.

If you have only one ranged attack ready, they both work in the same way. If you have more than one, the "Calculate Range Penalty" macro gives you a choice of strike, whereas the "Calculate Range Penalties" macro applies the effect for each of your ranged strikes.

<b>Note:</b> Automatic range penalty calculation is in development for the Pathfinder 2e system. When that is released, this feature will be removed from the module.

#### Future Development
- <s>Automate the volley trait.</s> <b>Implemented in Pathfinder 2e system</b>
- <s>Automate Point-Blank Shot toggle.</s> <b>Implemented in Pathfinder 2e system</b>

### Reloading
The "Ranged Combat Effects" compendium provides a "Loaded" effect. This currently has no effect, but it is useful as a reminder of whether a given weapon is loaded.

The "Ranged Combat Macros" compendium provides the "Reload" macro, which allows you to choose a weapon to reload and automatically gives you the "Loaded" effect for that weapon.

The "Ranged Combat Actions" compendium provides the "Reload" action, which can be posted to show you are reloading in chat.

#### Future Development
- Automate Crossbow Ace and Crossbow Crack Shot with the reload macro.
