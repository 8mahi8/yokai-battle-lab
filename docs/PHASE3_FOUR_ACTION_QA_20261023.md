# 4-action / Phase 3 research review — 2026-10-23

Development branch only: `feat/phase1-action-circle-lab-20261023`.
**No change to main, Google Sites, production Firebase, or paid services.**

## Implemented in this iteration

- Original-inspired **four-way auto action selection**: Attack / Technique / Inspirit / Guard, in `engine/selection.mjs`; validated 4 nonnegative weights adding to 100 on each original rental-fixture character.
- Loafing (when explicitly enabled) is resolved **before** normal action choice. Rate remains a test-only fixture, not the game's level- and leader-adjusted formula.
- Three **partial**, source-backed YW2 attitude behaviors: Gentle, Careful and Grouchy. First applicable implemented attitude rule takes precedence. Conditions depending on special moves, other skills, elemental resistances and certain Inspirits are **not implemented**.
- Automatic experimental Inspirits: negative `sleep` on a living enemy, positive `strength-up` on a living ally, plus pin-sensitive enemy target preference.
- Failed enemy Inspirit attempts based on test-fixture `inspiritResistance` from 0–100; original YW2 character resistance values and version-specific exceptions have **not** been imported or verified.
- `sleep` disables the target's turn scheduling until bench purification. `strength-up` boosts its target's Strength by **10% (FAKE prototype multiplier)** while active. Do not mistake 10% for YW2's real buff formula. The 30-action timer on positive Inspirits follows the source's explicitly shared YW1+YW2 duration section.
- The earlier bench purification remains an instant experiment command **rather than** a recreation of the original interactive touch minigames.
- `lab/phase2.html` now logs actual Inspirit attempts, failures due to resistance, and buff markers, alongside the previous five-action forecast and HP/UI.

## Primary sources reviewed

- Action selection ordering, 4 weights, first applicable attitude rule, loafing and override conditions:
  https://www.mtwildwood.net/attitudes.php
- YW2 behavior / 4 actions, contemporary guide:
  https://mtwildwood.net/games/YW2/guideAttitudes.html
- Inspirit resistance and the shared YW1+YW2 duration rule (the **rest of this source is explicitly titled YKW1**):
  https://www.mtwildwood.net/inspirits.php
- YW2 sleep (action disabled):
  https://gamepedia.jp/youkai-yw2/possesions/3319
- YW2 purification (move to back, gesture interaction):
  https://gamepedia.jp/youkai-yw2/archives/1397

## QA and reproduction

- Local mirror of the same module changes: `node --test tests/*.test.mjs` — **58/58 passed** (the 49 prior tests plus nine in `tests/four-actions.test.mjs`).
- 1,000 seeded BOT test cases with up to 2,000 simulated action events per game: Team A victories **499**, Team B **448**, **53 unresolved**. There were **22,793 Inspirit attempts**, with **22,139 succeeding** across positive and negative Inspire actions. This is not a claim of balanced PvP or original behavior.
- Browser visual/interaction test using locally inlined module mirror in headless Chromium: **1194×834, 1024×768, 1366×400, 390×844, and 844×390**. For each: six front-unit cards, five prediction slots, no browser script errors and no whole-page horizontal overflow.
- At 1194×834: 20 actions produced actual Inspirit log text; reset, sleep application, rotation and bench purification were also clicked successfully.
- **Limitations:** local mirror rather than direct GitHub CI checkout (container GitHub DNS unavailable); headless Chromium not physical Safari; no original-game replay trace; no online room or Google Sites direct-code embed test; sprite art is still placeholder.

## Important unresolved fidelity issues

1. All four possible attitudes and complete original four-action per-character base weights; partial rule precedence and absolute probabilities.
2. Accurate YW2 Inspirit effects, stacking, reapplying to an already inspirited target, resistances, healing and buffs. The 10% Strength prototype is **fictional**.
3. Level-dependent loaf rates, all named skills/abilities and how statuses interact with attack timing.
4. The YW2 real purification minigame, animation timing, wheel cooldown and battle time limit (Sudden Death).
5. Proper YW2 gauge/Soultimate/poking/G move system, team bonuses, first-frame combat fairness.
6. Real 1vs1 sync, 2-client tests and school iPad Safari / Google Sites version.

## Next engineering gate

Do **not** label this Phase 3 complete yet. Next improve targeted Inspirit stacking and YW2-supported buffs, original loaf and healing, then Soul/Soultimate interactions, followed by offline BOT and two-client transport test. Make any source-uncertain calculations configurable and visually marked as provisional.
