# Phase 14A — Original combat stage and UI transport wiring
Date: 2026-10-24 JST

**Scope**: browser-rendered 6v6 original rentals using the **existing Phase 1–13 engine, combat protocol and Firebase emulator**, without recreating a substitute game. **Not a school/public release**.

## Source added/updated
- `engine/match-protocol.mjs`: expose `forecast:game.preview(5)` in the canonical revisioned snapshot, based on the **actual deterministic Phase 1 scheduler**. The model's output remains explicitly provisional after lineup/KO changes. No parallel turn scheduler or guessed wait formula introduced.
- `ui/match-stage.mjs`: DOM renderer and input control API `createMatchStage` shared by both offline and Firebase clients. **All** game facts are read from `createMatchProtocol().snapshot()`, including team roster, HP, Soul, wheel offset, pin, status, action forecast and gesture state.
- `lab/match-stage.css`: original CSS wheel/character silhouettes, 6 units × 2 sides, HP and Soul bars, predicted next five, accessible action buttons, touch mini-game surface; portrait and cramped landscape layouts; reduced-motion support. No external character assets.
- `lab/match-stage.html`: 1-browser local two-seat **screen/controller research**, directly calling `createMatchProtocol.dispatch/advanceAuto`; no second simulation engine.
- `lab/firebase-match-stage.html`: localhost **Firebase RTDB+Auth Emulator** controls for create room, guest join, host start, guest attach, plus the **same** stage component bound to `createFirebaseMatchHost` and `createFirebaseMatchGuest`. Browser anonymous auth uses per-tab in-memory persistence. No user cloud credentials, writes or deployments.
- `tests/match-stage.test.mjs`: correct 6-person teams, actual front/bench wheel, host-computed next 5, deterministic prediction stable, pin/watch mutations reflected, malformed view data rejected.
- `tools/stage-smoke.mjs` + `.github/workflows/phase14-stage-qa.yml`: actual headless Chromium opens real ESM/CSS game view and clicks enemy pin, A wheel, watch, host turn, B wheel, checking 12 creatures and next five persist.
- `tools/firebase-stage-smoke.mjs` + `.github/workflows/phase14-firebase-browser.yml`: attempt a genuine two-iframe anonymous Firebase browser-E2E scenario against **local auth+database emulators**, checking room create/join, guest-rotation ACK seen at host, host rotation seen at guest, and combat turn update. This is **research QA**, dependent on the browser and Firebase SDK loading in CI. Do not mark the E2E as successful until the corresponding run has **passed**.

## Verified vs not yet verified
- **Verified (CI)**: Phase14 original stage Chromium tests passed: [Stage QA 40061552692](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40061552692). Canonical battle protocol integrates forecast and prior Node engine tests remain passing: [Research QA 40061552657](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40061552657).
- **Firebase real two-browser QA VERIFIED GREEN**: [Run 40061682008](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40061682008). GitHub Actions log explicitly reports `FIREBASE-STAGE-PASS: separate anonymous browser tabs + real emulators + canonical battle stage`. Both same-origin Chromium iframes used independent anonymous Auth `Persistence.NONE` identities, RTDB Auth+Database emulators, actual room create/guest join, guest rotation visible on host, host rotation visible on guest and host-only battle turn advance propagated. Firebase SDK backend+30 permission checks also passed in the same run. This proves browser integration in the local emulator, **not real public cloud or physical-device behavior**.
- **Not yet verified**: separate physical devices, **Safari on school iPad**, the Google Sites embed-code environment, production authenticated cloud, normal realtime battle pacing, low latency, recovery after host reload/suspension, offline reconnection, original-YW2 numeric exactness, polish/visual review of final gameplay.

## Critical review gates before user testing
1. Gameplay is still a **research stage**, not the playable school build: room UI is local-emulator-only, offline UI switches between players, host advances autonomous battles manually. Do not ship this page as a Google Sites substitute or silently set up a production Firebase.
2. Actual touch mini-game controls share the canonical `chargeInput/purifyInput/pokeInput` commands. Their visual guides are representative, some timing/rules are provisional, and the per-ACK guest FIFO can induce latency. Test all four charge challenges and five purification gestures in browser, including pointer move behavior and iPad Safari; don't advertise them as proven yet.
3. Presence and reconnection work remain Phase14B/14C. Host reload cannot silently overwrite a running revision with a fresh match; session/seat validation and resync must be completed.
4. Rendered wheel is CSS research art; next iteration should focus on sprites/visual feedback, readability under real Safari device dimensions, actions in real time and perceived guest smoothness. AI should review an actual frame before giving it to the user.
5. Initial version still **Flash Soul OFF**, identical original rental six creatures, free-only, no unwanted replay/ranking screens, no copy of official Yo-kai Watch assets.

## Next autonomous development
- Close the real 2-browser Firebase CI E2E (if it fails, reproduce and fix rather than representing as a pass).
- Exercise pointer gestures in real browser, preserving pointer capture across re-render, and add stale/jitter/queued tests for minibattle inputs.
- Harden host reconnect and presence and add low-bandwidth host-only clock pacing. Then locally screen-review responsive layouts.
- Only when both screen and networking QA are convincing: create code-direct-embed, self-contained **Google Sites** version and let user perform school real-device test; never mislabel an isolated rushed mini-game as the actual project.
