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


## 2026-10-23 additional research: long-match sudden death

Further research after discovering seed=8's long-running heal/guard battle found an important **original YW2 official-rule** behavior: when a PvP battle lasts long enough, Sudden Death forces physical attacks and damage of 999 (reported by multiple secondary sources).
- https://asobigokoro.work/yokai-watch-2-ganso-honke-shinuchi/
- https://please.untaint.us/?url=https%3A%2F%2Fja.wikipedia.org%2Fwiki%2F%E5%A6%96%E6%80%AA%E3%82%A6%E3%82%A9%E3%83%83%E3%83%812_%E5%85%83%E7%A5%96%2F%E6%9C%AC%E5%AE%B6%2F%E7%9C%9F%E6%89%93

**Important:** Neither the exact elapsed-time threshold nor transitions were independently established. Do not invent a fixed action-count sudden-death threshold and call it source-accurate. Treat this as a Phase 2 research blocker rather than an arbitrary timeout fix.

The established source https://www.mtwildwood.net/yokai-wheel.php describes YW2 a **four-second window to rotate for battles with a spin timer**, whereas Japanese PvP accounts call it a **three-second rule**; this may refer to different timer intervals, input windows, or versions. The existing Phase 1 default 3000 ms is a **configurable lab placeholder** and is not enough to certify PvP correctness.

### Browser QA caveat

A self-contained interactive test page was committed as `lab/phase2.html`, referencing both ESM modules relative to that path. The local UI script passes Node syntax checking, but Chromium screenshot rendering failed due to headless browser startup timeout in the current runtime. **No rendered-page visual approval or actual Safari/iPad test is claimed.**
