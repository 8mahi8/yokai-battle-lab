# Phase 5 — opponent-visible motion / no-motion Soultimate timing

Date: 2026-10-23
Branch: `feat/phase1-action-circle-lab-20261023`
Status: **research-only presentation prototype; not an authentic YW2 frame scheduler or online replication layer**.

## Evidence, interpretation, uncertainty

The useful competitive mechanic is not a Soultimate with zero actual charging time. A player may *complete* a Soultimate charge while a preceding Inspirit, Purification, opponent Soultimate, or other combat animation occupies the opponent's visible screen. The opponent sees earlier wheel/charge changes only after the current animation ends. A completed charge then becomes visible essentially as the Soultimate release. This is called **ノーモーション必殺** because the charge animation is hidden from the opponent.

Sources:
- Direct 2026 competitive player's explanation of delayed wheel state, no-motion, counter Soultimate and motion overlap:
  https://note.com/tombow_yw/n/n1e4cf179d2d9
- A second independent player's 2024 explanation of common opportunities and practical timing:
  https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c
- Community Q&A: charge must begin while the other motion is still running, not only after its final text appears:
  https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q13280480983

**Source fidelity boundary:**
- **Observed:** delayed display of wheel state; commands entered during motion can be buffered visually; charge completed before that motion's end can appear almost instantaneously to the opponent.
- **Unverified:** exact motion duration per move, game-frame ordering, animation blocking precedence, touch gesture real-time duration, zero-motion hit timing, precise counter-Soultimate lock, server authoritative event order, latency interpolation and whether all the opponent UI is held identically.
- Animation durations in the present lab (1000ms buttons, etc.) are adjustable **research fixtures**, not measured 3DS timings.
- Combat's `pointsElapsed` is a priority-debt count, NOT milliseconds. Do not silently map it to the presentation clock.

## Implemented changes

### `engine/phase1.mjs`

The non-mutating tentative `predict(count,actionWait=3)` can now use any supported `step(actionWait)` multiplier (0..10). This is an *internal simulator consistency* property, not the original action-scheduling formula for special animations.

New tests check six action-wait multipliers across four seeds with 20 forecast entries per seed, matching stepped actor identities and cumulative debt time without mutating the live scheduler.

### `engine/presentation-timeline.mjs`

A pure, dependency-free deterministic visualization clock:
- `beginMotion({durationMs,kind,actorId})` locks visible presentation through the motion end.
- `record({side,kind,token,memberId,detail})` accepts validated events: ChargeStart, ChargeComplete, ChargeCancel, Rotate, WatchMode and Action. The game does NOT wait for the opponent display before updating its private combat state.
- `advance(ms)` advances this **separate** presentation clock and releases blocked inputs at the exact simulated motion finish timestamp.
- ChargeStart + ChargeComplete within the **same visibility block**, same team and charge token become one `specialRelease` with `hiddenCharge:true` instead of a visible starting gesture. If the charge is unfinished at animation end, the opponent sees `chargeStart` and later sees a separate `specialRelease`.
- ChargeStart + ChargeCancel entirely inside the same block is hidden; rotated wheel events still appear when the block ends.
- Overlapping motions extend the display gate to the latest end. Opposite sides' independent charge tokens never suppress one another.
- Defensive snapshots, bounded visibility log, strict event/time/token input validation.

This models a **view-layer gate**, NOT packet latency, priority order, damage frame, damage application timing, anti-cheat or a true multiplayer host/guest state channel.

### `engine/combat.mjs`

`researchPresentation:true` opts in. Defaults unchanged. This option wires the timeline into actual laboratory actions:
- `prepareSoultimate` → ChargeStart
- `resolveSoultimate` → ChargeComplete or ChargeCancel (only for the valid active token)
- `beginGuidedCharge` / touch `chargeInput` automatically follow the above path
- Wheel rotation and Watch mode change → visibility events
- Hit/KO interruption → ChargeCancel
- Normal BOT `step()` → Action
- New optional research controls `beginPresentationMotion()`, `advancePresentation(ms)`.
- `snapshot().presentation` only appears if enabled.

### `lab/phase2.html`

The research laboratory includes a side panel titled **相手に見える演出（時間差研究）**. Controls begin a hypothetical 1000ms animation and advance the independent display clock in 250/1000ms increments. A last-seven-event display shows when inputs become visible and tags a completed inside-motion charge **ノーモーション必殺**. The touch charge panel also permits advancing this view clock.

### Test coverage

- `tests/presentation-timeline.test.mjs`: 11 tests of hidden charge, visible slow charge, cancellation, overlap, tokens, independent sides, input validation, immutable snapshots and exact unlock timestamp.
- `tests/combat-presentation.test.mjs`: 7 integration tests using real combat charge tokens, a guided touch charge, Soul costs/HP effects, mode switch, wheel rotation, concurrent sides, action masking and legacy-mode absence.
- `tools/browser-smoke.mjs`: extended Chromium interaction smoke, where the user starts an animation, completes the real pointer charge mini-game and sees HP change immediately on the lab side, but the opponent visibility log reveals `ノーモーション必殺` only after the simulated gate is advanced.
- Existing action wait regression: `tests/preview-action-wait.test.mjs`.

Check run status on the branch's GitHub Actions tab. Do not claim green CI before the workflow reports success.

## Safety and release gates

- Keep the old model available by default, not new mandatory wall-time work.
- No original-character 3D models or branded sprites have been introduced.
- **Not complete:** damage timing at animation ends, real animation lengths, pin/rotation locks, hit acceptance during cut-ins, counter special, G-tech hit frames, actual 3DS motion priority, network transport or direct Google Sites embedding.
- Must still test browser touch with a real school iPad (old Safari) and two peers. The Chromium synthetic-pointer smoke is not equivalent to actual hardware.
- Do **not** merge to main or publish the Google Sites build without an explicit user release decision.
