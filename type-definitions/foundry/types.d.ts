var canvas: Canvas;
var ui: UI;

interface Array<T> {
    /**
     * Find an element within the Array and remove it from the array
     * @param find      A function to use as input to findIndex
     * @param [replace] A replacement for the spliced element
     * @return The replacement element, the removed element, or null if no element was found.
     */
    findSplice(find: (element: T) => boolean, replace?: T): T | null;
}

namespace CONST {
    namespace CHAT_MESSAGE_STYLES {
        const EMOTE: string;
    }
    namespace DOCUMENT_OWNERSHIP_LEVELS {
        const OWNER: number;
    }
    namespace USER_ROLES {
        const TRUSTED: number;
    }
}

interface UI {
    notifications: {
        info(message: string): void;
        warn(message: string): void;
    };

    windows: {
        actor: ActorPF2e;
    }[];
}

interface Canvas {
    tokens: {
        placeables: TokenPF2e[];
        controlled: TokenPF2e[];
    };

    scene: {
        tokens: TokenPF2e[];
    };
}

namespace Hooks {
    function on(name: string, callback: (...any) => void): void;

    /**
     * Call all registered for this event
     */
    function callAll(name: string, ...args: any): void;
}

namespace foundry {
    namespace utils {
        function isNewerVersion(v1: string, v2: string): boolean;
        function mergeObject(o: object, o2: object): void;
        function randomID(): string;
    }

    namespace applications {
        namespace handlebars {
            async function renderTemplate(path: string, params: object): Promise<string>;
        }
    }
}

async function fromUuid(sourceId: string): Promise<ItemPF2e>;
async function renderTemplate(path: string, params: object): Promise<string>;
