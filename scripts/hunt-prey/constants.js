export const HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.Item.JYi4MnsdFu618hPm";

export const OUTWIT_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.NBHyoTrI8q62uDsU";
export const PRECISION_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.u6cBjqz2fiRBadBt";
export const FLURRY_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.6v4Rj7wWfOH1882r";

export const MASTERFUL_HUNTER_OUTWIT_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.vWZaLE2fEKMBw3D5";
export const MASTERFUL_HUNTER_PRECISION_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.BJYSUbFUGcTLaPDn";
export const MASTERFUL_HUNTER_FLURRY_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.JhLncIB10GSQowWL";

export const DOUBLE_PREY_FEAT_ID = "Compendium.pf2e.feats-srd.Item.pbD4lfAPkK1NNag0";
export const TRIPLE_THREAT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.EHorYedQ8r05qAtk";
export const SHARED_PREY_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Aqhsx5duEpBgaPB0";

export const ANIMAL_COMPANION_RANGER_FEAT_ID = "Compendium.pf2e.feats-srd.Item.1JnERVwnPtX620f2";
export const RANGERS_ANIMAL_COMPANION_FEAT_ID = "Compendium.pf2e-ranged-combat.feats.Item.bmDVg2hU3CSAZGJ8";

export const HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.rdLADYwOByj8AZ7r";
export const PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.mVYwtEeIaI6AW9jK";

export const HUNTERS_EDGE_OUTWIT_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.ltIvO9ZQlmqGD89Y";
export const HUNTERS_EDGE_PRECISION_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.mNk0KxsZMFnDjUA0";
export const HUNTERS_EDGE_FLURRY_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.uXCU8GgriUjuj5FV";

export const MASTERFUL_HUNTER_OUTWIT_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.iqvurepX0zyu9OlI";
export const MASTERFUL_HUNTER_PRECISION_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.Lt5iSfx8fxHSdYXz";
export const MASTERFUL_HUNTER_FLURRY_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.4UNQfMrwfWirdwoV";

export const HUNT_PREY_IMG = "modules/pf2e-ranged-combat/art/hunt-prey.webp";

export const HUNT_PREY_RULES = [
    {
        "key": "RollOption",
        "domain": "all",
        "option": "hunted-prey",
        "label": "PF2E.SpecificRule.HuntPrey.TargetHuntedPrey",
        "toggleable": true,
        "priority": 49
    },
    {
        "key": "FlatModifier",
        "label": "PF2E.SpecificRule.HuntPrey.SeekHuntedPrey",
        "predicate": [
            "action:seek",
            "hunted-prey"
        ],
        "selector": "perception",
        "type": "circumstance",
        "value": 2
    },
    {
        "key": "FlatModifier",
        "label": "PF2E.SpecificRule.HuntPrey.TrackHuntedPrey",
        "predicate": [
            "action:track",
            "hunted-prey"
        ],
        "selector": "survival",
        "type": "circumstance",
        "value": 2
    },
    {
        "domain": "ranged-attack-roll",
        "key": "RollOption",
        "option": "ignore-range-penalty:2",
        "predicate": [
            "hunted-prey"
        ]
    },
];

export const PRECISION_RULES = [
    {
        "key": "RollOption",
        "domain": "all",
        "option": "precision",
        "label": "pf2e-ranged-combat.huntPrey.precision.attackNumber",
        "toggleable": true,
        "alwaysActive": true,
        "suboptions": [
            {
                "label": "pf2e-ranged-combat.huntPrey.precision.first",
                "value": "first-attack"
            },
            {
                "label": "pf2e-ranged-combat.huntPrey.precision.second",
                "value": "second-attack"
            },
            {
                "label": "pf2e-ranged-combat.huntPrey.precision.third",
                "value": "third-attack"
            }
        ]
    },
    {
        "key": "DamageDice",
        "selector": "strike-damage",
        "category": "precision",
        "dieSize": "d8",
        "diceNumber": "ternary(lt(@actor.level, 11), 1, ternary(lt(@actor.level, 19), 2, 3))",
        "predicate": [
            "hunted-prey",
            "precision:first-attack"
        ]
    }
];

export const OUTWIT_RULES = [
    {
        "key": "FlatModifier",
        "selector": [
            "deception",
            "intimidation",
            "stealth"
        ],
        "type": "circumstance",
        "value": 2,
        "predicate": [
            "hunted-prey"
        ]
    },
    {
        "key": "FlatModifier",
        "selector": "skill-check",
        "type": "circumstance",
        "value": 2,
        "predicate": [
            "action:recall-knowledge",
            "hunted-prey"
        ]
    },
    {
        "key": "FlatModifier",
        "selector": "ac",
        "type": "circumstance",
        "value": 1,
        "predicate": [
            {
                "or": [
                    "hunted-prey",
                    "origin:prey:{actor|signature}",
                    "origin:prey:{origin|signature}"
                ]
            }
        ]
    }
];
