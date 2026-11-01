# Phase 5C — double wheel rotation, target selection and timestamp boundary QA

**Date:** 2026-10-23  
**Branch:** `feat/phase1-action-circle-lab-20261023`  
**Purpose:** Research a competitive Yo-kai Watch 2 rotation behavior while keeping the already tested combat branch and release untouched.

## Original-player research and fidelity boundary

The competitive player **マグロ** reports a "サークル回ってないバグ" where, **if the player rotates the wheel twice without a Yo-kai acting**, the first of the two wheel positions is not reflected in certain Soultimate targeting windows; the latest position is. Their example differentiates charge complete **before** versus **after** the second rotation: before -> original front; after -> final front. The intermediate rotation has no effective target window in that case.

- Primary player account: https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c
- Independent description of wheel changes being hidden from the opponent during an existing long move animation: https://note.com/tombow_yw/n/n1e4cf179d2d9

**Important limitations:**

- This is a player's interpretation of the original game's observed behavior, not a verified 3DS source-code rule. The exact event/frame cutoff, cases with 3+ rotations, unusual animation boundaries, simultaneous hit/rotation, and whether the same rule applies outside cut-ins are **unknown**.
- The research model assumes the turn-pair window lasts until an **ordinary automatic Yo-kai action**. Treat this as testable hypothesis, not original verified timing.
- When the first-turn counter target has been locked, **we may correct that lock only if the second turn arrives before HP has actually been applied**. This temporary correction is a simulation technique so previous results remain testable; no claim that the 3DS game literally writes retroactive target records.
- Physical wheel positions update immediately on input. Opponent visual presentation and deferred hit-target selection are **distinct layers**.
- If only one rotation happens, we preserve the already tested single-rotation behavior.
- Exact simultaneous hit-vs-rotation ordering is not sourced. Our deterministic boundary processes a previously scheduled due hit before the new rotation, preventing data loss; this is a **safe implementation rule**, not a claim of original input priority.
- Existing source-backed charge cost and broad counter targeting are not a reason to assert rental character stats, one-hit formulas, or precise Soultimate move powers are original.

## Actual implemented code

### New: `engine/wheel-coalescing.mjs`

Pure opt-in research model:
- Records each side's physical wheel/frontline and a group of rotations since the last ordinary automated action.
- After the **first** rotation, tracks any still-pending, completion-locked counter hit using its hit ID.
- At the **second** rotation without an intervening ordinary Yo-kai action, produces a correction to the **pre-first-rotation front** for those hit IDs.
- A special charged **after** the second rotation already targets the final front, and is not corrected.
- `actionBoundary()` clears pending correction candidates for both teams.
- `finalizeHit()` prevents corrections to damage that has already happened.
- Strict, defensive copy and identity checks prevent invalid frontend lineup arrays or duplicate tracked hits from mutating the engine.

### Changed: `engine/presentation-timeline.mjs`

New opt-in `coalesceRotations:true`:
- A queue of wheel changes hidden during an animation reveals **only the final rotation from each side**, unless a normal auto-action occurs between them.
- Keeps the chronological slot of the final rotation. Interleaved separate-team actions and completed charge events are not lost.
- The final UI event includes the front IDs and `collapsedRotations` count so it is clear that an intermediate render was suppressed.
- Without the opt-in, earlier presentation behavior is unchanged.

### Changed: `engine/counter-window.mjs`

- `revisePendingTarget({hitId,targetIds,reason})` can correct **one still-pending early-completion lock only**, before its actual impact timestamp.
- Rejects revisions after the hit, and rejects modifying late-hit target strategy or a previously revised lock.
- **Bug fix:** `setFront` no longer silently flushes and discards a timestamp-due counter hit. It returns `hit_due_resolve_first` if asked to rotate before the pending impact is dispatched.

### Changed: `engine/combat.mjs`

- New independent research switch `researchWheelCoalescing:true`. Requires existing `researchCounterTiming:true` (which itself requires presentation + special research).
- Updates both counter targeting and opponent presentation on real wheel input.
- If a two-turn window supersedes the intermediate front, changes the pending counter target and adds a `wheel-target-correction` log.
- Real deferred special damage uses the corrected list at impact (including units now benched); HP/KO/winner and the previously implemented interrupt evaluator remain active.
- An automatic Yo-kai action resets wheel-pair candidates.
- When wheel rotation or the next automatic action occurs at a hit already due on the independent counter clock, the game **first executes `advancePresentation(0)`** to apply HP and log exactly one counter hit, then processes the new action.
- Defaults remain opt-out, preserving prior simulations.

### Changed: `lab/phase2.html`

- Enables this experimental switch in the **laboratory only**.
- Displays current physical B wheel front, current group rotation count, and any intermediate-front target corrections.
- Includes a shortcut to rotate B twice and a step-by-step explanation of **B first rotation → A charge finished → B second rotation → target correction → hit**.
- All animations, 800ms cut-in and ~500ms delayed hit remain test fixture time scales, not original hardware values.

## QA evidence

- `tests/wheel-coalescing.test.mjs`: 8 pure group and correction tests.
- `tests/rotation-visibility.test.mjs`: 8 presentation suppression, event-order and opt-out tests.
- `tests/combat-wheel-coalescing.test.mjs`: 6 whole-battle target/HP tests, including first-rotation suppression when charge finishes between rotations, second-rotation final front, one rotation, late hit and damage finalization.
- `tests/counter-due-boundary.test.mjs`: 4 regression tests for a counter impact due exactly when wheel/autonomous action occurs.
- **Latest verified branch CI prior to documentation commit:** https://github.com/8mahi8/yokai-battle-lab/actions/runs/39921476753
  - **180 tests PASS, 0 FAIL, 0 SKIPPED.**
  - Actual GitHub checkout HTML/ES modules rendered in headless Chromium. Synthetic pointer challenge completed, opponent no-motion gate validated, early counter HP change deferred, and a complete **two-rotation touch counter** reproduced original-front targeting and excluded the intermediate position.
- Chromium uses synthetic PointerEvents; this does NOT validate finger feel or Safari compatibility on a real school iPad.
- The multiplayer version and directly copied **Google Sites HTML embed code do not exist yet**; no claim of school online playability.

## Remaining gates

1. Side-by-side Yo-kai Watch 2 screen-recording comparison of 1/2/3+ rotations, action boundaries and charge timing.
2. Integrate the research timeline with a single authoritative event clock instead of independent action points vs milliseconds; enumerate genuine skill-hit animation timing.
3. Real Endure trigger/consumption, cut-in lock frames, direct touch purify/Poke and truthful Soul gains.
4. Before release: faithful low-cost browser art, old iPad Safari physical testing, then two-player authoritative online transport and single-HTML Google Sites embedding.
5. **Keep main, published Google Sites and active Firebase untouched** until user opts to publish. No new costs or services.
