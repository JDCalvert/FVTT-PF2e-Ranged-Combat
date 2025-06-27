const localize = (key) => game.i18n.localize("pf2e-ranged-combat.utils." + key);

export function showWarningDialog(warningMessage) {
    if (foundry.utils.isNewerVersion(game.version, "13")) {
        warningDialogV2(warningMessage);
    } else {
        warningDialogV1(warningMessage);
    }
}

function warningDialogV2(warningMessage) {
    new foundry.applications.api.DialogV2(
        {
            window: {
                title: game.i18n.localize("pf2e-ranged-combat.module-name")
            },
            position: {
                width: 400
            },
            content: `
                <p>
                    ${localize("warningDialog1")} ${warningMessage}
                    <br><br>
                    ${localize("warningDialog2")} 
                    ${localize("warningDialog3")}
                </p>
                `,
            buttons: [
                {
                    action: "ok",
                    label: localize("buttonOK"),
                },
                {
                    action: "doNotShowAgain",
                    label: localize("buttonDoNotShowAgain"),
                    callback: () => game.settings.set("pf2e-ranged-combat", "doNotShowWarningAgain", true)
                }
            ]
        }
    ).render(true);
}

function warningDialogV1(warningMessage) {
    new Dialog(
        {
            title: game.i18n.localize("pf2e-ranged-combat.module-name"),
            content: `
                <p>${localize("warningDialog1")} ${warningMessage}<p>
                <p>${localize("warningDialog2")} 
                ${localize("warningDialog3")}</p>
                `,
            buttons: {
                "ok": {
                    "label": localize("buttonOK"),
                },
                "doNotShowAgain": {
                    "label": localize("buttonDoNotShowAgain"),
                    "callback": () => game.settings.set("pf2e-ranged-combat", "doNotShowWarningAgain", true)
                }
            }
        }
    ).render(true);
}