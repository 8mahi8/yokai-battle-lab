# Phase 2 research gate — 2026-10-23

Status: research/design, NOT implemented.

Sources checked:
- https://mtwildwood.net/battle.php — action order, attitude, hit, critical, damage, guarding, soul-gauge sequence.
- https://www.mtwildwood.net/turn-order.php — YW2 action wait 3 for most moves, 0 for items/system moves.
- https://game8.jp/youkai-watch2/505163 — pin/targeting, wheel, purification.

Proposed implementation sequence:
1. Original six-unit rental fixtures with HP, Strength, Spirit, Defense, Speed, attitude and moves. All numerical fixture stats must be labeled fictional.
2. Pure action-selection module: snapshot + actor + seeded RNG + pin -> move, target, reason. No guessed attitude probabilities labeled original.
3. Source-check YW2 hit, crit, damage, heal, guarding, element and KO formulas before implementation.
4. Feed move-specific action wait back to Phase 1 scheduler. Do not assume every move has the same wait.
5. Deterministic combat logs, KO/target-switch boundary tests, and browser visual QA.

Unresolved: attitude action probabilities, pin priority, KO handling, exact YW2 formulas, passive effect timing, victory conditions.

Release gate: source-backed rules, deterministic tests, end-to-end combat, browser review. Never modify main or Google Sites version without user approval.
