export async function dialogPrompt(title, content, yesLabel, noLabel) {
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
