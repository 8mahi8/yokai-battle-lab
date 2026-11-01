# Phase 21A — YW2 PvP action-turn and three-second wheel reproduction audit
**Date:** 2026-10-24 JST
**Location in architecture:** source research → `engine/phase1.mjs` → `engine/combat.mjs` → authoritative `engine/match-protocol.mjs`; **not** Firebase runtime or UI changes.
**Current stage:** exact wheel gate integrated as a configurable host experiment; the school/default online match stays at 0ms until the full motion/guest compatibility audit. This is not an assertion that PvP three-second timing is fully reproduced.

## Sources consulted and confidence
1. [Mt. Wildwood's YW2/3 turn-order tables](https://mtwildwood.net/turn-order.php) — **data-traced research**: first-front wait sampled from 94 Speed rows, active wait counters decrement together until one action, action wait typically 3 × Speed weight, and newly rotated-in fighter begins 3 × Speed weight. Existing Phase1 `initialWaitRange`, `waitCostFromSpeed`, `createBattle.step` and switch-in behavior **already** implement a source-shaped model. Source data does not settle simultaneous-zero tie-break order or opponent display animation time.
2. [妖怪ウォッチ2 公式ルールの通信対戦攻略](https://hrs-game.main.jp/youkai_watch2/data/article_03.html) — **multiple-secondary-source rule**: official rule battle restricts consecutive wheel rotations with a **3-second rule**. This confirms the expected rough interval, not the exact frame when the timer starts/stops or hardware-specific latency. Another independent secondary [公式ルール解説](https://asobigokoro.work/yokai-watch-2-ganso-honke-shinuchi/) also reports the 3-second rule.
3. [Competitive player Maguro, wheel double-rotation and target timing](https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c) — first of two wheel positions may not be seen by the target-selection process if two rotations happen without an intervening Yo-kai action. The previous **Phase 5C** `engine/wheel-coalescing.mjs` covers a narrow research model **but is NOT in the actual online match**.
4. [Competitive player Tombow, no-motion and action point mechanics](https://note.com/tombow_yw/n/n1e4cf179d2d9) — animations delay what the **opponent sees**, not authoritative decision state. The previous **Phase 5** presentation/counter timing modules model limited cases; no verified mapping between 3DS animation frames and browser clock, so do not merge them as a fully authentic net-sync implementation.
5. [Previous repo Phase1 research](./PHASE1_RESEARCH.md) and [Phase5 paired rotation](./PHASE5_WHEEL_PAIR_QA_20261023.md), [3+ rotations uncertain](./PHASE5_THREE_PLUS_ROTATIONS_QA_20261023.md) explicitly mark unverified tie, 3+ effect, time-lock and initial-front behavior; no duplicate research engines are needed.

## Specific before/after gap
Before: `engine/phase1.mjs` **already accepted** `rotationCooldownMs=3000` and `rotate(side, direction, atMs)` and tested its 3-second rejection window, but `engine/combat.mjs` forcibly configured `rotationCooldownMs:0` and always sent `atMs=0`. `createMatchProtocol` has no client timestamp (appropriately) and no replayable trusted-host timing layer. Thus the regular game could spam consecutive rotations with no official 3s limit.

Now:
- `engine/combat.mjs`: accepts **optional** `rotationCooldownMs=0`, and `rotate(side,direction,atMs=0)` forwards the host observation to the **existing** Phase1 scheduler. Nothing about damage, AI, stats or charge was rewritten.
- `engine/match-protocol.mjs`: the private battle options allow the explicit `rotationCooldownMs:3000` experiment; `hostNowMs` is an injected host-only monotonic source (normally `performance.now()`). **Client commands cannot include time.** Only fresh, validated rotations sample time; retransmitted sequence ACKs are cached without resampling. An accepted rule-invalid cooldown command still consumes a sequence in the pre-existing transaction model.
- Deterministic journal includes the observed `hostRotationAtMs` for clock-gated commands. `replayMatchJournal` reuses that exact recorded time rather than consulting current physical time; missing recorded timestamps are rejected. Host and both seats use distinct cooldown histories.
- No online defaults altered: `rotationCooldownMs` stays effectively **0ms** until the remaining timing and existing gesture/browser tests can be reviewed. Not a claim that original PvP wheel timing has already shipped.

## Test coverage
Four new tests `tests/match-phase21-rotation-clock.test.mjs`:
1. Existing Phase1 3000ms lock applied through `createCombat` with precise 3999/4000 boundary, opponent separate timer and unchanged action points.
2. Real `createMatchProtocol({battleOptions:{rotationCooldownMs:3000}})` fresh host-only timestamps; after first turn at 1000ms, retry at 1290/3999 is blocked, 4000 accepted. Network packet containing fake `atMs` rejected; duplicate does not consume clock; every result replays.
3. Legacy default remains available and does not unexpectedly access wall time or block immediate spins; bad configuration explicitly rejected.
4. Invalid monotonic host timestamp cannot advance the authoritative sequence, state or journal.

- [Latest Node + research Chrome run 40102644457](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40102644457) **393/393 PASS**.
- [Latest real combat UI & 10 gesture Chrome run 40102644465](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40102644465) **PASS**.
- **Additional Phase21 guest-host bridge test** in `tests/firebase-match.test.mjs`: an emulated two-seat Firebase transport confirms guest first wheel rotation succeeds, guest second at 1450ms is rejected by the authoritative host, third at 4000ms succeeds, all statuses/published front IDs match and replay reproduces the same outcome. This does NOT represent real Firebase cloud latency or physical iPad Safari.
- **Discovered UI limitation:** the guest `onAck` callback currently reports receipt of a valid authoritative revision, not the nested battle rule result. A rejected cooldown still increments the match revision but provides no clear in-game rejection reason. **Phase21B must address guest feedback before turning this lock ON by default.**
- No actual 3DS timed comparison or physical old iPad Safari run is claimed.

## Remaining Phase21 and next execution order
1. **21B**: make rule-invalid cooldown visible to the remote guest (currently transport ACK only confirms the revision), validate default game combat presentation/online host time semantics, source 3-second lock vs real guest command latency and double-rotation case. If validated, set canonical default `rotationCooldownMs=3000`, update legacy tests to explicit `rotationCooldownMs:0` only where they are intentionally timing-independent; verify host/guest emulator, synthetic iPad gestures and replay. No gameplay shortcuts.
2. **21C**: isolate matching-start initial-front opening priority and tie break using actual YW2 side-by-side examples. Existing Phase1 already reconstructs the 94-row wait values, **do not restart wait-table research**.
3. **21D**: actual Soul gain on damaging attacks, techniques, and Poke; player theory says some gain after actions but numerical timing isn't yet source-verified. Do not simply grant global +5.
4. **22**: integrate narrowly verified Phase5 no-motion, animation-visibility delay and counter Soultimate; Flash Soul stays OFF in initial 1vs1.
5. Then Phase23 online robustness, Phase24 Safari/Google Sites single-HTML embed. Keep screenshots and user iPad validation as a distinct gate.

## Every following assistant reply must report
**今回 → 全体のどこ → 次 → 受け入れ条件/根拠とテスト → 変更先 (main/Google Sites? no)**. Maintain [PROJECT_MAP_AND_PROGRESS](./PROJECT_MAP_AND_PROGRESS.md) as single truth; historical HANDOFF Phase labels are not permission to call a provisional experiment fully original.
