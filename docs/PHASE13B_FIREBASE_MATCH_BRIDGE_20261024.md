# Phase 13B — Firebase match bridge and localhost two-tab research UI
Date: 2026-10-24 JST

> **Development only**: no production Firebase connection, Rules deployment, cost, main merge or Google Sites update. This is not yet a finished online game.

## Code actually implemented
- [`network/firebase-match.mjs`](../network/firebase-match.mjs)
  - `createFirebaseMatchHost`: only host-owned `createMatchProtocol()` applies validated player 0 actions, authoritative player 1 commands and `advanceAuto()`. Local state revision never moves backwards. Host publishes snapshots via the Phase 13A Firebase room adapter; concurrent snapshot demand is coalesced while the write is pending.
  - `createFirebaseMatchGuest`: subscribes to the host's game state, tracks `clientSequences[1]` as its **battle ACK** and does not send a new command while one remains unacknowledged. RTDB acknowledging the *storage write* is not proof the host consumed an intent. Retries reuse the same `clientSeq` and intent. Invalid input is checked locally by the Phase 11 `normalizeMatchCommand`.
  - User input with a delayed/dropped snapshot remains pending; the host already-processed sequence prevents double application. The bridge follows Phase 11/12 revision/sequence contracts, but **does not directly use Phase 12 `createMatchRelay`** (the Firebase adapter provides latest-value rooms instead of push sockets).
  - `retryPublish` and `retry` exist for controlled recovery. A **bounded local FIFO (48 by default)** now stores guest inputs during ACK wait and drains one item per authoritative ACK. This prevents silent rejection of rapid taps due only to pending ACK, but long RTT still means eventual remote tap processing can be delayed. Automatic retry/backoff, connection generation swap, host reload restoration, opponent-presence UI and room expiry **not yet completed**.
- [`tests/firebase-match.test.mjs`](../tests/firebase-match.test.mjs) adds four isolated in-memory coordination tests: two seats + host-only time advance, lost authoritative ACK + replay, wrong-session and stale snapshots, local gesture invalidation, and bounded rapid-tap input FIFO behavior.
- [`tests/firebase-room-emulator.cjs`](../tests/firebase-room-emulator.cjs) adds **actual Firebase RTDB SDK + emulator** match integration, in addition to its earlier rules probes. Two distinct authenticated SDK clients create/join a room, start it, send guest rotate, receive ACK, send guest pin-clear, receive ACK, issue host watch change, and advance a host-only autonomous turn. No mocked data bus for this section.
- [`lab/firebase-match-emulator.html`](../lab/firebase-match-emulator.html) is a **local-only 2-tab manual experiment** with six-digit code, two seats, game state, rotation, watch switch and host step. It is *not* self-contained Google Sites code. It refuses to initialize outside `localhost` / `127.0.0.1`. The Firebase SDK is pinned to 10.8.0 CDN. The Auth emulator runs at 127.0.0.1:9099 and RTDB at 127.0.0.1:9000. `Auth.Persistence.NONE` is set before anonymous sign-in so two tabs under one origin use independent UIDs.

## Verifiable results
- [GitHub Actions Node + existing browser smoke run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40039540411): **360/360 Node tests succeeded**, but **pre-existing Chromium browser QA step timed out on startup** (`--dump-dom` empty; no DOM ever returned); therefore the *overall workflow is failure* and must not be called all-green.
- [GitHub Actions Firebase emulator SDK run](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40039540378): **success**. Emulator logged `EMULATOR MATCH PASS`, `EMULATOR BRIDGE PASS guest 2 ACKs, host command, host-only auto tick`, and `EMULATOR RULES PASS 30 permission checks`. This confirms actual SDK -> local emulator transactions and listeners, **not public cloud connectivity or physical separate devices**.
- The localhost browser page source was added, including a guest input FIFO, but **its actual two-tab browser run has not yet been demonstrated**. Until an interactive browser check passes, do not claim full 2-browser E2E or final UI quality.

## Local two-tab manual research steps (for a developer PC)
1. Install free CLI tooling locally in a disposable checkout: `npm install --no-save --package-lock=false firebase-tools@14.24.0 @firebase/rules-unit-testing@4.0.1` (requires Node and Java).
2. From repo root, launch: `./node_modules/.bin/firebase emulators:start --only auth,database --project demo-yokai-lab --config network/emulator/firebase.json`.
3. From a second terminal at repo root, serve local files: `python3 -m http.server 8000 --bind 127.0.0.1`.
4. Open `http://127.0.0.1:8000/lab/firebase-match-emulator.html` in two **different tabs**. Create a room in tab A, enter six digits in tab B and join; start on A, connect match on B. Rotate or switch watch on both and verify revisions/ACK match. Only localhost; do not paste into the existing Google Sites page.

## Important remaining engineering gates
1. **Fast tap input**: bounded FIFO is implemented and exercised in unit and SDK tests; a full RTT is still required for each ACK, so high-rate touch mini-games may feel delayed and the queue can fill (reported as `input_buffer_full`). Measure actual RTT and consider safe batch framing/prediction before declaring the gesture games smooth.
2. **Host reconnect/crash**: reloading host destroys its in-memory engine. A same-code new host must not start over with revision zero. Room epoch/host recovery and pause/abandon behavior remain unimplemented.
3. **Presence**: Phase 13A `onDisconnect` is available but not yet integrated into the match/UI. Full connection identities and background resumption must be tested.
4. **Auth/security**: tests use local anonymous-auth contexts. Production Auth+RTDB must not be enabled before user approves a safely separated project or namespace and actual Rules are reviewed; any authenticated user can currently read a guessed 6-digit room.
5. **Browser tests**: validate real local Chrome/WebKit two-tab behavior and repeat the intermittently failing Chromium research CI; then stress packet ordering/loss and measure snapshot KB. Cloud and school Safari/Google Sites still unverified.
6. **Presentation**: high-quality animation and complete battle UI remain intentionally deferred. Flash Soul stays **OFF** for the initial version.

### Sources
- [Firebase RTDB web listeners/transactions](https://firebase.google.com/docs/database/web/read-and-write)
- [Firebase Auth persistence per tab](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Firebase Authentication emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [Firebase offline and onDisconnect](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Phase 13A](./PHASE13A_FIREBASE_ROOM_SDK_QA_20261024.md) and [cross-repository research](./PHASE13_FIREBASE_CROSS_REPO_RESEARCH_20261024.md)
