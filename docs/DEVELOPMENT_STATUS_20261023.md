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
