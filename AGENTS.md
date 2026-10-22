# Agent instructions — Yokai Battle Lab character art

This repository is a character-art quality experiment for a school iPad Safari game. The current main/index.html V0.1 did **not** pass the visual-fidelity review. Do not call V0.1 a finished character, official Jibanyan recreation, or approved reference quality.

## Mandatory reading before implementing character artwork
1. `docs/CHARACTER_ART_PIPELINE_V2.md` (this repository, quality gates and postmortem).
2. `https://github.com/8mahi8/shokoku-sensen/blob/main/docs/CHARACTER_PIPELINE.md` (Gald pipeline).
3. `https://github.com/8mahi8/shokoku-sensen/blob/main/characters/gald/QA_NOTES.md`.

## Required production sequence
- Reference analysis and shape measurements → multiple silhouettes → separate front/three-quarter/back neutral views → visual self-review → keyed animation poses → smooth animation → sprite exporting → browser/device QA → user review.
- **Never build a pile of effects or several animations when the character silhouette and face are wrong.**
- Do not fake three-quarter by scaling or rotating a front-facing drawing. Design correct multi-directional views or pre-render from 3D.
- Automated smoke tests cover program functionality, not likeness, appeal, acting, or visual quality.
- Before announcing a usable sample, inspect screenshots/contact sheets at actual game display sizes and write concrete flaws, correcting what you can.
- Keep gameplay, networking, and other repositories untouched during art work. Use a development branch and leave the main demo unchanged until it passes visual review.
- Respect third-party copyright: do not copy/distribute original game graphics or extracted assets; self-drawn likeness can still raise rights issues, so agree on lawful publication before adding recognizable protected characters to a public GitHub Pages build.

## Current priority
Rebuild **one** character from its neutral model sheet, starting with a strong silhouette and readable face. No further full-animation expansion until the static design passes the gate.
