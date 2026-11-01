# Phase 5D — 3+ wheel rotations, action-boundary tests, and explicit unknown outcomes

**Date:** 2026-10-23  
**Repository:** https://github.com/8mahi8/yokai-battle-lab  
**Branch:** `feat/phase1-action-circle-lab-20261023`  
**Status:** implementation + QA complete for **handling uncertainty**; 3+ original-game rule is **NOT established**. This is not a release candidate.

## 1. What actual external research establishes

**Documented example for EXACTLY TWO consecutive wheel rotations**:

- Experienced YW2 competitive player マグロ explicitly describes this situation: the opponent's Yo-kai does not take an automatic action between the two rotations; the intermediate wheel position is not applied to a particular Soultimate target decision. If the attacker finishes charging before the SECOND rotation, the original front gets hit. If the attacker completes the charge after the second, the final front is attacked.
- Source: https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c

**How action and animation overlap can affect what is shown**:

- Another experienced competitor describes the wheel and charging commands becoming visible only after another long animation, and no-motion Soultimate tactics.
- Source: https://note.com/tombow_yw/n/n1e4cf179d2d9

**Initial battle action-right / Flash Soul**, potentially relevant to what counts as an action boundary:

- マグロ describes the pre-battle chosen initial front getting a weaker priority opportunity than Flash Soul's opportunity. Another experimenter found that the initial eligible frontline is probably determined at matchmaking and Flash Soul appears to expend the priority right, with uncertainty remaining in the observed final action sequence.
- https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c
- https://note.com/ricosama0726/n/n14710bbe446c

**NOT established by searched evidence**:

1. Whether a THIRD/Fourth/... consecutive wheel rotation behaves like adjacent pair cancellation, latest-position-only, ordinary sequential snapshots, or something else.
2. Whether an automatic action triggered by Flash Soul counts as exactly the same boundary as an ordinary attack/heal/guard in every situation.
3. The exact input/frame thresholds for hit-vs-rotation order, delayed viewer synchronization and 3DS hardware timing.
4. Whether paired wheel coalescing visually applies to arbitrary 3+ rotations. The browser currently exposes one possible experimental view but explicitly tags it *unsourced*.
5. A specific priority-right formula. **Do not alter the core turn-order scheduler from the above observations yet.**

This distinction matters: many reproducible tests of our own algorithm would *not* establish it as the original game's algorithm.

## 2. Real code changes

### `engine/wheel-coalescing.mjs`

- A rotation group's 1st and 2nd inputs retain the existing testable **two-turn** research model.
- From its **3rd input onward**, returns structured
  `uncertainty:{code:'three-plus-rotations-unverified',side,epoch,rotations,frontIds}`.
- Maintains bounded, defensive `snapshot().uncertainties` audit history alongside physical front and group count.
- The uncertainty is scoped to the current **no-auto-action epoch** and the relevant team. `actionBoundary()` resets active group membership without rewriting previous unresolved results.

### `engine/combat.mjs`

- Under `researchWheelCoalescing:true` (feature flag only), a pending counter hit affected by 3+ wheel turns is tracked in `uncertainCounterHits`.
- This includes BOTH (a) a charge completing before a 3rd wheel movement and (b) a charge completing AFTER the 3rd movement, as long as the movement and charge are in the same activity group.
- When its research hit timestamp arrives, the game emits exactly one `counter-hit-indeterminate` entry and **does not apply arbitrary HP, KO or winner changes** for that unresolved target decision.
- This is a **research safety behavior**, NOT a claim that YW2 cancels the real attack. Soul may already have been consumed by the charge; this branch deliberately makes the outcome non-gameplay-realistic until target selection is established.
- A rotation on the OTHER team cannot contaminate an unrelated pending enemy hit.
- The already tested 0/1/2-rotation paths remain fully executable.
- A due hit is drained before new wheel/auto-action input (previous Phase 5C boundary regression stays intact).

### `engine/presentation-timeline.mjs`

- Hidden 3+ rotation events may be coalesced for visual experimentation only, but the surviving event carries `unsourcedThreePlus:true` when at least 3 moves were compressed. Two rotations do NOT bear this flag.
- A normal auto-action breaks the visual-rotation group, allowing multiple independent 2-turn sequences.

### `lab/phase2.html`

- New research button **Bを3回連続回転** to contrast the two-turn mechanic.
- Clearly warns that 3+ original hit rules are unknown, and displays **HP変更なし** for an indeterminate simulated hit.
- Its counter timeline labels a timed hit record as **候補/未確定**, not as landed HP damage.
- The opponent view warns when its 3+ rotation aggregation has no verified original-game basis.

## 3. Quality assurance

These are **actual GitHub branch source** tests, not a local-only reconstruction.

- `tests/wheel-three-plus.test.mjs`: 7 scenarios: 3 and 4 turns, action-boundary reset, charge before/after third turn, no invented HP, preserving two-turn damage, opposite-side independence, once-only unresolved hit.
- `tests/combat-wheel-action-boundaries.test.mjs`: 3 actual-combat guard-action boundary tests, including action between wheel turns and an unresolved hit that stays unresolved across subsequent auto-actions.
- `tests/rotation-three-plus-visibility.test.mjs`: 3 display tests for unsourced 3-turn tagging vs 2-turn confidence and ordinary-action boundaries.
- `tools/browser-smoke.mjs`: Chromium loads the **real branch HTML/ES Modules**; synthetic touch completes a counter special. It tests (i) known two-turn target HP and (ii) 3+ rotation **uncertainty warning + no speculative HP changes**. This is not physical iPad Safari finger testing.

Latest confirmed CI after all the above code/tests (before documentation-only commits):
https://github.com/8mahi8/yokai-battle-lab/actions/runs/39926638836  
**193/193 Node tests PASS, 0 fail, 0 skipped.** Chromium render and interaction stages also passed.

## 4. Prioritized original-game experimental protocol

A single original-game clip can settle little; require side-by-side recordings of BOTH peers when possible, or at least a clear attacker-charge / defender-wheel split view.

Keep the same six-character ring in the same order, controlled Soultimate and full Soul, and measure:

| Case | Rotations before auto action | Charge completes | Expected by source | Purpose |
|---|---:|---|---|---|
| A | 0 | At cut-in start | Original three | Baseline |
| B | 1 | Immediately after 1st | 1st rotated front (research model) | Single wheel |
| C | 2 | Between 1st/2nd | Original front (player example) | Documented suppression |
| D | 2 | After 2nd | Final front (player example) | Documented final |
| E | 3 | After 1st, before 2nd | **Unknown** | Unproven 3+ semantics |
| F | 3 | Between 2nd/3rd | **Unknown** | Ambiguous second pair |
| G | 3 | After 3rd | **Unknown** | Final-vs-physical timing |
| H | 4 | Between 2nd/3rd | **Unknown** | Second-pair rollover |
| I | 2 | Auto action between turns | **Requires direct verification** | Action boundary |
| J | 2 | Flash Soul action between turns | **Requires direct verification** | Priority action type |
| K | 2 | Two Endure resources consumed | **Requires direct verification** | Cut-in exception |
| L | 2 | 2nd turn exactly at hit | **Requires frame verification** | Event tie-break |

For each trial, capture: initial order/front before matchmaking, start front, every wheel direction, number of turns, Yo-kai ID and type of any intervening auto-actions, Flash Soul status, special charge start/finish timestamps, opponent visible front on each frame, hit targets/HP, Endure activations, 3DS model and link latency. Flag corrupted/ambiguous recordings.

**No full 3+ rule should be enabled in an eventual school Google Sites release without resolving cases E–H.** This uncertainty handling is suitable for the research branch only.

## 5. Release guardrails and next steps

- Do not merge this hypothesis layer directly into the main game until original YW2 evidence closes the gaps. Keep it opt-in.
- Continue separately researching action-right consumption, Flash Soul and exact turn-point ordering; existing scheduler initial-wait numbers remain provisional.
- Next substantial engineering task: unify battle-action-point and presentation hit clocks, then develop a complete self-contained Google Sites copy-paste HTML and robust two-client room transport. Production state and external services remain untouched here.
- School iPad Safari and real two-device network latency are untested for these Phase 5D changes. Chromium smoke is **not** equivalent.
- No user action, expense, release, `main` change, Google Sites update or production Firebase modification occurred in this phase.
