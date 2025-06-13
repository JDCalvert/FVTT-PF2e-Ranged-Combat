export async function dialogPrompt(title, content, yesLabel, noLabel) {
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
