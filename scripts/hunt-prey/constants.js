export const HUNT_PREY_ACTION_ID = "Compendium.pf2e.actionspf2e.Item.JYi4MnsdFu618hPm";

export const OUTWIT_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.NBHyoTrI8q62uDsU";
export const PRECISION_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.u6cBjqz2fiRBadBt";
export const FLURRY_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.6v4Rj7wWfOH1882r";

export const MASTERFUL_HUNTER_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.RVZC4wVy5B5W2OeS";
export const MASTERFUL_HUNTER_OUTWIT_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.vWZaLE2fEKMBw3D5";
export const MASTERFUL_HUNTER_PRECISION_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.BJYSUbFUGcTLaPDn";
export const MASTERFUL_HUNTER_FLURRY_FEATURE_ID = "Compendium.pf2e.classfeatures.Item.JhLncIB10GSQowWL";

export const DOUBLE_PREY_FEAT_ID = "Compendium.pf2e.feats-srd.Item.pbD4lfAPkK1NNag0";
export const TRIPLE_THREAT_FEAT_ID = "Compendium.pf2e.feats-srd.Item.EHorYedQ8r05qAtk";
export const SHARED_PREY_FEAT_ID = "Compendium.pf2e.feats-srd.Item.Aqhsx5duEpBgaPB0";

export const ANIMAL_COMPANION_RANGER_FEAT_ID = "Compendium.pf2e.feats-srd.Item.1JnERVwnPtX620f2";
export const MASTERFUL_COMPANION_RANGER_FEAT_ID = "Compendium.pf2e.feats-srd.Item.AwxJcaIrutqMcUC8";
export const RANGERS_ANIMAL_COMPANION_FEAT_ID = "Compendium.pf2e-ranged-combat.feats.Item.bmDVg2hU3CSAZGJ8";
export const MASTERFUL_ANIMAL_COMPANION_FEAT_ID = "Compendium.pf2e-ranged-combat.feats.Item.tM1C9zcBJChHd0oR";

export const HUNTED_PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.rdLADYwOByj8AZ7r";
export const PREY_EFFECT_ID = "Compendium.pf2e-ranged-combat.effects.Item.mVYwtEeIaI6AW9jK";

export const HUNTERS_EDGE_OUTWIT_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.ltIvO9ZQlmqGD89Y";
export const HUNTERS_EDGE_PRECISION_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.mNk0KxsZMFnDjUA0";
export const HUNTERS_EDGE_FLURRY_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.uXCU8GgriUjuj5FV";

export const MASTERFUL_HUNTER_OUTWIT_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.iqvurepX0zyu9OlI";
export const MASTERFUL_HUNTER_PRECISION_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.Lt5iSfx8fxHSdYXz";
export const MASTERFUL_HUNTER_FLURRY_EFFECT_ID = "Compendium.pf2e.feat-effects.Item.4UNQfMrwfWirdwoV";

export const HUNT_PREY_IMG = "modules/pf2e-ranged-combat/art/hunt-prey.webp";

export const SHARED_PREY_EFFECT_IDS = [
    HUNTERS_EDGE_FLURRY_EFFECT_ID,
    HUNTERS_EDGE_OUTWIT_EFFECT_ID,
    HUNTERS_EDGE_PRECISION_EFFECT_ID,
    MASTERFUL_HUNTER_FLURRY_EFFECT_ID,
    MASTERFUL_HUNTER_OUTWIT_EFFECT_ID,
    MASTERFUL_HUNTER_PRECISION_EFFECT_ID
];

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
        "selector": "perception",
        "type": "circumstance",
        "value": 2,
        "predicate": [
            "action:seek",
            "hunted-prey"
        ]
    },
    {
        "key": "FlatModifier",
        "label": "PF2E.SpecificRule.HuntPrey.TrackHuntedPrey",
        "selector": "survival",
        "type": "circumstance",
        "value": 2,
        "predicate": [
            "action:track",
            "hunted-prey"
        ]
    },
    {
        "key": "RollOption",
        "domain": "ranged-attack-roll",
        "option": "ignore-range-penalty:2",
        "predicate": [
            {
                "or": [
                    "hunted-prey",
                    "target:mark:hunt-prey"
                ]
            }
        ]
    }
];

export const MASTERFUL_HUNTER_RULES = [
    {
        "key": "FlatModifier",
        "label": "PF2E.SpecificRule.HuntPrey.SeekHuntedPrey",
        "selector": "perception",
        "type": "circumstance",
        "value": 4,
        "predicate": [
            "hunted-prey",
            "action:seek",
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    },
    {
        "key": "FlatModifier",
        "label": "PF2E.SpecificRule.HuntPrey.TrackHuntedPrey",
        "selector": "survival",
        "type": "circumstance",
        "value": 4,
        "predicate": [
            "hunted-prey",
            "action:track",
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    },
    {
        "key": "RollOption",
        "domain": "ranged-attack-roll",
        "option": "ignore-range-penalty:3",
        "predicate": [
            "hunted-prey",
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    }
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
            },
            {
                "label": "pf2e-ranged-combat.huntPrey.precision.subsequent",
                "value": "subsequent-attack"
            }
        ]
    },
    {
        "key": "DamageDice",
        "selector": "strike-damage",
        "category": "precision",
        "dieSize": "d8",
        "diceNumber": "ternary(gte(@actor.level, 19), 3, ternary(gte(@actor.level, 11), 2, 1))",
        "predicate": [
            "hunted-prey",
            "precision:first-attack"
        ]
    }
];

export const MASTERFUL_HUNTER_PRECISION_RULES = [
    {
        "key": "DamageDice",
        "selector": "strike-damage",
        "category": "precision",
        "dieSize": "d8",
        "diceNumber": "ternary(gte(@actor.level, 19), 2, 1)",
        "predicate": [
            "hunted-prey",
            "precision:second-attack"
        ]
    },
    {
        "key": "DamageDice",
        "selector": "strike-damage",
        "category": "precision",
        "dieSize": "d8",
        "diceNumber": "ternary(gte(@actor.level, 19), 1, 0)",
        "predicate": [
            "hunted-prey",
            "precision:third-attack"
        ]
    }
];

export const OUTWIT_RULES = [
    {
        "key": "FlatModifier",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.outwit",
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
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.outwit",
        "selector": "skill-check",
        "type": "circumstance",
        "value": 2,
        "predicate": [
            "hunted-prey",
            "action:recall-knowledge"
        ]
    },
    {
        "key": "FlatModifier",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.outwit",
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

export const MASTERFUL_HUNTER_OUTWIT_RULES = [
    {
        "key": "FlatModifier",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.outwit",
        "selector": [
            "deception",
            "intimidation",
            "stealth"
        ],
        "type": "circumstance",
        "value": 4,
        "predicate": [
            "hunted-prey",
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    },
    {
        "key": "FlatModifier",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.outwit",
        "selector": "skill-check",
        "type": "circumstance",
        "value": 4,
        "predicate": [
            "action:recall-knowledge",
            "hunted-prey",
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    },
    {
        "key": "FlatModifier",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.outwit",
        "selector": "ac",
        "type": "circumstance",
        "value": 2,
        "predicate": [
            {
                "or": [
                    "hunted-prey",
                    "origin:prey:{actor|signature}",
                    "origin:prey:{origin|signature}"
                ]
            },
            {
                "gte": [
                    "defense:unarmored:rank",
                    3
                ]
            }
        ]
    }
];

export const FLURRY_RULES = [
    {
        "key": "MultipleAttackPenalty",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.flurry",
        "selector": "attack",
        "value": -2,
        "predicate": [
            "hunted-prey",
            "agile"
        ]
    },
    {
        "key": "MultipleAttackPenalty",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.flurry",
        "selector": "attack",
        "value": -3,
        "predicate": [
            "hunted-prey",
            {
                "not": "agile"
            }
        ]
    }
];

export const MASTERFUL_HUNTER_FLURRY_RULES = [
    {
        "key": "MultipleAttackPenalty",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.flurry",
        "selector": "attack",
        "value": -2,
        "predicate": [
            "hunted-prey",
            {
                "not": "agile"
            },
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    },
    {
        "key": "MultipleAttackPenalty",
        "label": "pf2e-ranged-combat.huntPrey.huntersEdge.flurry",
        "selector": "attack",
        "value": -1,
        "predicate": [
            "hunted-prey",
            "agile",
            {
                "or": [
                    "proficiency:master",
                    "proficiency:legendary"
                ]
            }
        ]
    }
];

export const TOKEN_MARK_RULE = uuid => (
    {
        "key": "TokenMark",
        "slug": "hunt-prey",
        "uuid": uuid
    }
)
