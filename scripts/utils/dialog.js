import { Configuration } from "../config/config.js";

/**
 * @param {string} title 
 * @param {string} content 
 * @param {object[]} buttons 
 */
export function showDialog(title, content, buttons) {
    if (Configuration.isUsingApplicationV2()) {
        new foundry.applications.api.DialogV2(
            {
                window: {
                    title
                },
                position: {
                    width: 600
                },
                content,
                buttons
            }
        ).render(true);
    } else {
        const dialogButtons = {};
        buttons.forEach(button => dialogButtons[button.action] = button);

        new Dialog({ title, content, buttons: dialogButtons }).render(true);
    }
}
