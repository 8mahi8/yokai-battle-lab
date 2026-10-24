# Phase 14C — Presence and host-restart fencing
Date: 2026-10-24 JST

> Development branch only. **No live Firebase, main, Google Sites or school iPad release**. Uses real original match engine and local Firebase Auth+RTDB Emulators.

## Code actually implemented

- `network/firebase-room.mjs`: `watchPeerPresence(handler)` reads the **other** authenticated seat's presence path. It reports `null` when no prior state, `true` for online, `false` for offline; watchers detach on `leaveLocal()` or returned unsubscribe. `readPublishedSnapshot()` safely reads canonical room state, checks room epoch/session and payload revision, and returns null only for genuinely absent state.
- `network/firebase-match.mjs`: host `start()` now **refuses any existing canonical room state** instead of silently starting a fresh engine with revision 0. Host publishing also treats a concurrent `stale_snapshot` as a fatal `existing_authoritative_state` fencing condition, unsubscribes from guest input and rejects future local actions. This is deliberately **fail-closed**, not successful state restoration.
- `lab/firebase-match-stage.html`: connect/peer-presence status with `watchPresence` and `watchPeerPresence`. When own connection is offline or the peer is offline/unknown, it pauses user actions and host `advanceAuto()`. The same local Auth/RTDB emulator session can resume when the network returns. Adds a guest-only manual **retry pending command** control, using existing same-sequence idempotent `guest.retry()`; it does not invent a new command or bypass ACK.
- Tests in `tests/firebase-room.test.mjs` and `tests/firebase-match.test.mjs`: remote snapshot preflight and wrong-session reject; peer presence transitions and unsubscribe; host restart denial and fenced publish conflict.
- `tools/firebase-stage-smoke.mjs`: **real browser E2E**, with two independent anonymous Firebase Auth sessions. Exercises room create/join, guest input ACK, host inputs, host-only action. Next it runs guest SDK `goOffline()`, checks host observes disconnection and refuses to advance, guest SDK `goOnline()`, and confirms the same game then advances again.
- `tests/firebase-room-emulator.cjs`: extra **real RTDB SDK** test attempts to instantiate a fresh host on a room with an existing state, must reject and leave its state/revision unchanged.

## Verified evidence

- [Full Node/old Chromium suite at Phase14C](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082426599): successful; **368 Node tests** including new host fencing and presence projection tests.
- [Actual two-browser Firebase disconnect/reconnect QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082321722): successful; browser asserts an onDisconnect false event, pause during disconnect, reconnect and resumed authoritative host turn. No external Firebase cloud test.
- [Stage and gesture browser regression](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082426547): successful; original wheel view and canonical 10 touch challenges.
- [Firebase SDK host restart/fencing QA](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082426621): **success**. Log explicitly contains `EMULATOR RESTART FENCE PASS same room cannot rewind to revision zero` and `EMULATOR RULES PASS 33 permission checks`. The extra SDK assertion creates a second host bridge in the already-active room and confirms revision is unchanged.

## Additional read-only battle presentation work

- `ui/match-stage.mjs` and `lab/match-stage.css` now render transient actor action highlights, hit/heal feedback and an action summary from `game.events` **only**; no substitute simulation, RNG, damage or command side effects. Source includes reduced-motion CSS.
- `tools/stage-smoke.mjs` verifies a Chrome-rendered combat action produces exactly one acting-unit highlight after the real authoritative engine advances. [Phase14 stage CI run 40082755474](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40082755474) is **verified successful** (stage actions + all ten touch gestures and screenshot upload).
- Visual presentation remains provisional CSS/placeholder creatures, not acceptable to label a finished release.

## What this DOES NOT solve

- **Full tab/browser reload**: anonymous Auth uses ephemeral memory in local tests; UID can be lost. The host's seeded combat RNG and replay journal are not yet persisted/reconstructed. A new host on the same room is safely *rejected*, not seamlessly restored.
- **True disconnect recovery**: network temporary offline/online for the same open page works; no guarantees for device sleep/browser process eviction, authentication expiration, simultaneous host + guest crashes or cross-device WebKit.
- **Cheating/security limits**: browser-hosted authority can be manipulated; any authenticated user can try to read a guessed six-digit room. Rules must be reviewed before anyone uses a real cloud database.
- **Gameplay polish**: visual assets, sound, action animations, Safari touch pacing and final interface require more development and hardware checks.
- Flash Soul remains OFF. Free-only. No leaderboards/replays.

## Next development

Prioritize reliable host pause on background tab suspension (where timers may stall), an explicit graceful room end/new generation strategy (rather than unsafe silent restart), UI confirmation of pending guest ACK and reconnection, and finish battle animation polish. Keep game logic inside `engine/match-protocol.mjs`; do not substitute a simplified game.
