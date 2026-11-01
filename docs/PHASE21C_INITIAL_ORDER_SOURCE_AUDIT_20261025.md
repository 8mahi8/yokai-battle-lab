# Phase 21C-A — Original-action wait source audit / tie and opening-right limitations

Date: 2026-10-25 JST | Development branch: `feat/phase1-action-circle-lab-20261023`

## Project position / confidence
This is **Phase 21C source-table + scheduler regression audit**, not completion of original YW2 first-action parity. The canonical online host remains Phase 21B's 3000ms official-rule wheel lock. Phase 5/6 Flash Soul, matching-time opening-credit and wheel coalescing remain research-only. No independent original-game side-by-side recordings or ROM trace were available.

## Sources reviewed
1. [Mt. Wildwood — Turn Order, YW2/YW3 94-row table](https://mtwildwood.net/turn-order.php). Community datamined/gameplay-tested reference: lowest active wait acts; initial wait range is speed-row random; post-action wait = move wait × speed weight; most YW2 moves use wait 3; wheel entry resets to 3 × speed weight. This page does **not** specify same-wait tie-breaking, exact seed/RNG mapping, a first-front registration timestamp, or animation-frame scheduling.
2. [たくトンボ — すばやさの育成研究](https://note.com/tombow_yw/n/nfb9184c724cd): independent piecewise formula and speed-plateau discussion. **Its floor-formula gives speed=2 a weight of 123**, conflicting with the explicit Mt. Wildwood row showing speed 2..5 weight 122. At this one boundary we chose the explicit game-data table, without claiming ROM-level proof.
3. [たくトンボ — 対戦の行動順](https://note.com/tombow_yw/n/n1e4cf179d2d9): initial-front advantage and initial order variation; author warns that numeric initial-front coefficient explanations may contain errors. Does not establish same-tick tie priority.
4. Earlier repository studies: [Phase1 research](./PHASE1_RESEARCH.md), [21A](./PHASE21A_WHEEL_ACTION_PARITY_20261024.md), [21B](./PHASE21B_OFFICIAL_WHEEL_AND_GUEST_ACK_20261024.md), [matching-time opening fixture tests](../tests/opening-match-offset.test.mjs), [Phase5 wheel-pair QA](./PHASE5_WHEEL_PAIR_QA_20261023.md). These experiments already exist; no duplicate engine or alternative turn-order system was introduced.

## Code and regression work
- **One concrete source mismatch found and fixed:** `engine/phase1.mjs` returned post-action wait 369 for speed 2, but the YW2/3 94-row table's weight 122 implies **366**. This only alters that speed 2 boundary; existing six rental units have higher speed. All other tested speed values agreed with that source table.
- New `tests/phase21c-order-source-parity.test.mjs` uses a **static 94-row source transcription** independent of Phase1's compressed generated-range implementation. It checks `initialWaitRange` and `waitCostFromSpeed` at **every integer speed 1–999** and explicit saturation checks at 1000, 2000 and 9999.
- The tests independently verify that all six active initial front fighters decrement wait together, only the selected unit resets to standard action cost, and `predict(1)` agrees with the stepped scheduler.
- A seeded same-minimum-wait case captures the current deterministic front-order tie policy and explicitly marks it **UNSOURCED**. This is only an implementation regression check, **not** original-game parity evidence.
- Existing `opening-match-offset.test.mjs`, `phase1-opening-flash.test.mjs`, wheel, replay, host and Firebase tests were reused, not rewritten. Only the confirmed speed-2 row was altered in production engine code.

## What each acceptance gate actually proves
| Check | Result / confidence | Still missing |
| --- | --- | --- |
| 94 source-row first-wait and weight ranges | Matched after speed-2 correction; community-data supported | Independent 3DS dump/replication |
| Initial front wait seed, simultaneous countdown and post-action reset | Deterministic test PASS / current model | Original RNG distribution, hidden frame timing |
| New wheel entry starts at 3×weight | Existing code and regression supported by source description | Exact 3DS action/rotation interleave |
| Returning registered front before its first move | **Experimental option only**; regular online host does not use matching-credit fixture | Original recorded scenarios showing whether original opening credit persists |
| Equal minimum wait between teams/slots | Current model chooses first iteration slot (A-front order then B); **unverified original priority** | Original controlled equal-wait traces or reliable source-code evidence |
| Actual first move by same six creatures in original 3DS | **UNTESTED** | Controlled source video: both starting rosters, matching-time lineup, rotations, first action and move sequence |
| School iPad Safari, live Firebase, Google Sites direct HTML | **UNTESTED** | Phase 23/24 validation |

## QA and references
1. First 94-row test run detected speed-2 mismatch: [run 40106825322](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40106825322) — 399/400 passed, 1 failed (expected and resolved, not concealed).
2. Fix + all tests: [research unit and Chromium 40106902870](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40106902870): **400/400 Node PASS + research browser PASS**.
3. [Original-stage Chromium and pointer events 40106902913](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40106902913): PASS.
4. [Real Chromium 2-browser Firebase Auth/RTDB local emulators 40106902904](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40106902904): PASS. Local emulators, not production Firebase.
5. No original Nintendo 3DS gameplay parity test and no physical school iPad Safari/Google Sites deployment test. Passing unit/integration tests is **not** original exactness.

## Next acceptance / priority
- **Phase 21C-B:** Acquire reliably described YW2 original first-action traces or original-code evidence. Compare identical matching-time front, visible start wheel, speed stats and tie conditions against expected first actor and wait progression. Do not replace the host tie policy or grant registered-front credits without contradictory original observation or technical source.
- Then **Phase 21D**: independently verify actual Soul recovery on attacks, techniques and Zero-watch pokes; compare existing Phase4/Phase7 research and avoid universal fabricated +5.
- After source parity, Phase22 no-motion/counter tactics, Phase23 live online stability, Phase24 old-iPad/Google Sites direct HTML.
- **No user action now.** Only `feat/phase1-action-circle-lab-20261023` changed; `main`, the existing Google Sites version, and live Firebase remain untouched. Zero spending or external service configuration changes.

