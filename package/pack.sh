# Set up FVTT CLI to point to this folder
fvtt configure set dataPath E:/Foundry/Data/dev/foundrydata-v11-dev
fvtt package workon "pf2e-ranged-combat" --type "Module"

rm -r packs

fvtt package pack effects --in packs-source/effects --out packs
fvtt package pack feats --in packs-source/feats --out packs
fvtt package pack macros --in packs-source/macros --out packs
