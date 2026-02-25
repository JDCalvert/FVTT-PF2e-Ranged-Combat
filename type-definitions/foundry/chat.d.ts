class ChatMessage {
    static async create(params: object): Promise<void>;
    static getSpeaker({ actor: ActorPF2e }): string;
}
