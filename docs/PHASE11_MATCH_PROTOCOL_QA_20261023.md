# Phase 11 — Two-seat authoritative input protocol and reproducible relay research

**Date:** 2026-10-23
**Repository:** https://github.com/8mahi8/yokai-battle-lab
**Development branch:** `feat/phase1-action-circle-lab-20261023`
**Status:** Offline/local host **contract**, **not** a live online 1vs1. Production `main`, school Google Sites HTML and real Firebase untouched. No paid service.

## Research update: ordinary Soul accrual

Original YW2's Soul naturally increases during battle, and the meter requirement depends on Soultimate rank. Game8 broadly notes natural charging and rank differences: https://game8.jp/youkai-watch2/504498.

A useful specific community test from RC(里恋) states: **after each Yo-kai's own nonattacking turn the meter recovers 5 points**; attacking recovery is left as unmeasured. Source: https://note.com/ricosama0726/n/n14710bbe446c . An experienced 2026 player likewise says units gain some Soul on actions but character/move speeds vary; this is not a full universal gauge formula: https://note.com/tombow_yw/n/n1e4cf179d2d9 .

Previously implemented `researchSoulRecoveryMode:'owner-nonattack'` in `engine/combat.mjs` already grants this 5 **after the living actor's own nonattack action**, not to all 12 members and not for damaging attacks. The core engine default remains opt-out for backwards compatibility, while the new match-host research protocol defaults its **initial offline room** to this evidence-supported research mode. This does not establish values for attacking, passive time refill, Soultimate ranks, character-specific equipment or Watch Zero poke rewards. The initial game is not yet a balanced match simply because +5 works.

## Deliverable A — `engine/match-protocol.mjs`

Pure ES Module built over `createCombat()`, without Firebase, Supabase, sockets, user accounts, graphics or timers.

### Strict separation of player versus host authority

Players can submit only:
- wheel rotate ±1
- ordinary target Pin or clear
- switch Standard/Watch Zero
- start/input/cancel legitimate minigame **guided Soultimate**
- start/input/cancel **Purify** (bench negative status)
- start/input/cancel Watch Zero **Poke**

The opponent player's own character ID is rejected for `chargeStart`/`purifyStart`; own team's ID is rejected for `pin`/`pokeStart`. Touch coordinates must be normalized finite numbers 0..1 with supported gesture type. Extra fields (including `side` inside an intent) and oversized commands are rejected.

**Not exposed**: give Soul to arbitrary unit, manually clear Inspirits, directly resolve full Soultimate charge, force a winner, alter HP, invoke auto battle turn from a client, choose an arbitrary purification minigame, or override Flash Soul/battle debug flags. Flash Soul remains out of initial release.

**CRITICAL SECURITY LIMITATION:** `dispatch(side,seq,intent)` takes a `side` argument **from the future trusted host ONLY**, not from network JSON. No actual connection authentication, room membership checks or auth tokens exist. A web client that can call this whole module directly is not a secure competitive authority. When adding real transport, authenticate and map connection→seat in a backend/trusted host before calling dispatch.

### Ordered actions and idempotency

- Each seat starts with `clientSeq=1`; last accepted per-seat sequence tracked independently.
- Globally committed events carry a monotonic host `revision`.
- The exact last packet may be retransmitted any time without applying the action again. Cached ACK returned even when its original command failed due to Soul shortage or another rule.
- A packet that reuses a sequence but changes its action is rejected as `sequence_conflict`; gaps and old numbers are rejected without mutating state.
- Invalid schema never consumes sequence. Valid schema but rejected by actual battle rules **does consume** sequence: prevents an old, once-invalid input from silently becoming valid later.
- `advanceAuto()` is **host only**: clients cannot forge automatic attack turns. Host commit order resolves cross-seat concurrency deterministically.
- For 1st research implementation, only latest per-seat command is cached for full duplicate ACK; much older commands get a `stale_sequence` response. A durable reconnection + catch-up protocol is a future gate.

### Replay and diagnostics

- Immutable `snapshot()` and `exportJournal()` include the game state, host revision and chronological accepted result log.
- `replayMatchJournal(export)` starts from the same seed, identical rental team settings and committed player/auto events, re-runs battle logic and verifies event result + final game fingerprint. It detects tampered and missing events, and confirms deterministic **same-version** replay.
- The 8-hex `stateFingerprint` is FNV-1a / string serialization for debugging equality. **NOT a cryptographic signature, MAC, cheat prevention or source of shared random secrecy.** Engine version, stable RNG/serialization, authority and privacy must be enforced by a real server.
- Intent log is capped at 10,000 events to avoid silent unbounded memory growth; it is a laboratory ceiling, not a production log retention strategy.
- Both sides receive complete research snapshots in this **offline lab**. A production game must separately decide and enforce which information each rival is permitted to see.

## Deliverable B — `lab/match-contract.html`

Lightweight mobile-friendly **same browser, two-seat** interface:
- separate A/B wheel, Watch and Pin buttons;
- host-only `1行動` and `20行動`;
- current six original identical rental units, HP and Soul for both;
- last-ACK retransmission button for each seat, illustrating idempotence;
- host-assigned revision / debugging state fingerprint, last 12 ordered events, full transcript replay verifier, reset.
- Explicit on-page disclosure that this is NOT online, actual friend play or Google Sites embedded release.
- ES Module imports cannot be directly copy-pasted as a self-contained Google Sites game; bundling and room transport remain undone.

## QA evidence

Added:
- `tests/match-protocol.test.mjs`: 15 cases, including both players' commands and host auto turns, replay, duplicate ACK, stale/sequence-gap safeguards, invalid and foreign-side commands, no debug Soul or force win, immutable snapshots, forbidden Flash flags, tested 500-event ledger and honest non-secure fingerprint.
- `tests/match-protocol-ui.test.mjs`: 3 syntax/contract/static safety UI tests.
- `tests/match-protocol-charge.test.mjs`: 3 tests; default source-grounded nonattack owner Soul +5, actual full Soul meter build from own auto actions, successful guided charge all available minigame shapes from client gesture commands, Soul consumption, deterministic replay, duplicate touch input ACK. These are protocol-level operations, not a true multi-device latency experiment.
- `tools/browser-smoke.mjs` adds a new Chromium `CONTRACT-PASS` scenario: load actual two-seat branch HTML, A/B rotate, retry A packet and verify no second rotation or revision, host advances an ordinary action, try illegal Zero-mode PIN, replay journal, reset. Existing battle, Poke, five Purify, researched damage and separate old Flash lab tests still pass.

Verified **latest code run prior to documentation-only commit**:
https://github.com/8mahi8/yokai-battle-lab/actions/runs/39974489475
- **337/337 Node tests PASS**, 0 failed, 0 skipped.
- Headless Chromium loaded real repository ES Modules and passed the research host contract plus all earlier browser/touch scenarios.

## Next steps to play online with school friends

1. Choose/create a **free** isolated realtime relay for THIS game (the prior project research favored Supabase). Configure room creation/join and anonymous session credentials, using a backend-authenticated seat mapping. **Never expose a service-role key to the browser/Google Sites.**
2. Decide the **actual authority location**. To have reliable one host for two iPads and avoid guest freeze, use one owner of RNG, inputs, turn scheduling and HP, broadcast stamped snapshots/events; clients only render and send intents. Supabase Realtime broadcasting does not magically supply durable trusted authoritative computations; a browser-player host can disconnect or cheat. These are design tradeoffs to resolve in an explicit architecture pass.
3. Add controlled message delivery over two independent clients: join/leave, heartbeat/rejoin, out-of-order/drop/duplicate/delay tests, monotonic snapshot revision, frozen-guest recovery and bounded payload sizing.
4. Keep school play goal: **HTML/CSS/JS copied directly into Google Sites embed-code box**. The GitHub research URL is only for testing. Generate ONE self-contained HTML (not a linked GitHub Pages iframe) after the browser version is stable.
5. Source-faithful attack-time Soul gain, real Soultimate effects and durations, Poke reward distribution, status resistance, moving-screen iPad touch calibration and enough battle balancing for the initial identical rental 6. No Flash Soul at launch.
6. Actual **old iPad Safari** and independent PC+iPad live host/guest tests before user publication; no such test is claimed this phase.

## Safety/ownership

This phase changed **only the named GitHub feature branch**. No `main` merge, GitHub Pages publish, Google Sites change, Supabase/Firebase project mutation, expense or user action. The protocol lab is not a claim of security or finished online play.
