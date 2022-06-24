/**
 * Remove the droppedFrom flag, and update the name to remove the " Updated" suffix
 */
export async function removeDroppedState(item) {
    const flags = item.data.flags["pf2e-ranged-combat"];
    const droppedFromName = flags.droppedFrom.name;
    delete flags.droppedFrom;
    return await item.update(
        {
            name: droppedFromName,
            "flags.pf2e-ranged-combat": flags
        }
    )
}
