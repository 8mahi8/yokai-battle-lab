# Phase 5B — Counter-Soultimate timing, target locking and deferred HP

**Date:** 2026-10-23  
**Branch:** `feat/phase1-action-circle-lab-20261023`  
**Status:** SOURCE-GROUNDED RESEARCH PROTOTYPE, **not** a verified complete original Yo-kai Watch 2 reimplementation. No changes to `main` or the published Google Sites embed.

## Sources and the essential competitive distinction

- [たくトンボ, 2026-08-03, original competitive mechanics notes](https://note.com/tombow_yw/n/n1e4cf179d2d9):
  - Counter Soultimate: begin charging during an opponent's Soultimate cut-in.
  - **Charge-complete label appears during cut-in**: the counter hits the front lineup that was out at that moment.
  - **Not complete during cut-in**: normally hits the front roughly **0.5 seconds after cut-in ends**.
  - **Exception**: when the opponent Soultimate consumes **two Endure (我慢)** resources on the countering side, the latter case may instead hit the front that was out *during the cut-in*.
- [マグロ, competitive overview, 2024](https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c): multiple wheel rotations during special timing can coalesce into the latest visible wheel state. This is a distinct tactical issue, not identical to simply displaying each intermediate rotation.
- These are experienced players' observational reports. **Not a published frame-by-frame reverse-engineering of the 3DS executable.**

## Important modeling choices and uncertainties

- Counter cut-in length is a configurable **research fixture** (UI uses 800 ms), not an original-game value.
- The 500 ms late-hit delay is reported as **approximately** half a second, not an exact game-engine constant.
- When a charge completes **before** the cut-in ends, target IDs lock at the charge-completion timestamp. The lab stages actual damage at the cut-in end; this latter **damage timing choice is provisional**.
- For a late charge, if it completes *after* the nominal cut-in+500ms mark, the stage time cannot predate completion; use max(completion,cut-in-end+delay). This is a safe scheduling fixture, not an original rule.
- The two-Endure exception currently freezes **the original cut-in front at cut-in start**. The source says a lineup visible *during the cut-in*; whether the engine actually locks it at its start, at the last hit, or another frame has **not been verified**.
- An earlier target lineup can still be hit after it rotates into the bench, because the targets are locked. This is a model of the player-reported targeting behavior, not original on-screen spatial rules.
- The existing one-hit special damage/HP, G power, hit chance, Soul gain and buffs are **unverified rental fixtures**. Only the cut-in target/clock distinction is being tested here.
- Exact hit priority when the opponent uses a counter in response to a counter, Endure mechanics, action-point time vs real time, online lag and cut-in animation frames are not reproduced.

## New code

### `engine/counter-window.mjs`
An isolated deterministic, validated cut-in/front/charge/hit research model:
- `beginCutin({attackerSide,durationMs,enduresSpent})`
- `beginCharge({side,token})` only for the opposing side while cut-in is active
- `completeCharge({side,token})`: choose `frontLock: 'completion' | 'impact' | 'endure-exception'`, a due time and optional locked target IDs
- `cancelCharge(...)`, `setFront(...)`, `advance(ms)`
- Defensive copies, duplicate-charge prevention, immutable hit logs and validated input/lineups
- `setFront` validates BEFORE mutating current frontlines, avoiding partial modification on bad input.

### `engine/combat.mjs`
Research-only opt-in `researchCounterTiming:true`, **requiring both `researchPresentation:true` and `researchSpecialEffects:true`**:
- `beginCounterCutin({attackerSide,durationMs,enduresSpent})` starts a counter hit window AND presentation cut-in motion (both clocks start from zero and move together). Duration validated against both timer ranges before either clock mutates.
- `prepareSoultimate` begins tracking real Soul charges only when the caster is opposite the active cut-in. Guided pointer challenges route through the same code.
- `resolveSoultimate` consumes valid Soul at completion but **queues** actual special HP effects and returns `effectStatus:'pending-counter-hit'` when tracked as a counter. Previously implemented ordinary specials remain immediate when no active tracked counter charge exists.
- `advancePresentation(ms)` moves BOTH research clocks. At due time, it resolves enemy HP for the frozen/live lineup as required, updates KO/winner and records a `counter-hit` event. Once-only hit record prevents double damage.
- Changes to the watched team's wheel update its recorded front before hit; invalid/disallowed charge, Watch mode change, own rotation and attack interruption properly cancel tracked charge.
- Old default `createCombat()` behavior is preserved and unaffected, including absence of counter state in default snapshots.

### `lab/phase2.html`
- Additional **カウンター必殺・当たる前衛（研究）** controls:
  - `B必殺カットイン 800ms`
  - `我慢2個・カットイン` (manual experimental condition; the game doesn't model genuine Endure yet)
  - Existing opponent clock 250ms / 1000ms increments and team's wheel rotation.
- Displays B's current front, cut-in window, pending counter hit time, `frontLock` category, final target IDs, and a counter-hit battle log.
- Real touch charge stops at completion, while an actual counter hit visibly applies HP only after the research clock reaches its scheduled hit time.
- The display intentionally labels all timing/specs as research, not completed original-game rules.

## Verification

- `tests/counter-window.test.mjs`: 12 pure timing/target/cancel/exception tests.
- `tests/combat-counter.test.mjs`: 6 actual-engine HP-hit, early/late/endurance, cancellation and feature-gate tests.
- `tests/counter-regressions.test.mjs`: atomic validation and once-only resolution checks.
- `tools/browser-smoke.mjs`: browser opens the actual checked-out HTML+ESM, clicks controls, completes a real synthetic-pointer Soultimate challenge, verifies HP is unchanged before the cut-in resolves and decreases at the simulated hit time, checks battle logs and wheel/front retention.
- CI results should be taken from the latest successful workflow, not inferred from local/previous runs.
- **NOT verified:** physical iPad Safari finger input, multiplayer guest perspective, real network time alignment or final Google Sites inline embed.

## Next priorities

1. Research exactly WHEN an enemy front locks during the two-Endure exception, and wheel-rotation coalescing during delayed opponent views; split screen recordings could settle much of this.
2. Establish move-specific damage-hit frames, charge-vs-animation scheduling and interaction with ordinary auto attacks; current separate virtual milliseconds and action-point units remain fundamentally independent.
3. Implement real Endure effect (not merely the checkbox), multi-hit special targets, KO-driven forced wheel rotation and no-target handling in appropriate order.
4. Only after those tests, add authoritative host/guest transport and deterministic replay safeguards; test old iPad Safari. **Do not publish to main/Google Sites automatically.**
