# Phase 16B — Selectable command / target affordances
2026-10-24 JST

## Why
The user requires the overall battle layout and feel to stay close to **Yo-kai Watch 2**, using the already implemented upper field (enemy front 3 vs local front 3), one **local** lower six-medal wheel and four colored corner command tiles. The previous Phase16 layout was usable in QA, but the command buttons did not clearly indicate *which creature to tap next*. Priority is simple, fun, responsive 1v1 on school iPad Safari (not full browser-restart recovery).

## Implemented on development branch
- `ui/match-stage.mjs`: exported pure projection `matchSelectionHints(view,mode)`; reads the existing authoritative game's `makeStageView` state only. Never decides actual legal move or changes combat RNG/damage.
  - **わざ**: indicate front three *living* local medals as candidates; reserves are visually de-emphasized. Actual required Soul capacity and G conditions remain enforced by the original game engine, not a UI copy.
  - **おはらい**: indicate *only* benched living members with an existing negative Inspirit in the canonical state. When none exists, show `おはらいが必要な後衛はいません` instead of falsely implying every reserve needs purification. Engine still checks every command.
  - **ねらう**: show a visible target-selection label and outline for each living enemy front fighter, not the other team's six-medal wheel. The existing engine alone sets a Pin and only after selecting a foe.
  - **零式つつく**: mark enemy fighters as *possible candidates*, clearly showing `つつく？` plus instructions explaining extra negative-Inspirit / loafing conditions; do not claim any healthy enemy can actually be poked.
  - The three active command buttons expose `aria-pressed` and the field gets selection state; `mb-choice-status` is a text status indicator in the upper-screen caption.
  - Added current selection mode to render-cache keys to ensure the highlight updates without any battle-state change.
- `lab/yw2-layout.css`: lightweight, non-animated selection outlines, medal dimming, readable prompt and focus-visible outlines for keyboard access. Keeps low memory usage and 1024×768 compact layout.
- `lab/match-stage.html?review=target`: **local research-only** visual screenshot fixture to show target-selection state. No network, no special command dispatch.
- `tests/match-stage.test.mjs`: two more node test cases for canonical 3 front/3 bench, no negative-Inspirit, conditional purification, dead opponent, modes and side-symmetric targets.
- `tools/stage-smoke.mjs`: real Chromium clicks charge/purify/target/cancel, checks highlighted/dimmed medal counts, upper prompt and target pin, `aria-pressed`, zero poke conditional label; captures a new real target-selection screenshot.
- `.github/workflows/phase14-stage-qa.yml`: preserves the new `phase16-target-selection-preview.png` beside base/iPad/art previews.

## Verified
- [Node regression run 40090606364](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40090606364): **372 / 372 PASS**.
- [Actual Chrome stage + 10 PointerEvent gesture tests 40090606353](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40090606353): **PASS**; screenshot artifact `phase14-original-engine-stage-preview` contains target-selection preview and 1024×768 layout.
- [Previous two-real-Chromium Firebase Emulator match integration 40090470993](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40090470993): **PASS**, same original match engine and renderer; NOT a real production Firebase deployment.

## Actual screenshot review
Target mode image checked at 1024×768: upper fight shows three outlined targetable enemy fighters with prompt across the battle caption; lower `ねらう` is visibly selected and the local medal wheel is dimmed; other command buttons retain their places. Main controls fit in the landscape viewport, while development-only diagnostics may extend below the crop. The highlighted hint is **a possible target**, not proof that Poke is available. Keep this authentic upper/lower composition as the baseline.

## Still not finished
- Full original combat mechanics and exact numeric parameters are research fixtures and require further fidelity work. Some special moves, G moves and touch rules are not completely verified.
- Final polish: timing, hit impact feel, status icons, clearly differentiated disabled/ready Soul, actual iPad WebKit and Google Sites **code embed**. **Do not** publish the rushed standalone toy game; the actual engine is in this branch.
- No physical school iPad test, no real Firebase/cloud rules rollout, no main/Google Sites changes. Full-browser-restart match restoration deliberately out of scope for this hobby game.
