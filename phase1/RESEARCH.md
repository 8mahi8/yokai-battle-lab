# Phase 1: action order and wheel — research record (2026-10-23)

## Sources and confidence
- https://mtwildwood.net/turn-order.php?g=yw2 — fan datamining reference. Describes front-line wait counters, lowest wait acts, initial randomized wait, post-action wait = move wait × speed weight, rotation-in = 3 × speed weight. YW2 move wait usually 3, system actions 0. **High-confidence researched, not official confirmation**.
- https://note.com/tombow_yw/n/nfb9184c724cd — Japanese competitive research, speed threshold and post-action point formula. **Researcher claim**, useful cross-check.
- https://gamepedia.jp/youkai-yw2/archives/1408 — six fixed wheel slots, front/back rotation; formation ordering cannot be rearranged during battle. **Guide-level confirmation**.
- https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c — rotation timing, visual updates, animation lockouts. **Competitive observation**, not yet implemented.

## Implemented
- Two six-unit teams; three adjacent active slots selected by rotating wheel offset.
- Speed-weight lookup transcribed from YW2 speed table; each action resets wait to 3 × speed weight.
- Active wait counters advance by subtracting minimum until next action.
- Newly rotated-in units receive 3 × speed weight. Bench wait is suspended.
- Seeded deterministic initial order and event log; Node tests.

## Provisional / not original-faithful yet
- **Initial wait** uses a temporary seeded approximation. The published YW2 speed table provides precise initial random intervals; transcribe and verify before fidelity claims.
- Tie-break for equal waits is stable side/slot order **only for debugging**, not confirmed from original.
- Wheel rotation lockout and queued rotation while animations run, wait preservation for swapped-out units, status/death edge cases: not yet researched enough to claim fidelity.
- This is a headless research engine, not playable combat; no damage, actions, personality, HP, animation, UI or online.

## Validation
- Ran Node.js test locally on 2026-10-23: PASS, 1000 reproducible action events; speed boundary checks and wheel/bench assertions.
- No browser screenshot or school iPad test. No main or Google Sites modifications.
