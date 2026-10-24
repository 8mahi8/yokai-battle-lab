# Phase 14B — Pointer QA & Firebase same-sequence hardening
2026-10-24 JST | Original-game development branch only. **No main/Google Sites/public Firebase deployments.**

## Changes committed

1. `ui/match-stage.mjs` and `lab/match-stage.css`:
   - Added read-only, trial-snapshot-derived SVG guidance for charge `align` (real target clock number and hand), purification `slash` (correct chain segment endpoints/sequence), and charge `trace` (point path).
   - Ignore second pointer while the first pointer gesture is active, rather than transferring control mid-drag.
   - **Pointer cancellation does not synthesize a tap.** For active drag trials it emits a standard `up` to safely end the drag without granting progress; now handles `lostpointercapture` without duplicate completion.
   - Shortened move-sampling throttle 38ms→20ms for better sampled swipe/trace responsiveness, still bounded.
   - Source guidance: [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) and [W3C Pointer Events](https://www.w3.org/TR/pointerevents/latest/). `touch-action:none` remains confined to the mini-game pad, not all document scrolling.

2. `lab/gesture-stage-qa.html`, `tools/gesture-stage-smoke.mjs`, `.github/workflows/phase14-stage-qa.yml`:
   - **Actual Chromium PointerEvent execution** using the real existing `createChargeTrial`, `createPurifyTrial`, `createPokeTrial` modules (not copied tap formulas). The browser stage reads their snapshots and passes canonical commands to the trials. The rest of the combat is fixture state, not a completed real match.
   - Covers all four charge kinds (spin/tap/trace/align), all five purification kinds (pop/mash/rub/spin/slash) and 12-tap Zero Poke.
   - Negative cases: `pointercancel` cannot count as a tap; a second finger cannot steal the first finger's active action.
   - [Verified green stage+gesture browser CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40072500872): log explicitly `STAGE-PASS` and `GESTURE-PASS: real Chromium 4 charge, 5 purification, poke, cancelled pointer, two fingers`.

3. `network/emulator/database.rules.json`, `network/firebase-room.mjs`, `tests/firebase-room-emulator.cjs`:
   - Block same-sequence payload modification at the Firebase Security Rules layer by allowing **strictly increasing** `clientSeq` only.
   - A retransmission of the identical input is served idempotently from an observed stored value; it never rewrites the old `clientSeq` in RTDB. Re-compare after transaction abort or race.
   - Values returned by RTDB may reorder JSON object fields; nested payload identity comparison now uses recursively sorted keys before comparison, not raw `JSON.stringify` field order.
   - Added emulator security negatives for `same clientSeq + different intent` and even direct same-sequence raw writes, plus SDK happy path for same-intent retry and rejection of a changed-intent retry.
   - [Verified green SDK/security CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40072775429): **32 checks**, `EMULATOR MATCH PASS`, `EMULATOR BRIDGE PASS`.
   - [Full research Node+legacy browser regression CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40072775370) and [Phase 14 gesture UI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40072775371) also succeeded.
   - Read [Firebase Rules data vs newData](https://firebase.google.com/docs/database/security/rules-conditions) and [Realtime Database Security Rules API](https://firebase.google.com/docs/reference/security/database) before Rules edits.

## Explicit remaining gates
- This did **not** test the actual touch controller on an old iPad Safari; pointer simulation ran on Linux Chromium.
- The trial UI contract does not mean correct original-game numeric timings or a fully implemented competitive combat animation. Phase14 still needs stronger action feedback and proper character artwork.
- **Host reload, data resync, session expiry, opponent presence and true reconnect are NOT implemented**, and must precede recommending real school friend 1vs1.
- Cloud Auth+RTDB configuration/rules deployment require a separate isolated app and user approval. School Google Sites embeds must be a self-contained HTML/code payload and must not substitute a different mini-game.
- No Flash Soul in the default online battle.
