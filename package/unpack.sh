# Set up FVTT CLI to point to this folder
fvtt configure set dataPath E:/Foundry/Data/dev/foundrydata-v11-dev
fvtt package workon "pf2e-ranged-combat" --type "Module"

rm -r packs-source

fvtt package unpack effects --in packs --out packs-source/effects
fvtt package unpack feats --in packs --out packs-source/feats
fvtt package unpack macros --in packs --out packs-source/macros
