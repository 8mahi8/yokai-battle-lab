# Phase 8 — Touch-operated purification for the initial rental battle

Date: 2026-10-23  
Branch: `feat/phase1-action-circle-lab-20261023`  
Scope: improve **initial version's basic battle mechanic**, not Flash Soul or other advanced competitive options.

## Source-grounded core

Yo-kai Watch 2's player sends a negatively Inspirited Yo-kai to the back, selects Purify, and carries out a touch challenge; success removes the harmful Inspirit. The game's touch Purify types include **つぶせ (pop), 連打 (repeated tapping), こすれ (rub), まわせ (spin), 斬れ (cut chains)**.

- Nintendo official Yo-kai Watch 2 manual: https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-Yo-Kai_Watch_2_Bony_Spirits — Purify command explicitly requires backline and completing an instruction-driven touchscreen action.
- Game8's YW2 page: https://game8.jp/youkai-watch2/505163 — five named purification gestures and examples for cut/chain and tapping.
- 攻略の虎: https://toragame.com/youkai2/kihon/battle.php — same five gesture types plus an optional super-lucky event in story battles.
- 攻略大百科: https://gamepedia.jp/youkai-yw2/archives/1397 — benched unit and stylus command.

### Fidelity boundary

The five gesture **types and bench-only restriction** are backed by external sources. Exact numbers of orbs, taps, rub distance, rotations and chain links, geometries, input deadlines, gestures' selection weights, extra-exp outcomes, and behavior under net latency remain **original-game unverified**. All numeric sizes are labelled research fixtures. The rare super-lucky event is NOT included in the initial competitive rental mode, since XP is intentionally absent.

## Implemented code

### New: `engine/purify-input.mjs`

- Pure, dependency-free pointer state machine supporting `pop`, `mash`, `rub`, `spin` and `slash`.
- Distinct gesture validation: pop individually placed bubbles, mash within central disc, rub with continuous short pointer travel, circular motion with direction and discontinuity limits, swipe each chain line left-to-right, one pointer-down per new line.
- Progress is a normalized 0–100% value; snapshots are defensive copies; invalid/teleport input cannot magically finish the task.
- Deterministic mode selection for reproducible research; explicit kind override is only for testing UI comparisons.
- No status effects or gameplay values mutate until the combat engine accepts challenge completion.

### Updated: `engine/combat.mjs`

- `beginPurify(side,id,{kind})` checks allied bench membership, living target, active negative Inspirit, no simultaneous own Poke/charged special or ongoing purification.
- `purifyInput(side,{type,x,y})` applies accepted gestures, keeps statuses unchanged during partial progress, and removes negative statuses ONLY on success. Positive Inspirits remain.
- `cancelPurify(side)` discards the gesture without curing. Rotating the target to front, switching Watch modes, or loss of target validity aborts the current attempt.
- Finished purifications are logged as `type:'purification'` with removed effects and `bonusExperience:'unimplemented'`. This does not give fake XP in friend 1v1.
- The existing `purify(side,id)` instant function is retained solely as a **developer debug shortcut for existing tests**; the user-facing lab never calls it. It must not be reused by the future player-network action layer.
- **No Flash Soul** in the initial rental match: the optional Phase 6 Flash experiment remains disabled by default.

### Updated: `lab/phase2.html`

- Benched Inspirited team members have an `おはらい操作` button instead of instant cure.
- Opens a touch-responsive, original-free SVG overlay with a progress bar and distinct visual representation for each of the five kinds.
- Supports pointer down/move/up, progress feedback, cancel, result log and defensive closure when target returns to front.
- A clearly labelled **research-only gesture kind selector** permits testers to compare all five modes. Default runs choose a deterministic mode.
- Notes in the UI explicitly distinguish fictional numeric thresholds and excluded XP awards from sourced rules.

## Verification

- `tests/purify-input.test.mjs`: 8 input-state tests including all five successful gestures, wrong pointer behavior, duplicate pops, spin reversal, teleports and immutable snapshots.
- `tests/combat-purify.test.mjs`: 10 integration tests including bench check, five source-defined gestures, positive-effect retention, status removal only on success, interruption, mode switch, mutual exclusion with Watch Zero Poke / Soultimate, and combat turns while purifying.
- `tests/purify-ui-contract.test.mjs`: validates real player UI wiring, 5 modes, source limitation notes, no use of direct instant-purify shortcut, and inline module syntax.
- `tools/browser-smoke.mjs`: **real Chromium E2E synthetic PointerEvent actions** on the checked-out project. Starts a sleeping A1 on the bench, completes each of all five UI minigames, verifies negative status disappears only after success, tests cancellation after half progress, tests interruption by a wheel rotation.
- Verified after core/gesture UI: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39956769749 — **257/257 Node tests passed**, 0 failed/skipped, and browser-simulation tests for all five gestures and existing battle/Flash research pages passed. Further UI contract tests were committed after this run; consult latest green run before quoting updated count.

## Remaining initial-release blockers

1. Real old-iPad Safari hardware touch responsiveness and performance. Chromium's synthetic touch events are **not** hardware evidence, and availability of PointerEvents depends on Safari version.
2. Original gesture targets, difficulty, time pressure, cancellation or interruption frame behavior, and PvP-specific purification XP (likely intentionally absent from rental).
3. Accurate attack and technique formulas, negative Inspirit odds, action points, healing balance, real Soul gain, Poke outcomes and combat moves.
4. Conversion from research modules to one **self-contained, directly pasted HTML/CSS/JS block** for Google Sites, with correct realtime 1v1 Firebase/Supabase authority and two-device host/guest synchronisation.
5. Do not merge to `main`, publish to Google Sites, or change live Firebase without the user's explicit decision. Keep it free and for friends only.

Current user involvement: NONE needed until school-iPad and multiplayer prototype actually ready for evaluation.
