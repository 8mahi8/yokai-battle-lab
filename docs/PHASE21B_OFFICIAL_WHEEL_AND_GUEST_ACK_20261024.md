# Phase 21B — Official-rule 3-second wheel and truthful online guest feedback

Updated 2026-10-24 JST | Branch `feat/phase1-action-circle-lab-20261023`

## Whole-project position
- **Phase20A/B (done):** reuse earlier YW2 damage, multi-hit and STR/DEF/SPR Inspirit logic in the authoritative game, not unverified poison HP/heal formulas.
- **Phase21A (done):** existing Phase1 3-second wheel gate connected to combat via replayable host-only timestamp; research opt-in verified.
- **Phase21B (THIS phase, implemented and tested):** set 3000 ms per-seat wheel lock as the official-rule **default in `createMatchProtocol`**, fix old false positive guest ACK, show clear Japanese rejection reason; test actual Chrome 2-seat Firebase local emulator.
- **Phase21C/D (next):** action priority tie/start/wheel and Soul accrual, then Phase22 authentic PvP tactics, Phase23 network stability, Phase24 real school iPad Safari + direct HTML Google Sites code embed.

## Primary references and fidelity qualification
- [妖怪ウォッチ2 通信対戦攻略の部屋・公式ルール](https://hrs-game.main.jp/youkai_watch2/data/article_03.html): source explicitly says consecutive medal circle rotations are restricted by a **3-second rule** in official-rule battles. [Other description of rules](https://asobigokoro.work/yokai-watch-2-ganso-honke-shinuchi/) corroborates. This is a rule of **official-rule PvP**; don't silently assume that original free-battle settings are identical.
- [Maguro: competitive circle research](https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c): sometimes two wheel rotations without a Yo-kai action only reflect their final state in attack targeting. **Not disproved or implemented by 3-second cooldown alone**. Phase5's independent paired-motion study must be validated and integrated later.
- Exact original frame start, motion latency, original 3DS clock granularity and touch lock behavior have **not** been proven. Browser host's `performance.now()` at accepted input is an explicit implementation choice, not an original ROM timing claim.

## Changes this phase — real work, not another speculative model
1. `engine/match-protocol.mjs` defaults to `rotationCooldownMs:3000` for authoritative two-seat matches, keeping explicit `rotationCooldownMs:0` as a **legacy research-only comparison**. Already implemented Phase21A `hostNowMs` private clock and replay `hostRotationAtMs` are reused. Opponent wheels have independent lock state.
2. `engine/match-protocol.mjs` adds `snapshot.lastCommandOutcomes[side]` containing only the newest canonical command type/sequence, game-rule `applied` boolean, denial reason, and remaining milliseconds when applicable. The match transport revision is **not** a guarantee that a rule-invalid command changed the game. Keep storage bounded by one outcome per seat. The battle game's hash and physics remain host authority.
3. `network/firebase-match.mjs` guest `onAck` now differentiates `accepted:true` (transport sequence consumed) from `applied:true/false/null` (actual game rule applied/refused/unknown). A missing older-version host verdict becomes `applied:null`, **never a false success**. The snapshot still gates guest FIFO commands and retries.
4. `ui/match-feedback.mjs` is a pure Japanese message formatter. `lab/firebase-match-stage.html` uses its `matchAckMessage` for guest success/failed/unknown. The actual stage's host `ui/match-stage.mjs` uses `matchRuleFailureMessage` so a denied wheel gives `サークルはまだ回せません（あと約2.6秒）` instead of the raw code `cooldown`.
5. `tests/match-feedback.test.mjs`: Japanese rule feedback and no false claims; `tests/firebase-match.test.mjs`: actual emulated bus guest denial and remainingMilliseconds 2550, signed consumed ACK, original B2 front intact; old/truncated host snapshot returns unknown, never success. `tests/match-phase21-rotation-clock.test.mjs`: default 3s lock and explicit old 0ms comparison tested.
6. `tools/firebase-stage-smoke.mjs` now exercises **real Chromium + Firebase Auth/RTDB emulators** in two isolated browser tabs. Guest wheel 1 commits, wheel 2 immediately following is denied by authoritative host, both host and guest front unchanged, clear guest Japanese refusal, host advances normally; real Firebase disconnect/presence/reconnect still pass.
7. `.github/workflows/phase14-firebase-browser.yml` now triggers on `engine/**` changes too, not just `network/**`/`ui/**`. Any future combat changes will exercise the two-browser mode automatically.

## QA evidence — final 21B engine/config revision
- **Node 396 / 396 pass**: [Research unit + old research browser workflow run 40103884449](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40103884449).
- **Chromium stage + gestures pass**: [Stage QA run 40103884464](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40103884464).
- **Two-browser real Chromium with isolated Firebase Auth/RTDB emulators pass**: [Firebase browser QA run 40103884476](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40103884476); 33 local database permission checks and full browser-stage smoke passed.
- An intermediate test failed because it expected old default 0ms; intentionally changed legacy comparison test to explicitly choose `rotationCooldownMs:0`, and added an explicit default 3000ms acceptance test. Final results are green.
- Not tested on real old iPad Safari, live Firebase cloud, actual Google Sites direct-code embed or original Nintendo 3DS side-by-side timing. No production deployment.

## Next execution (21C → 21D)
- Research original first-action wait distributions and official-rule opening effects; compare pre-existing 94-speed-row Phase1 research with observed original battles, examine same-wait tie-break and how switching front changes stored action wait. Do NOT rebuild already verified tables blindly.
- Check whether any legal two-rotation-in-one-action-window original strategy requires timing exceptions beyond the basic 3 sec. Phase5 2-rotation coalescing and no-motion stay research-only until evidential parity.
- Verify exact Soul gain for attack, damaging technique and Poke, including repeated charged specials without inventing +5 for every step.
- Once game-rules parity strong enough, Phase22 advanced tactics, then Phase23 real online and Phase24 school iPad/Google Sites. The user has no physical testing step yet.

## No scope change
`main`, the school's existing directly embedded Google Sites code, production Firebase, purchases, and third-party users were **not** modified. Dev branch only. Flash Soul stays OUT of initial build. No invented five-step forecast display in normal UI. Copy-right-safe original rental creatures.
