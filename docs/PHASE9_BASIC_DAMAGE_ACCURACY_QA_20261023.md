# Phase 9 — Basic physical attacks, elemental techniques, hit chance and Inspirits

Date: 2026-10-23  
Branch: `feat/phase1-action-circle-lab-20261023`  
Scope: **initial identical six-rental PvP fundamentals. NO Flash Soul in the launch roster.**  
Status: research-only mechanics model with passing automated/browser QA; **not** finished original-game fidelity or school-iPad deployment.

## Research — sources and confidence

### Battle arithmetic supported by Yo-kai Watch 2 game-data research

- Source: https://mtwildwood.net/damage.php?g=yw2
- For ONE normal attack hit: `X/2 - DEF/4`; critical: `X/1.5 - criticalDEF/10`.
- For ONE damaging technique hit: `element × (X/10 + X/3 - DEF/7)`; critical: `element × (X/5 + X/2.5 - criticalDEF/14)`.
- `X = (per-hit move power × number of hits) + attacker strength or spirit`. The result is divided by number of hits for each hit.
- A single hit is kept between 1 and 999. Unguarded damage has randomized spread of approximately ±10% (+1). Guarding cuts the result.
- **Important limit:** per-hit math is now implemented as a pure helper, but the rental battle engine **still resolves one hit** per move. Do NOT claim original multihit movement/interruption is implemented.

- Source: https://mtwildwood.net/elements.php
- Elemental affinities are specific to the defending Yo-kai and multiply **technique damage**, not normal physical attack damage. The rental affinities in the browser lab (e.g. ×1.5 and ×0.7) are **original project balance fixtures**, NOT properties of any original Yo-kai species.

- Source: https://mtwildwood.net/stat-changes.php?g=yw2
- YW2 status stat steps run -8..+8 with a **nonlinear multiplier table**: -1=.85, +1=1.1, +7=1.8, +8=2. Distinguish the YW2 table from YW1. Only the **positive Strength-up Inspirit** is interpreted as stages in this milestone. The applied 1–4-level skill / actual renter stat adjustment is modeled as a fixture.
- Source: https://mtwildwood.net/inspirits.php?g=yw2
- An Inspirit's chance depends on resistance; positive and negative count separately; default ordinary positive effects last 30 total actions, negative ones remain until Purify unless move specifies its own duration. The existing implementation preserves these. Its per-character negative resistance defaults remain **fictional (20%)**.

- Source: https://mtwildwood.net/hit-chance.php
- Basic hit %: clamp `98 + (attacker speed-target speed)/5`, **75%–98%**. The **normal attack's per-move accuracy multiplier** (0.5–4) then applies; technique has the base speed hit percentage. Other skills and special accuracy effects remain outside scope.

- Source: https://mtwildwood.net/critical-hits.php
- YW2 base critical: **1 in 99**. A Loafing target increases chance by +6/99. Move critical bonuses or complete critical immunity can modify this. Our optional rental bonuses and immunity are for comparing mechanics, not imported original equipment.

- Independent 2026 experimental crosscheck (and an important caution):
  https://note.com/atoato429429429/n/nfefe8749d432
  tests recorded damage 30–120 times on two 3DS units and reports **approximate** critical/technique variants. Some estimates/coefficients differ slightly from Mt. Wildwood's mined tables. When a discrepancy is material, prioritize controlled 3DS side-by-side samples; the current model is explicitly a researched approximation, not guaranteed exact arithmetic at every rounding/variance frame.
- A 2026 researcher also describes physical guard-break overriding the guard reduction only for standard attacks, not techniques:
  https://note.com/isakaakasi/n/na9ec5bdd9571
  This is supported as an optional guarded-attack research input, not a default rental special ability.

## Implemented code, backward compatibility

### New `engine/damage-model.mjs`

- Pure `calculateOneHit` supports normal physical and damaging technique math; normal/critical defense; physical guard-break; elemental technique multipliers; and explicit hit count applied to the per-hit formula.
- `statStageMultiplier(-8..8)` maps the sourced YW2 multiplier table; `deriveStrengthStage(statuses)` accumulates Strength-up Inspirit levels, clamps at +8. Separate validation of elemental resistance map prevents invalid multipliers and unrecognized attributes.
- Never assigns damage/HP or generates random numbers in the pure calculator: deterministic test inputs and source-vs-fixture review remain possible.

### New `engine/hit-model.mjs`

- `yw2HitProbability` calculates precision-preserving speed accuracy and per-physical-move multiplier (not applicable to techniques).
- `yw2CriticalProbability` returns numerator/denominator including +6 against loafing targets, move bonus and critical immunity.
- `rollPercent` consumes only a caller-supplied deterministic RNG sample: no hidden nondeterminism.

### Updated `engine/inspirit.mjs`

- Stores and validates per-application `level=1..4` in status ledger.
- Existing Purify, positive duration 30 actions and negative duration rules preserved. No unsupported status skills silently added.

### Updated `engine/combat.mjs`

- Optional **`researchDamageModel:true`** (default **FALSE**) uses both new pure modules to resolve real attack/technique HP impacts. Tracked numeric values include attacker technique element, defender element multiplier, strength-up stage, critical-defense, attack accuracy, loaf bonus, physical guard-break and individual input move power.
- `buildMember` validates optional `techniqueElement`, `elementResistances`, `criticalDefense`, `inspiritLevel`, `guardBreak`, `attackAccuracy`, `moveCritBonus`, `criticalImmune`.
- Combat events report `damageResearch`, `hitResearch`, `criticalResearch` only when enabled, making real status and numerical calculations inspectable.
- Deep copy of `elementResistances` when returning public snapshots avoids accidental changes through client render views.
- Default rental battles, Soultimate/G/Zero Poke, 5 touch Purify types, action forecasting and Phase 6 Flash OFF remain intact.

### Updated `lab/phase2.html`

- Research-only **matching six-rental lineup on both sides** now has intentionally original `fire/wind/earth/lightning` technique fixtures and different defense affinities. Basic damage research ON for this laboratory, not the default engine.
- The battle log visibly records researched element multipliers, Strength-up stage and guard pierce.
- UI flags every rental type/element/inspirit level as a balance **fixture**, not an authentic 3DS original species stat.

## Verified QA

- `tests/damage-model.test.mjs`: 10 pure calculators/regression cases, including multi-hit single-hit math, source YW2 status-table boundaries and defensive input validation.
- `tests/hit-model.test.mjs`: 5 source hit/critical tests, fractional chance and loaf bonus.
- `tests/combat-damage-model.test.mjs`: 6 integration tests (real elemental HP loss, stages, 20-seed deterministic battle, defensive snapshots, invalid data).
- `tests/combat-hit-model.test.mjs`: 5 integration tests (physical accuracy, technique immunity to physical-accuracy effects, critical immunity, 100-action deterministic run).
- `tools/browser-smoke.mjs`: actual checked-out `lab/phase2.html` rendered in headless Chromium. Opens real equal rental teams, performs action series, and verifies numeric research modifiers are exposed in a battle log; runs all previously added touch/charge/rotation tests and independent Phase 6 Flash research page.
- Confirmed GitHub Actions for complete code/tests **before docs only**: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39960508755 — **286/286 tests passed**, 0 failures/skips; all Chromium smoke stages passed.
- **No old iPad Safari hardware**, real PvP network, two-browser authoritative match, final self-contained Google Sites HTML or production regression test has been performed.

## Priority next tasks — initial rental version, not optional Flash

1. Source-backed healing technique formula and authentic attack critical/variance rounding plus move-level multihit hit sequencing (the calculator currently handles per-hit math only). Do not silently claim source-accurate healing magnitude.
2. More negative Inspirit types (damage-over-time, ally attacks, stat downs), correct target assignment and status action suppression, with strict move-specific levels and test data; currently only sleep and Strength-up are modeled.
3. Accurate Soul gain on attacking turns, Zero Poke PvP rewards and Soultimate per-move effects/durations, source-vs-fixture separation.
4. Finish balanced six original rental designs and light iPad Safari UI. Then two-client deterministic PvP protocol and **single self-contained Google Sites embed code**. Keep it zero-cost.
5. Do not activate Flash Soul in the initial version. No automatic `main`, published Google Sites or production Firebase changes.
