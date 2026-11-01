# Phase 10 — Core rental combat: per-hit moves, harmful Inspirits and healing

Date: **2026-10-23**
Repository: https://github.com/8mahi8/yokai-battle-lab
Development branch: `feat/phase1-action-circle-lab-20261023`
Status: **implemented, Node-tested, Chromium-tested research prototype**. No change to live `main`, Google Sites direct-embed or production Firebase. **Flash Soul stays absent from the initial version** (its former Phase 6 model is research-only and default-off).

## 1. Primary research and what is established

**Multiple attacks and damaging techniques:**
- https://mtwildwood.net/damage.php?g=yw2 — formulas for 1 hit, hit count, defense, spread, critical and elemental effectiveness.
- https://mtwildwood.net/ja/yw2/yokai/firewig and https://mtwildwood.net/ja/yw2/yokai/lava-lord — concrete YW2 move calculations for 3-hit moves.
- Correct **damage of EACH of N hits**, e.g. normal physical: `(Power + Strength/N)/2 − target Defense/4`; critical uses `(Power + Strength/N)/1.5 − critical Defense/10`. For techniques substitute `Power + Spirit/N` into elemental normal/critical formula.
- **Important correction to earlier Phase 9:** defense is subtracted in full ON EACH HIT. The old helper wrongly divided the entire expression, including defense, by hit count. That was caught by cross-checking per-Yo-kai source move pages, fixed in `engine/damage-model.mjs`, and the tests updated. The one-hit formula never changed.
- Original multi-hit move counts and per-hit critical/accuracy values are move-specific; using independent seeded RNG draws per hit is our research implementation. Exact animation-frame scheduling, pin changes mid-move, interrupts per timing frame and multi-target skills remain NOT fully verified.

**Harmful and positive Inspirits:**
- https://mtwildwood.net/inspirits.php?g=yw2 — Inspirit types, sign, 1–4 levels, negative effects generally persisting until purification, positive normal effects lasting 30 battle actions, owner-turn duration where explicitly configured.
- https://mtwildwood.net/yw2/moves — concrete `Loses HP each turn`, `Restores HP each turn`, Strength/Spirit/Defense down, and immobility types.
- https://mtwildwood.net/ja/yw2/yokai/peppillon and https://mtwildwood.net/ja/yw2/yokai/lava-lord — explicit positive HP recovery after owner turn of approximately 5% max HP per level up to Level 5, and the stacking/offset behavior.
- **Important uncertainty:** applying exactly that 5%-per-level coefficient to ALL negative HP-loss Inspirits is a TESTABLE HYPOTHESIS, not a verified rule for each original move. The mathematical interaction of negative and positive HP effects, rounding order, poison lethal priority, and effects that can expire on a hit are also marked research-only. The lab uses original INVENTED monster effects, not cloned Yokai attributes.

**Healing techniques:**
- https://gamepedia.jp/youkai-yw2/magics/3171 — original YW2 healing technique power classes 20, 50, 80.
- https://note.com/atoato429429429/n/nfefe8749d432 — detailed Sep 16, 2026 two-3DS examination indicating approximate ±10% variance and ±1 widening in healing results.
- The **BASE YW2 HEALING EQUATION IS NOT VERIFIED** in these public sources. The former research formula `floor((techniquePower + Spirit)/3)` is kept with label `unverified-base-healing-fixture`; do not represent this as 3DS fidelity. Spirit-up/down stage and bounded seeded ±10% spread can be compared experimentally.

## 2. Actual code changes

### `engine/damage-model.mjs` corrected
- Per-hit physical and elemental technique formulas calculate `Power + attackerStat/hits` before each hit's **full** defense subtraction. This fixes the previous overestimated multi-hit damage.
- `deriveStatStage(effects,'strength'|'spirit'|'defense')` now nets compatible positive and negative stat levels, caps at -8..+8 and applies the established W2 stat-stage table. `calculateOneHit` takes `defenseStage` to affect both ordinary and critical defense separately.

### `engine/combat.mjs` new opt-ins
- **`researchMultiHit:true`** (requires `researchDamageModel:true`): validates per-member `attackHits`/`techniqueHits` 1..9; normal attack and damaging technique independently determine each hit's accuracy, critical chance, element/resistance, spread, HP impact and charge interruption. Target KO stops the remaining hits. Records per-hit trace and aggregate damage in `action.multiHit`. Does NOT fake simultaneous multi-hit gameplay as a verified timing model.
- **`researchTurnInspirits:true`** (requires `researchDamageModel:true`): supports the new originally sourced categories `strength-down`, `defense-down`, `spirit-down`, `hp-loss`, `hp-regen`. They work with status level, owner-only turn-end HP deltas, cancellation through bench Purify and real HP/KO logic. Exactly 5%/level for HP loss is **fictional research math** until original side-by-side comparison.
- A new auto-actor with harmful Inspirit can select eligible living front targets and applies researched statuses via the same resistance and existing four-action selection process.
- **`researchHealingVariance:true`** (requires `researchDamageModel:true`): uses pure healing helper, source-inspired ±10% roll but **unverified base equation**, real Spirit stages, healing cap, deterministic RNG and `action.healingResearch`.
- All three switches default to FALSE. Existing default zero-Flash original rental combat is preserved; research `lab/phase2.html` opts in to them.

### New pure modules
- `engine/turn-inspirit.mjs`: isolated signed owner-turn HP status effect, independent positive/negative levels and HP caps, explicit uncertainty label.
- `engine/heal-model.mjs`: pure deterministic heal helper with optional seeded variance input, no secret RNG and an explicit provisional-base label.

### `engine/selection.mjs` updated
- Supports checking positive and negative Inspirit categories in the action-weight eligibility step, retaining legacy `sleep`/`strength-up` handling.

### `lab/phase2.html` updated
- Research view for **the same original six-character rental team on both sides**. To experiment with basic mechanics, A1/B1 are 3-hit physical users, A4/B4 can use 2-hit damaging techniques, A5/B5 have positive HP regen Inspirits and A6/B6 have negative HP loss.
- Lab shows **hit count, amount, attribute modifiers, turn-end HP loss or gain, healing result/spread**. Exact rental character element, attack power, Inspirit chances and turn-effect percentage are design fixtures.
- Research already includes Zero Poke, five Purify touch minigames, Soultimate gesture and counter timing. No flashy animated sprites or new cost.

## 3. QA and what it PROVES

- `tests/combat-multihit.test.mjs` — 7 integration tests: individual accuracy/crit and hit log sum, damage after each hit, KO stops future hits and scores one knockout, 80-turn deterministic replay and backwards compatibility.
- `tests/turn-inspirit.test.mjs` — 6 pure tests for 5%-level HP effects and caps, signed cancellation, no excess negative HP and defensive validation.
- `tests/combat-turn-inspirit.test.mjs` — 8 integration tests for HP loss only after its own action, weakness stages, negative Defense affecting actual damage, Purify canceling negative, research gating, AI negative Inspirit and seeded replays.
- `tests/heal-model.test.mjs` — 5 tests: provisional one-third heal calculation, ±10% spread, Spirit debuffs/buffs, HP clamp and invalid inputs.
- `tests/combat-healing-research.test.mjs` — 4 tests: a real BOT healing action, Spirit-down changes, fixed seed and strict opt-in.
- `tools/browser-smoke.mjs`: actually loads branch's ES modules into Chromium and clicks/operates battle, verifies 3-hit battle log, research modifiers, all five Purify touch gestures, Zero Poke, charge/counter and the separate Flash-only research lab.
- **Latest code-only GitHub Actions verified:** https://github.com/8mahi8/yokai-battle-lab/actions/runs/39966776630 — **316/316 Node tests PASS, 0 fail, 0 skipped, ALL Chromium E2E pass**. Documentation-only commits should be checked with their own CI runs before quoting a newer run.

## 4. Remaining initial-launch requirements

1. **Healing base math and rounding must be verified** against original YW2 multiple carefully recorded healing samples; research flag is not approval for publication.
2. Original 3DS real-time multi-hit interruption/animation frames and whether touch input can rotate/lock mid-attack.
3. Each harmful Inspirit's true level scaling, source-specific coefficients, target exclusions, HP-loss lethal/regen priority, correct per-round and death transitions.
4. Move-specific rental data balance (six original characters each side) and accurate Soul gains.
5. Low-cost school iPad **Safari** physical touch and performance QA, true online 1vs1 authoritative state synchronization, guest freeze/lags handling, and **single self-contained direct-embed HTML** suitable for Google Sites.
6. **Do not merge/publish or modify external production Firebase automatically.** No expense, no Flash Soul in initial roster, no user action required yet.
