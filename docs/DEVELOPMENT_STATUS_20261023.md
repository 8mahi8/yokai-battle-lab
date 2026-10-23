# Development status / 2026-10-23

Repository: https://github.com/8mahi8/yokai-battle-lab
Working branch: `feat/phase1-action-circle-lab-20261023`

**Branch-only. main and Google Sites were not changed.**

## What is in the branch
- `engine/phase1.mjs`: seeded six-person action scheduler with rotating three-person front, first-wait tables, setCanAct for KO and actionWait argument.
- `engine/combat.mjs`: deterministic seeded 1v1 bot battle simulation: original rental fixtures, attack/technique/heal/guard, three selected attitude multipliers, pinned target, HP/KO, guarded damage, winner, auto-rotation for BOT experiments.
- `tests/phase1.test.mjs`: pre-existing twelve research tests (not re-executed in this session).
- `tests/combat.test.mjs`: ten new tests; **10/10 passed locally with matching Phase 1 KO/action-wait functionality**.
- `lab/phase1.html`: original action scheduler UI; no damage.
- `lab/phase2.html`: battle demo with iPad landscape-aware CSS, manual rotation, pin, step, log; not yet visually verified with browser.
- `docs/PHASE1_RESEARCH.md`, `docs/PHASE2_RESEARCH_GATE.md`, `docs/PHASE2_IMPLEMENTATION.md`, `docs/PHASE3_RESEARCH_GATE.md`: evidence, differences, next gates.

## Remaining blockers
1. Source-confirmed heal formula, four-move attitude tables, loafing, status, special moves, soul points, zero式 mechanics.
2. Real-world match trace comparison of tie handling, wheel input windows and action delay.
3. Sudden death PvP trigger time and exact damage/guard interaction. Out of 100 seeds, four battles remained unresolved after 2000 simulated actions: **not evidence of an engine deadlock**, but missing source-accurate sudden death.
4. Browser visual QA: Chromium CLI repeatedly timed out, and installed Playwright WebKit browser binary was absent. No screenshot/actual iPad verified.
5. PvP network/Firebase room sync and single-HTML Google Sites embed not yet implemented.
6. Character animation pipeline quality gates before art is called ready.

## Next actions
First reproduce all Phase 1 + Combat tests against the exact GitHub branch; then independently verify browser rendering and manual buttons. Study original YW2 action selection/status and apply sourced formulas before promoting prototype to release. Keep independent modules and source confidence tags. Do not merge or change main without user consent.


---

## 2026-10-23 Morning — verified continuation (LATEST)

**DO NOT interpret earlier browser-startup blockers or 10-test summaries above as the current status.** This is still a **research lab**, not a publish-ready online battle game.

### Implemented on development branch

- New `engine/inspirit.mjs`: deterministic status ledger with positive/negative statuses, 30-global-action positive default, persistent negative default, explicit owner-turn durations for selected research effects, and removal of negative statuses only from a member **on its own team's backline**.
- `engine/combat.mjs` now integrates experimental `sleep` (cannot act), `purify(side,id)` and direct `applyInspirit` injection for testing. **AI does NOT yet cast Inspirits as part of authentic four-action selection; application odds and touch minigames are missing.** Timed sleeping is rejected because this test model cannot safely resolve owner-turn timers for a unit forbidden to act. A positive `research-marker` is metadata, not a working buff.
- Test-only `enableLoafing` plus explicit `loafChance` (default 0) provides deterministic skip-turn coverage. These percentages are not YW2's level/leader-adjusted real probabilities. The default research battle remains unchanged.
- `engine/phase1.mjs` now has `predict(5)`: side-effect-free predicted next five actors based on the **current approximation**, assuming no intervening status, wheel rotation or skill actions.
- `lab/phase2.html`: five action prediction cards with **a bar inside each card**, sleep experiment buttons, backline purification button, rotation and combat logs. Prediction is visibly marked as provisional. Safari compatibility improved by avoiding `Array.at`; mobile grid min-content overflow was fixed after reproduction.
- `tests/inspirit.test.mjs`, `tests/combat-inspirit.test.mjs`, `tests/preview.test.mjs`, `tests/loaf.test.mjs`: new focused regression suites in repository.

### Test facts, with important reproducibility qualifier

- A **local reconstructed mirror** of Phase 1 and Phase 2/3 JS plus copies of the original 12 Phase 1 tests, original 10 combat tests and additional targeted tests passed `node --test`: **49/49 green**.
- The exact remote GitHub branch was inspected using the connected GitHub API, but could not be directly cloned in this runtime (external DNS blocked); **the 49-test run is a local source mirror, not an authenticated CI test of the remote GitHub checkout**.
- Deterministic stress investigation: 1,000 seeds × maximum 2,000 battle actions, Team A wins **483**, Team B wins **478**, **39 unresolved** by event count cap. These do not imply PvP balance or original-game equivalence. No arbitrary automatic timeout was inserted.
- Chromium visual/interaction test was performed by loading the same UI HTML/CSS and **inlining locally mirrored ESM module code** into `page.set_content`, because navigation to local data/file/loopback URLs was administrator-blocked. Four viewports checked (1194×834, 1024×768, 1366×400, 390×844): six active cards, no JS page errors, and **no whole-page horizontal overflow**. At 1194×834, clicked experimental sleep A1 → rotate team A → purify A1 → rotate back → 20 actions; operations worked.
- This is not a network-delivered module test, not a real iPad Safari test, not a Google Sites embed test, and not a visual-quality acceptance of final character art.

### Source references and research confidence

- Wait/speed/wheel: https://www.mtwildwood.net/turn-order.php , https://www.mtwildwood.net/yokai-wheel.php (YW2/3 tables, YW2 spin timer details).
- Attitudes and loafing: https://www.mtwildwood.net/attitudes.php (YW2 Gentle/Careful/Grouchy condition order and general loaf chance; other attitudes and leader modifiers outstanding).
- Status: https://www.mtwildwood.net/inspirits.php **page is tagged YKW1**, but *duration rule is explicitly labeled YKW1+YKW2*. Do not generalize its YKW1-only effects to YW2.
- YW2 purification: https://gamepedia.jp/youkai-yw2/archives/1397 (requires backline, interactive touch process).
- Physical/technique damage: https://mtwildwood.net/damage.php ; hit: https://www.mtwildwood.net/hit-chance.php ; crit: https://www.mtwildwood.net/critical-hits.php ; guard: https://www.mtwildwood.net/guarding.php .
- Independent YW2 empirical research: https://note.com/atoato429429429/n/nfefe8749d432 (damage distributions and status stat multipliers treated as *study*, not complete reverse engineering).

### Remain unimplemented / blockers

- Actual attitude **four-way** decision weights: the current rental fixture has only Attack/Technique/Guard, no auto-Inspirit move, and limited status exceptions.
- Original loaf chance calculation (unit level, leader, skills), effect resistance and status damage / stat changes, correct purification gesture minigame, special-skill stacks, tribe bonuses, Soul gauge, Soultimates, YW2 Zero poking and G moves.
- Exact waiting/tie/rotation animation timing and original-match trace comparison; actual Sudden Death threshold and endgame rules.
- End-to-end two-client online room and Firebase Realtime Database, single self-contained HTML for Google Sites direct embed; iPad Safari physical verification.

**Next priority:** source-backed four-action selection, Inspirits and purification control states; source-check healing and sudden death rather than adding guesswork. Then automated PvP transport tests. Do not merge to main or publish Google Sites without explicit approval; zero spending.


---

## 2026-10-23 — Four-action research milestone (newest)

Research implementation is **on the feature branch only**, not on main or Google Sites.

- Combat AI now samples **Attack / Technique / Inspirit / Guard** (four base weights totaling 100 per rental fixture); basic game-code-derived attitude priority for **Gentle, Careful, Grouchy** factored into `engine/selection.mjs`.
- `engine/combat.mjs` includes an automatic negative sleep Inspirit, positive experimental Strength buff, fixture-based resistance checks and source-status logging. The Strength buff is **fictional 10%**; source-accurate YW2 Inspirit effect magnitude is not claimed.
- Existing backline-only purification removes negative statuses; UI displays sleep/buff markers and Inspirit/resistance log entries.
- Added **9 regression tests** in `tests/four-actions.test.mjs`. A local source mirror passed **58/58** `node --test tests/*.test.mjs`; this is NOT an authenticated GitHub Actions run.
- Headless Chromium local inlined-module UI test passed interaction and overflow checks at 1194x834 / 1024x768 / 1366x400 / 390x844 / 844x390. **Not a physical Safari or Google Sites direct-embed check**.
- 1,000 seeds, at most 2,000 actions each: Team A=**499**, Team B=**448**, unresolved=**53**. The unresolved games must not be hidden with an arbitrary timer.
- Full details, sources, test limitations, and remaining Phase 3 work: `docs/PHASE3_FOUR_ACTION_QA_20261023.md`.

**Next:** verify original Inspirit attack chances/effect magnitudes and skill priority; source-check original healing/sudden death; develop and test input-based purification (not instant click). Four-way combat still has no Soul, Soultimate, zero式 poking/G moves, real PvP or production-ready visuals.


---

## 2026-10-23 — Phase 4 Soul/G-tech research milestone (latest)

See detailed source and QA notebook: [PHASE4_SOUL_QA_20261023.md](./PHASE4_SOUL_QA_20261023.md).

- Implemented a new **isolated** Soul system `engine/soul.mjs`. Full Soul permits normal Soultimate; Watch Zero mode permits G-tech with caster and **two original-ring neighbors**, including backline neighbors, all full. The three meters are consumed only on a valid successful charge resolution.
- Developed two-step pending-charge token and stale/cancel protection; separate normal/zero mode gates, zero-mode Poke eligibility, zero-mode disables Pin.
- Integrated `soul` snapshot and `setWatchMode`, `giveSoul` (lab only), `prepareSoultimate`, `resolveSoultimate`, `pokeEligibility` into `engine/combat.mjs`.
- The current **research** display `lab/phase2.html` contains Soul meters, manual experimental `妖気+25` buttons, mode switch, charge start/completion/cancel and Poke-eligibility check.
- **Real Soultimate damage/heal, Soul recharge timing, charge minigame and Poke outcome remain UNIMPLEMENTED.** Default Soul income is zero; optional `researchSoulGainPerAction` is a non-original fixture. G double power flag is not incorrectly applied as damage×2.
- Actual remote GitHub branch CI on commit `71ce361c55f61d9773a3dbdc42d8cda04c82cf6f`: **success**, action run https://github.com/8mahi8/yokai-battle-lab/actions/runs/39871269551 . Prior run on `262b523...` explicitly reported **71/71 tests passed**, including 13 Soul module tests, 8 combat integration tests and 3 UI syntax checks.
- No real school Safari/iPad, visual browser QA for this new Soul UI, two-client transport, or Google Sites embed check has been performed for Phase 4.
- **Important:** This is not a completed Phase 4 and should not be promoted to main / published Google Sites. Next priorities are verified automatic Soul accumulation, charge minigame, actual move effects and tactical Poke/Soul conservation; original combat mechanics remain higher priority than additional art.


---

## 2026-10-23: Phase 4 touch-charge and interrupt research (LATEST)

Source-backed implementation: `engine/charge-input.mjs`, `engine/combat.mjs`, `engine/soul.mjs`, `lab/phase2.html`.

- The four original YW2 mini-game **types** (Spin, Tap, Trace, Align) are now deterministic gesture-driven research prototypes, selected from a seeded random draw. Trace repeats one fixture glyph three times and Align takes three clock alignments. Internal scoring, shapes, selection odds and timing are marked provisional.
- The game requires passing the touch challenge before it consumes a valid normal Soultimate or G-tech charge. A cancelled charge does not spend Soul. Mode switch and wheel rotation of the caster invalidate the pending charge. Caster normal action eligibility is suspended during charge as a *working hypothesis*.
- When the charging member is hit, use the documented interruption formula and hit-count-dependent base. An interrupted/KO'd charge is cancelled; the action log records that decision. Specific move interrupt modifiers, real status exceptions and loss-of-Soul behavior are not verified.
- New overlay with real browser Pointer Events, SVG targets, progress, cancel, and a manual 'advance one battle action' interruption test. `chargeInput` state-machine-level tests cover all four gestures but **physical touch gesture QA on actual Safari/iPad is not yet performed**.
- GitHub Actions unit suite: **91/91 PASS** as of the last verified Chromium-interaction run: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39873553071. Actual Chromium DOM and automated button clicks (Soul charge, cancel, rotation/purification, G-mode charge) passed. Exact finger event sequences in browser are still not E2E tested.
- Complete reference ledger and explicit fixture values: `docs/PHASE4_CHARGE_INPUT_QA_20261023.md`.

**Still out of scope / blocked:** real Soultimate attack/heal effects, exact recharge mechanics, in-game animations with overlapping tactical events and no-motion charge, Poke resolution, full original-rule fidelity, multiplayer sessions and production-ready single HTML Google Sites embedding. None of these should be described as complete. main and the published Google Sites version remain unchanged.


---

## 2026-10-23 — Isolated Soul recovery and special effects continuation (latest on THIS branch)

- **Branch:** `feat/phase4-soul-effects-research-20261023`. Created from `feat/phase1-action-circle-lab-20261023` commit `5fee7a3c...` because that parent branch was modified concurrently. Do not silently overwrite or merge concurrent feature work.
- `engine/soultimate-effects.mjs`: isolated original-rental move validation, observed nonattack recovery (+5 after *that actor's* turn, only experimental), temporary physical/magical special damage and healing formulas explicitly labeled as research hypotheses.
- `engine/combat.mjs`: `observedSoulRecovery` and `enableResearchSoultimateEffects` flags (both off by default); per-actor Soul; original rental attack/heal Soultimates; full Soul cost, target damage/heal, KO, opponent charge interruption, outcome log. Honors YW2 Soul grade capacities in the earlier parent rank implementation.
- `lab/phase2.html`: enables the experimental features in the local browser research UI only; shows actual target HP differences after successful touch charge, and `妖気+5` after eligible individual actions.
- `tools/browser-smoke.mjs`: after the prior DOM and button-click checks, now dispatches synthetic PointerEvents through a complete charge and validates the log of resulting experimental HP effect. This checks browser wiring, **not actual iPad touch latency or feel**.
- GitHub Actions on our branch: **101/101 PASS**, **0 failed**, **0 skipped**. Chromium rendered DOM + automated interaction smoke succeeded. Verified https://github.com/8mahi8/yokai-battle-lab/actions/runs/39913340191
- Detailed research ledger, exact sources, provisional assumptions, and remaining blockers in `docs/PHASE4B_SOUL_EFFECTS_QA_20261023.md`.

**Note:** The parent feature branch continued evolving independently and now also includes an alternative special-effects and actor-Soul implementation (`engine/special-effects.mjs`). These are **parallel candidates, not merged**. Review differences and combine tests rather than copy-pasting both into one engine. Do not touch `main` or the school Google Sites published HTML without user approval.
