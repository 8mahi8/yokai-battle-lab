# Phase 17 — Source-grounded touch wheel + battle special feedback
Date: 2026-10-24 JST
Branch: `feat/phase1-action-circle-lab-20261023`

## User direction
Continue autonomous development of the **actual** original-engine Yo-kai Watch 2–inspired browser 1v1. The user especially asks to **check external references carefully**, to prioritize fighting feel and the original upper/lower battle layout, and to keep the school iPad Safari + Google Sites **direct code-embed** goal. It is a friend-only hobby game; full browser-process-restart restoration is intentionally not required. Never use the rushed unrelated short school prototype.

## External research actually checked before coding
1. [Level-5 official YW2 battle feature](https://www.youkai-watch.jp/yw2/game/game06.html): normal and Watch Zero combat, G-move selection and additional touch-input phases for Soultimates; source for broad interaction and visual hierarchy, **not for reproducing official art or exact timing**.
2. [Game8 YW2 battle mechanics](https://game8.jp/youkai-watch2/505163), [Soultimate control breakdown](https://game8.jp/youkai-watch2/504498): the player rotates the 6-medal circle to change front three, and charges specials via additional swipe/tap/etc. minigames. No authoritative number of angular degrees/snap thresholds is given.
3. [Community input manual](https://wikiwiki.jp/youkai-watch/%E6%93%8D%E4%BD%9C%E3%81%AE%E3%81%97%E3%81%8B%E3%81%9F): the circle itself is **slid with touch/pen** as well as using L/R buttons. This is why the game now supports gesture wheel rotation in addition to explicit left/right buttons.
4. [Gamepedia Watch Zero overview](https://gamepedia.jp/youkai-yw2/archives/1873): G moves draw Soul from caster + both neighbors, and Poke requires vulnerable/loafing targets; **do not** represent arbitrary healthy targets as eligible, and G move damage uses engine research fixtures only. The default Flash Soul remains OFF.
5. [W3C Pointer Events](https://www.w3.org/TR/pointerevents/), [MDN pointer events/capture/touch-action](https://developer.mozilla.org/ja/docs/Web/API/Pointer_events): pointerdown, move/up/cancel, touch-action; pointer capture is retargeting, so do not capture every ordinary medal tap, only established wheel drags.
6. [web.dev animation performance](https://web.dev/articles/animations-guide), [web.dev layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing): prefer transform/opacity over geometry/paint on old mobile hardware, don't force GPU layers for all SVGs.
7. [Competitive tactics from a YW2 player](https://note.com/tombow_yw/n/n1e4cf179d2d9): opponent visual state can intentionally lag behind an ongoing action animation. We **did not imitate this prediction/reveal mechanic yet**: original-perfect netcode parity is unverified and should not be invented.

## Code changed on development branch
- `ui/wheel-gesture.mjs`: pure signed angular math, rollover at 180° and center dead-zone. A **36° movement threshold is our provisional usability choice**, **NOT** a claimed official YW2 angle. Returns only clockwise (+1) / counterclockwise (-1) / none; emits at most one actual move per completed gesture.
- `ui/match-stage.mjs`: captures finger/pen start on the local wheel, gives CSS-only preview by rotating the **decorative ring** (no fake model rotation), then sends precisely one already-existing `{type:'rotate',direction:±1}` to `createMatchProtocol`. Buttons remain. Tiny taps, center ambiguity, second fingers, pointercancel and lostpointercapture do not cause fake turns. Pointer capture is attached to a stable ancestor **only after drag intention**; new medal taps immediately after a swipe aren't suppressed by leftover click protection. Nonlocal network clients await host snapshots for the actual offset; the UI doesn't speculate remote results.
- `ui/battle-vfx.mjs`: separate read-only converter that maps existing canonical `type:'action'` and `type:'special'` event payloads into display cues; handles misses, ordinary damage/heal, multi-target special impacts and actual source `mode:'g-tech'` vs standard `soultimate`. No added RNG, HP or move power.
- `ui/match-stage.mjs`: existing small action feedback extended to short **hi​​ssatsu/G cut-in** on actual `special` battle event and all impacted frontline fighters; winner and action queue untouched.
- `lab/yw2-layout.css`: original lightweight wheel preview and small upper-field special title/effects, with reduced-motion CSS. Style animations change compositor-oriented transform/opacity and remain inside existing two-screen YW2-inspired presentation.
- `lab/match-stage.html?review=special`: clearly **presentation-only review fixture**, injecting a specially shaped test event into a COPY of the canonical snapshot for a screenshot. This does **not** assert the whole competitive special execution is original-parity.
- `tests/phase17-interaction-vfx.test.mjs`: three pure unit checks for clockwise/counterclockwise, center/tap, angle rollover, normal hit/miss, and three simultaneous special targets with G mode.
- `tools/stage-smoke.mjs`: actual Chromium synthesizes circular touch PointerEvents through stage input handlers, checks one engine-confirmed wheel rotation to A5, no rotation on small tap/cancel, and that a fresh ordinary A6 medal tap still works immediately after a swipe. Then verifies ordinary attack doesn't trigger fake special banner and runs all prior pointer mini-game/visual tests.
- `.github/workflows/phase14-stage-qa.yml`: module checks, new unit tests, and screenshots including `phase17-special-cutin-preview.png`.

## Evidence and review
- **Node suite 375/375 passed**: [Research battle unit tests run 40092147021](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40092147021).
- **Actual Chromium stage + wheel swipe, tap/cancel, ten charge/purify/poke trials and screenshot QA passed**: [Stage workflow run 40092146981](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40092146981).
- **Actual two-Chromium Firebase Emulator room battle, presence/pause/reconnect passed** for the new swipe stage wiring: [Firebase workflow run 40092103043](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40092103043).
- Phase17 visual screenshots saved in the `phase14-original-engine-stage-preview` artifact of the stage CI: standard 1024×768 battlefield, target mode and **Phase17 special-event fixture**. Review: battle scene and lower four commands remain readable, 6-medal wheel unchanged visually outside a drag, upper hit numbers/cut-in appear on the real stage. A stronger visibility hold was added after the first cut-in screenshot.
- **Not verified**: true old iPad Safari hardware PointerEvent vs Chrome synthetic touch, physical touch jitter, long-session smoothness, actual production Auth/RTDB, direct Google Sites code embed, original exact timing/AI/Soultimate numbers, flawless online simultaneous specials. None of these should be represented as passed.

## Next meaningful priorities
1. Actual user-visible Soul readiness clarity (which normal special is really ready, Watch Zero adjacent-Soul requirements) without overriding canonical server validations.
2. Real old Safari performance checks (DOM rebuild counts and gesture input latency); avoid rendering intensive new effects.
3. Complete integrated game-to-Google-Sites code bundling **only after** remaining QA gates; never generate another unrelated toy build or mutate the current public game without user instruction.
