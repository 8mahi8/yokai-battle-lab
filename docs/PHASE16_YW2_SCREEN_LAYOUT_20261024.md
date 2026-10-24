# Phase 16 — Original Yo-kai Watch 2–inspired upper/lower battle layout
Date: 2026-10-24 JST

## User instruction
User delegated continued game development and requested the **screen composition be as close as practical to the original Yo-kai Watch battle interface**, while preserving the original hand-authored six SVG characters and prior deterministic game engine. The hobby game is intended for 1v1 on school iPad Safari via code pasted DIRECTLY into Google Sites (no GitHub Pages embed), with a special emphasis on readable, fun, low-latency gameplay. Do **not** rush an unrelated mini-game as a school build. Full browser-restart match recovery is not required.

## Reference research
- [Level-5 official Yo-kai Watch 2 battle information](https://www.youkai-watch.jp/yw2/game/game06.html): upper screen shows real-time enemy vs ally fighters; touch lower screen shows wheel/commands.
- [Official game's description for families](https://www.youkai-watch.jp/yw2/family/about/index.html): two-screen battle, command wheel and buttons.
- [Nintendo official Yo-kai Watch 2 3DS manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_3ds_2/yokaiwatch2/ElectronicManual_Nintendo3DS_YokaiWatch2_FleshySouls_EN.pdf): Upper screen enemies and three front-row allies; lower screen 6-medal wheel, Soultimate/Target/Purify/Item, Soul Meter; competitive official battles disallow items.
- [Formation screenshot/explanation](https://gamepedia.jp/youkai-yw2/archives/1408): 3 front, 3 reserves in a single wheel.

References are **layout/interaction studies**, not imported copyrighted sprites. The six characters and game background are original.

## Implemented
1. `ui/match-stage.mjs`: replaced the dual-side-by-side six-circle battlefield UI with a **two-screen battle composition**:
   - **Upper**: enemy's active 3, local active 3, live original SVG sprites, HP, own Soul meters, small animation reactions, turn/action feedback, existing five-action forecast.
   - **Lower**: exactly one local six-medal wheel visible (the other seat wheel stays hidden), center front/back marker, left/right rotation, **four colored corner command tiles** — わざ/ねらう/おはらい/アイテム.
   - Standard Watch: tap **ねらう**, then choose a live enemy in upper battle to pin; Zero Watch: target button changes to **つつく**, with existing pokeStart action. **わざ** and **おはらい** first enter selection mode, then tap a front or back medal respectively. User can cancel selection. Rotating the wheel changes front-row stage instantly through the **same canonical match-protocol**.
   - **アイテム is visibly disabled in official-style competitive 1v1**, matching the manual; no fake usable button.
   - Zero Watch G-move-specific combat action is **NOT yet implemented** in the original online protocol. Do not relabel ordinary chargeStart as a complete G-move. Add later only once semantics verified.
   - Team A/B two-seat local tester swaps own perspective, while online host/guest have a fixed seat.
2. `lab/yw2-layout.css`: original art-directed scene with environment perspective, enemy/ally fighter rows and 6-seat gold medal wheel, four color-coded command tiles and a compact old-iPad landscape `max-height:820px` variant. CSS draws shapes, not official art or copied pixels.
3. `lab/match-stage.html`, `lab/firebase-match-stage.html`, `lab/gesture-stage-qa.html`: all use the same production-aligned stage and additional stylesheet. **No live Firebase config written/deployed.**
4. `tools/stage-smoke.mjs`: real Chromium verifies three enemy/three ally fighters, exactly one visible wheel, 6 distinct original SVG characters on both projections, disabled PvP item, mode-select for Soultimate/Purify/Target, target pin, rotate, Zero Poke label, seat perspective swap and five-action forecast. Also creates a genuine 1024×768 iPad-class landscape screenshot.
5. `.github/workflows/phase14-stage-qa.yml`: saves screenshots in CI artifact:
   - `phase14-stage-preview.png` (desktop)
   - `phase15-character-gallery.png` (six original designs)
   - `phase16-ipad-landscape-preview.png` (1024×768 screen compactness)

## Verification
- [Stage Chromium + 10 gesture QA run 40087862922](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40087862922): **success**. Includes four original command tiles, pin/zero mode wheel behavior, foreground 3v3, touch trials and actual browser screenshots.
- [Research regression run 40087862906](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40087862906): **success**, 370 Node tests.
- [Firebase two-browser emulator run 40087612059](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40087612059): **success** with Phase16 UI; no real public cloud network claim.
- Preview screenshot reviewed at 1024×768: all four large corner buttons, 6 local medals and upper 3v3 visible without horizontal overflow, lower **developer diagnostics** extend below the crop. This is a research page, not a polished shipping game.
- School old-iPad physical WebKit, Google Sites code-direct-embed, full online production Firebase, true match timing and overall user aesthetic approval remain **UNVERIFIED**.

## Next work
Keep this upper/lower composition as the default base. Polish individual battle reactions/idle motion, move/target highlights, and target-selection affordances; reduce diagnostic chrome for eventual real match. Revisit Zero G move ONLY with authentic game rules/engine support. Later bundle complete original game code into a self-contained Google Sites paste payload and test on school iPad before release. Continue original roster, not rushed substitute.
