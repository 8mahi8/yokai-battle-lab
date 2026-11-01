# Phase 13A — Firebase RTDB room transport and isolated SDK/emulator QA
Date: 2026-10-24 JST. Working branch: `feat/phase1-action-circle-lab-20261023`

> **Development only.** Firebase cloud project, live Rules, current Google Sites embed and `main` were NOT changed. No service cost or billing change. First release still excludes Flash Soul.

## Implemented in branch
- [`network/firebase-room.mjs`](../network/firebase-room.mjs): dependency-injected Firebase **compat** database object plus an authenticated UID, without hardcoded project URL/API key; six-digit room-code creation using crypto-backed generation; room collision handling with transactions; unique host/guest seat, no third player, host-only start.
- New root `yokaiRoomsV1/{6-digit-code}` avoids existing BRAWL / Shokoku / soccer room paths. Room record includes protocol version 13, immutable host UID, per-room 128-bit random session marker, createdAt and phase; guest UID claimed once. The session marker is a generation ID, **not** an authentication token.
- Client host/guest publish only their `inputs/host|guest` updates with `clientSeq`, matching room session, and pre-existing match-protocol game commands. Host publishes `state` with monotonically increasing revision; listeners reject wrong-session and stale revisions. `pin(targetId:null)` uses `__clear__` over RTDB and is restored before battle dispatch.
- Full combat snapshots are **serialized as JSON text** (<=128 KiB) to preserve explicit `null` values that RTDB would otherwise remove from nested objects. This is an initial correctness choice, **not** a claim of bandwidth optimization. Receiver decodes JSON and checks revision.
- `watchPresence()` registers `onDisconnect().set(false)` before `presence/host|guest` becomes true; re-arms on `/.info/connected` transitions. This does not yet implement all session race protections or real device sleep recovery.
- Pure Phase 11 match engine and Phase 12 relay modules are unchanged. Serverless Firebase transport and in-browser authoritative host remain *separate* responsibilities; code does not pretend that Firebase Rules validate or execute combat math.

## Test evidence
1. [Node research CI](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40037877854) — 355/355 repository tests passed, including `tests/firebase-room.test.mjs` for two independent mock RTDB clients, collision, stranger denial by client contract, no double input, revision rollback, lost null-pin restoration, and presence registration order. The main branch & the site were not updated.
2. [Firebase SDK + RTDB Emulator integration](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40037975858) — real authenticated-context Firebase SDK and actual RTDB rules, 28 allowed/denied permission assertions plus a real two-client room creation -> guest join -> match start -> guest rotate input -> `createMatchProtocol` commit -> host state transaction -> guest listener snapshot with `winner:null` preserved. Result: **29 checks successful**.
3. A later research CI on the source head [40037975802](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40037975802) passed its Node tests but **Chromium browser smoke timed out during browser startup**; this should not be called green until a rerun or fresh workflow success. The browser smoke tests predate this room adapter, and the new Firebase module is not loaded in the existing two-seat HTML.
4. Before the above fix, tests exposed an incorrect room phase transition caused by the Firebase SDK calling a transaction updater with `null` before the local data cache was ready. Fixed by priming the exact child ref and using the inspected phase on the initial optimistic update. This defect was **not** caught by earlier in-memory mocks.

## Separate Firebase emulator / security boundaries
- `network/emulator/database.rules.json`, `network/emulator/firebase.json` and `.github/workflows/firebase-room-emulator.yml` run only against **demo-yokai-lab** (no real Firebase project), using official Firebase RTDB SDK + rules-unit-testing. Default deny outside `yokaiRoomsV1`.
- Rules require authenticated UIDs, restrict room creation to own hostUID, guest-claim to a different UID while open, host-only phase/state, one's own input and presence, monotonic state revision and room session equality.
- **Not deployable as a production Rules replacement without additional review.** All authenticated users who know/guess a six-digit room code can currently **read** its nonpersonal room state; only seat holders can write input/state. Anonymous UID spoofing is constrained by Firebase Auth+Rules, but this architecture cannot stop the host browser from modifying its own battle simulation. Brute force, quotas, stale room deletion and full session/connection identity renewal remain to resolve.
- Auth UID is injected into adapter tests. **Real Anonymous Auth sign-in flow**, console configuration, Google Sites SDK loading and live Firebase network availability are not yet verified.
- Current `inputs/guest` uses one latest-value slot, not a durable append-only queue. Caller must keep one in-flight command until host ACK, otherwise quick successive writes could overwrite an unseen packet. Host should publish per-player ack sequence. **Do not announce robust live play yet.**

## Official research references checked
- RTDB [read / transactions](https://firebase.google.com/docs/database/web/read-and-write).
- [`onDisconnect`, `/.info/connected`](https://firebase.google.com/docs/database/web/offline-capabilities).
- [Database Security Rules and validation](https://firebase.google.com/docs/database/security).
- [Emulator with demo projects](https://firebase.google.com/docs/emulator-suite/connect_rtdb).
- Cross-repository comparison: [Phase 13 cross-repo research](./PHASE13_FIREBASE_CROSS_REPO_RESEARCH_20261024.md).

## Next steps — still Phase 13, then Phase 14
1. Connect `createFirebaseRoomClient` with the Phase 12 relay and both players' ACK/retry/snapshot loops. Explicitly include reconnect and round/connection generation guards. Provide a host-updated `clientSequences` / ACK path and ensure no tap inputs are silently skipped.
2. Build a tiny **real two-browser** smoke-test page that performs anonymous Auth, room create/join, two seats rotating and receiving host-only battle state. Run against emulator first. Keep original `lab/match-contract.html` an offline research view.
3. Add bounded timers for RTDB write promises, dead-host handling, idle room cleanup and deliberate failures (disconnect during write, outdated snapshot, browser background wake). Test newer sessions on same code. Check 128 KiB snapshot limits and monthly 0-yen budget exposure.
4. Before real cloud test, obtain user's approval for a **new isolated Firebase project or narrowly scoped namespace** and verify current Rules. A prior 3D soccer research note warns the shared Firebase root rule may expire on **2026-11-08**; do not silently modify existing games.
5. When stable: build Google Sites **code-direct-insert self-contained HTML** and request user to embed, then real Safari school tests. Do not change deployed version unilaterally.
