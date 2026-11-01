# Phase 4 — Soultimate effects, rank costs, and Soul income QA
Date: 2026-10-23
Branch: `feat/phase1-action-circle-lab-20261023`
**RESEARCH BUILD ONLY — not a faithful YW2 battle release.**

## External evidence and confidence

1. **Confirmed game-code analysis:** Soultimate Charge Rank 1/2/3/4 requires 100/150/200/250 Soul points in standard cases. This is a **move's charge rank**, not the user's Yo-kai character rank; move growth types and special cases can alter requirements.
   - https://www.mtwildwood.net/soultimate-charge.php
   - https://www.mtwildwood.net/soultimates.php
2. **Confirmed broad categories:** Soultimates include attacks against one or more enemies, healing allies, buffs and status effects; move-specific hits/elements/effects differ.
   - https://www.mtwildwood.net/soultimates.php (YKW1-indexed, **do NOT copy YKW1 move tables as fully verified YW2**)
   - https://game8.jp/youkai-watch2/504498
3. **Source-derived one-hit neutral formula used as RESEARCH approximation:** YW2 noncritical Attack one hit = (power + STR)/2 − DEF/4; Technique one hit = (power + SPR) × (1/10+1/3) − DEF/7, clamp 1..999 and guarding ×0.5. This is a simplified subset; real multi-hit Soultimates, crit, accuracy, elements, guard pierce and special animations require separate checks.
   - https://mtwildwood.net/damage.php?g=yw2
4. **Individual YW2 research finding, not official proof:** Nonattacking Yo-kai restore **approximately 5 Soul at the end of their own turn**. The researcher explicitly did not establish attack-gain magnitude. Adjacent Soul-boost equipment appears dependent on gauge cap. This is evidence to prioritize an *owner-turn* event, not global regeneration on every battle event.
   - https://note.com/ricosama0726/n/n14710bbe446c
   - https://game8.jp/youkai-watch2/504498
5. A hit against a charging opponent can interrupt Soultimate. The game-code-derived chance incorporates how often already hit, lost HP fraction, specific move bonus and critical.
   - https://www.mtwildwood.net/soultimate-charge.php

## Actual code added / changed

- `engine/soul.mjs`: `SOULTIMATE_CHARGE_BY_RANK`, `soulCapacityForRank(rank)`, opt-in rank-derived meter capacity while preserving old fixture defaults and allowing overrides.
- `engine/special-effects.mjs`: **pure effect planner** with strict configurations for 1-target/all-front offensive attacks and all-front healing. Emits per-target HP deltas without mutating the original rosters. No resurrection and no HP overflow.
- `engine/combat.mjs`: `researchSpecialEffects` is **OFF by default**. When enabled, a successfully charged Soultimate/G move can apply test-fixture attack or healing effects with real HP changes, KO, win handling and action logs. Numeric per-rental powers and flat healing are **fictional fixtures**, not imported original move stats. G doubles the **power input**, not necessarily the final damage number, which is only a provisional approximation.
- `researchSoulRecoveryMode:'owner-nonattack'`: separate opt-in behavior, +5 to the **actor only**, after guard, loaf, positive/negative Inspirit, or healing technique; ordinary physical/damaging technique attacks accrue **0 for now only because exact attack recovery remains unknown**. The previous global `researchSoulGainPerAction` parameter is retained as a separately selected debug mode; enabling both is rejected.
- All normal and research-Soultimate damage now use a shared charge interruption evaluator. Lethal special strikes invalidate enemy pending charge, do not spend the enemy's Soul, and disable its action eligibility; nonlethal strikes track hit-dependent interruption probabilities.
- `lab/phase2.html`: **explicit research mode** enables fictional special effects and owner-turn +5 gain. The UI describes speculative formulas as such; a successful gesture now changes HP and emits a special-effect battle log.

### Deliberately not represented as YW2 truth

- The move distribution, 100/75 fixture power, flat HP restoration, single-hit/scope presets, guaranteed hit, lack of elemental effects and G potency details are **design/testing assumptions**.
- Precise "5 Soul" depends on the player's action classification; our classification of healing/guard/loaf/Inspirit as nonattacks remains a working hypothesis.
- No credible value was established for Soul gain on attack; marking it 0 is only a temporary simulator choice, not an assertion that YW2 grants 0.
- The automated special takes place without consuming main scheduler action time; real YW2 active animation overlaps and no-motion technique remain unverified.
- HP results and load tests are **not a substitute for side-by-side original match replay testing**.

## Test evidence

- `tests/special-effects.test.mjs`: 8 pure effect and rank tests.
- `tests/combat-special-effects.test.mjs`: 6 combat integration tests, default compatibility, HP cap and win.
- `tests/soul-recovery.test.mjs`: 4 owner-turn gain and invalid dual-mode regression tests.
- `tests/special-interrupt.test.mjs`: 2 Soultimate-to-Soultimate interruption tests.
- **GitHub Actions on the actual feature branch:** **111/111 pass**, 0 fail, 0 skip; same run's real Chromium also loads the branch HTML+ESM and exercises Soul buttons, Charge open/cancel, sleep/rotate/purify, G mode, then completes a pointer gesture and checks enemy HP decrease and battle-log entry.
- CI: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39913499508
- Verified commit: `111e521af1f64c1e0a0a8e71574ba90784f753d0`.
- **No school iPad Safari, two-client Firebase, or Google Sites embedded-code verification yet.** No final art-quality review.

## Next engineering gates

1. Verify YW2 Soultimate per-move power/targets/multi-hit rules and healing with original gameplay samples. Separate data from formulas.
2. Pin down normal attack and offensive technique Soul recharge, move-level charge reductions, special character ranks/charges and adjacent equipment stacking from YW2 research.
3. Implement charge-completion and action-animation queue timing for existing PvP tricks (no-motion Soultimates, multi-Soultimate chains), and honest 5-action forecast under pending specials.
4. Reproduce Zero Poke touch minigame and Soul reward/target conditions.
5. Real two-client determinism + network authority, old iPad Safari touch and performance, and single-HTML Google Sites direct-copy embed.
6. Do not merge or publish to `main` or the current Google Sites version without user review. No paid services.
