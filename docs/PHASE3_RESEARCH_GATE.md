# Phase 3 research gate — 2026-10-23

Scope: Inspirits/possession, purification, loafing, passives, Souls and front-line Tribe bonuses. **No Phase 3 gameplay code is claimed yet.**

## Sources consulted

- https://www.mtwildwood.net/inspirits.php — Inspirit resistance, effect levels, positive/negative durations (cross-game version labeling must be verified per effect).
- https://www.mtwildwood.net/attitudes.php — before moving, loafing can be checked; normal unit chance and modifiers differ.
- https://www.mtwildwood.net/yokai-wheel.php — YW2 same-tribe side-by-side bonuses with specific percentages (Tough Defense +40% for two, +60% for three; Charming Speed +10%/+15%, etc).
- https://gamepedia.jp/youkai-yw2/archives/1397 — purification removes negative Inspirits after the unit rotates to the back.
- https://game8.jp/youkai-watch2/505163 — target pin, wheel, purification mini-actions.

## Separate processing responsibilities

1. Pure status data structure (positive/negative effects, source, rank, clock).
2. On-turn / on-action expiration rules, with versions explicitly labeled YW2; do not conflate YW3 behavior.
3. Status application probability and resistance; differentiate inability to act from ordinary loafing.
4. Only rear-line units can be purified, with a clear input window and cancellation/interrupt semantics; touch-game timing is **unresearched**.
5. Recompute front-line tribe bonuses on eligible changes; ensure the speed-to-wait ordering changes at a sourced point, not arbitrarily mid-counter.
6. Skills/Soul items can modify the above but do not embed item-specific exceptions in the core scheduler.
7. Tests: status expires precisely; stacks; rotate front/back; pinned targets; KO while inspirited; turn skipping; AI determinism.

## Research blockers

- Precise YW2 Inspirit hit chance and max stacking/priority, resistance modifier ordering.
- YW2 duration counting when the target is on the bench and when KOed.
- How an inability-to-act status interacts with wait counters and returns from bench.
- Loafing probability by level/leader and its effect on action wait.
- PvP purification input mechanics and whether actions continue during mini-game.
- Special souls including Flash Soul intentionally excluded from first release.

Do not create simplified invented status rules and describe them as verified original behavior. Keep progress on this branch, no main / Google Sites changes.
