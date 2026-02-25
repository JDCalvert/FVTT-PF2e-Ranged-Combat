import { showDialog } from "./dialog.js";

/**
 * @param {string} title 
 * @param {string} content 
 * @param {string} yesLabel 
 * @param {string} noLabel 
 * 
 * @returns {Promise<boolean>}
 */
export async function dialogPrompt(title, content, yesLabel, noLabel) {
    return new Promise(resolve => {
        showDialog(
            title,
            content,
            [
                {
                    action: "ok",
                    label: yesLabel,
                    default: true,
                    callback: () => resolve(true)
                },
                {
                    action: "cancel",
                    label: noLabel,
                    callback: () => resolve(false)
                }
            ]
        );
    });
}
