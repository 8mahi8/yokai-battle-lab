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
