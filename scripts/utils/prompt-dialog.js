import { showDialog } from "./dialog.js";

export async function dialogPrompt(title, content, yesLabel, noLabel) {
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
}

