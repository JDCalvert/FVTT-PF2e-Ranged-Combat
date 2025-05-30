export class User {
    /**
     * Determine if the current user is the actor's preferred updater
     */
    static isPreferredUpdater(actor) {
        return game.user === this.getPreferredUpdater(actor);
    }

    /**
     * Find the preferred updater for an actor:
     *   - A player who has the actor as their character
     *   - A player who owns the actor
     *   - The actor's primaryUpdater
     */
    static getPreferredUpdater(actor) {
        const activeUsers = game.users.filter(user => user.active);

        return activeUsers.find(user => user.character?.uuid === actor.uuid) ??
            activeUsers.find(user =>
                actor.ownership[user.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER &&
                user.role <= CONST.USER_ROLES.TRUSTED
            ) ??
            activeUsers.find(user => user === actor.primaryUpdater);
    }
}
