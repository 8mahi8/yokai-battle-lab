# Phase 2 implementation status — 2026-10-23

**Branch-only research build. Not a validated Yo-kai Watch 2 clone.**

## Implemented in engine/combat.mjs

- Mirrored, original six-unit rental teams with 3 front / 3 bench.
- Deterministic seeded auto-selection (attack, offensive technique, heal, guard); fixture-specific weights for reproducibility, **not** authoritative original attitude probabilities.
- Speed-based hit percentage, one-hit attack/technique calculations, a simple default critical roll, guard reduction, HP changes, KO, all-six-defeated winner logic, and player pin.
- KO removes actors from Phase 1 scheduling. Pin clears when its target becomes invalid.
- Optional automatic reserve rotation **only for autonomous BOT laboratory tests**, not an authentic PvP rule; disabled mode returns awaiting_rotation.
- Event log and snapshot for deterministic regression testing.
- No original game sprites, copied art, music, or trademark-dependent code.

## Formula provenance

- https://www.mtwildwood.net/turn-order.php — YW2 wait counter/first-wait table/move wait.
- https://www.mtwildwood.net/yokai-wheel.php — wheel/front/bench/rotating-in wait; timer treatment differs by battle mode.
- https://mtwildwood.net/hit-chance.php — base speed-related hit % 75..98.
- https://mtwildwood.net/critical-hits.php — baseline YW2 chance 1 in 99, plus attack/abilities modifiers **not yet modeled**.
- https://mtwildwood.net/damage.php — YW2 one-hit physical/magical formulas, ±10%+1 variation without guard.
- https://mtwildwood.net/guarding.php — 0.5 guard factor, additional boost/skills **not modeled**.
- https://www.mtwildwood.net/attitudes.php — weights and attitude rules; code currently uses explicit fictional rental-fixture weights **without replicating condition-specific attitude rules**.
- https://gamepedia.jp/youkai-yw2/archives/1454 — behavior/attitude category explanation.

### Explicit assumptions or missing systems

- Exact floating-point operation order, randomized damage distribution, special accuracy/crit effects, elemental resistances, move levels/hits, soultimate interruptions, and KO side effects may diverge from game.
- Healing magnitude `floor((power + spirit)/3)` is **a fictional experimental placeholder**, not a sourced YW2 formula.
- Guard clear-on-next-actor turn used as a working model, needs YW2 PvP verification.
- Original attitude probability, targeting priority and AI move choice are not yet reproduced.
- No possession/inspirit, purification, loafing, Soul gauge, poking, G moves, tribe bonuses or skills.
- For test seed 8, healing-heavy remaining survivors can stalemate for over 1,500 actions. Do not add a guessed time-limit win to conceal this: research original match timeout first.
- No timing-based opponent synchronisation or school Safari/Google Sites test.
- Phase 1 remains a discrete-event approximation; exact tie-handling/animation timing incomplete.

## Tests

`node --test tests/combat.test.mjs`: **10/10 PASS** (locally with a local mirror of Phase 1 engine including the same KO/action-wait changes). This does not independently verify original-game fidelity.
Other `tests/phase1.test.mjs` historical tests should be run together on repository clone/CI.

## Next gates

1. Cross-check entire original Phase 1 suite and accuracy formulas against real captured battles.
2. Separate source-backed attitude decision rules from rental-fixture weights; implement verified healing and status/loaf mechanics.
3. Browser demo QA: render + buttons + turn log + pin/rotate and Safari landscape; do not call iPad testing complete until physical-device check.
4. No changes to main/Google Sites without user consent; zero paid resources.
