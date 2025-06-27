export async function dialogPrompt(title, content, yesLabel, noLabel) {
    if (foundry.utils.isNewerVersion(game.version, "13")) {
        return promptV2(title, content, yesLabel, noLabel);
    } else {
        return promptV1(title, content, yesLabel, noLabel);
    }
}

async function promptV2(title, content, yesLabel, noLabel) {
    return new Promise(resolve => {
        new foundry.applications.api.DialogV2(
            {
                window: {
                    title
                },
                position: {
                    width: 600
                },
                content,
                buttons: [
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
            }
        ).render(true);
    });
}

async function promptV1(title, content, yesLabel, noLabel) {
    return new Promise(resolve => {
        new Dialog(
            {
                title,
                content,
                buttons: {
                    ok: {
                        label: yesLabel,
                        callback: () => resolve(true)
                    },
                    cancel: {
                        label: noLabel,
                        callback: () => resolve(false)
                    }
                }
            }
        ).render(true);
    });
}
