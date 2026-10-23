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

## 2026-10-23 afternoon — Phase 4 rank costs / working special effects (LATEST)

See `docs/PHASE4_SPECIAL_EFFECTS_QA_20261023.md` for authoritative evidence, source ranking, QA and open problems.

- **New source-backed Soul capacity table:** Soultimate charge rank 1/2/3/4 => 100/150/200/250 points, independently configurable per rental member and overridable for unknown special cases. This is the **Soultimate move rank**, not a character-rank shorthand.
- **Research-only usable special effects:** Pure planner `engine/special-effects.mjs` supports single/multi-target one-hit neutral damage and front-line ally healing. With `researchSpecialEffects:true`, completing regular Soultimate or G-tech now makes actual HP changes, KO and winner updates; match logs reflect each target. Original move-specific power, targets, healing and special effects still UNVERIFIED. The default simulation remains unchanged unless this opt-in flag is used.
- **Stronger research-based Soul income:** `researchSoulRecoveryMode:'owner-nonattack'` grants **5 to the acting member only** after certain nonattack actions, based on a YW2 player's experiments. Attack-time gain remains an explicit unknown and currently 0 *only in the lab*, not an asserted original rule. This replaces the former every-global-action +3 toy model in the UI. Debug `researchSoulGainPerAction` remains available separately.
- **Interrupt consistency:** damaging Soultimates now interrupt opponent charging casters using the same probability evaluator as ordinary attacks, including KO cancellation and no enemy Soul spending on a cancelled charge.
- **Real GitHub CI:** commit `111e521af1f64c1e0a0a8e71574ba90784f753d0` passed **111/111 Node tests**, 0 failed. Chromium rendered actual branch ESM and automatically completed one touch charge, verifying enemy HP fell and its research special log was emitted, in addition to earlier Soul/sleep/purification/G-mode checks. CI: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39913499508 .
- Does not represent full original YW2 battle model. Proper special effects, real passive gain under attack, no-motion exploit timing, Poke results, character animation, old iPad Safari, multiplayer and Google Sites direct-embed remain NOT IMPLEMENTED / NOT VERIFIED. `main`, Google Sites public version and live Firebase are unchanged.


---

## 2026-10-23 — randomized battle invariants / no-target Soultimate regression

- Added `tests/battle-invariants.test.mjs`: 25 deterministic seeds, up to 180 turns each, including charge/cancel/resolve, KO, reserve rotations and Soul gain. Checks HP and Soul bounds, KO action eligibility, charging actor eligibility, front-line identity and victory consistency.
- This uncovered a **real runtime crash**: resolving a Soultimate when the opposing front three were all KO'd but reserves were still alive caused `planResearchSpecial` to throw `living and target arrays required` **after** charge resolution. Fixed `engine/special-effects.mjs` so an empty valid frontline yields zero impacts instead of an exception, and added a targeted regression test.
- GitHub CI: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39914384316 — passing Node tests and actual Chromium render/interaction smoke. No iPad Safari or two-device online test yet.
- This is a simulator robustness fix, not proof of original-game Soultimate behavior when no enemy front targets exist. Original move target selection and animation timing remain research tasks.


---

## 2026-10-23: opponent-visible motion timeline / no-motion research (LATEST)

**Milestone:** `docs/PHASE5_MOTION_PRESENTATION_QA_20261023.md`.

- The source-reported competitive “no-motion Soultimate” is a **visibility and animation overlap effect**, NOT zero charging duration. Delayed opponent wheel/charge changes have now been modeled as a separate independent research presentation clock.
- `engine/presentation-timeline.mjs`: deterministic animation visibility lock, compressed chargeStart/chargeComplete into a no-motion release when the pair finishes within the same lock, unaffected normal slow charge, cancellation semantics, overlapping animation extension, independent side/token consistency, bounded defensive snapshots.
- `engine/combat.mjs`: opt-in `researchPresentation:true`, actual guided charge and cancellation, watch changes, rotation, normal action and hit interruption events bridged to a presentation-only clock. New research methods `beginPresentationMotion({durationMs,...})` and `advancePresentation(ms)`. DEFAULT behavior remains off. No wallclock conversion from the normal turn-point scheduler.
- `engine/phase1.mjs`: prediction `predict(count, actionWait)` now has 0..10 wait parameter mirroring `step(actionWait)` in the unmodified scheduler.
- `lab/phase2.html`: added a panel for explicitly fictional motion length and opponent-visible events. Timing experiment with 1000ms animation, 250ms/1000ms advance, no-motion marker after charge completed within the block.
- Source: https://note.com/tombow_yw/n/n1e4cf179d2d9 ; cross-check: https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c .
- **Verified exact GitHub code (commit `859552ca7e44ca5ee06aa2a8172150baebac7be1`): 133/133 Node tests passed, 0 failed, 0 skipped, with headless Chromium ESM loading and real button/pointer interactions including complete no-motion charge and delayed opponent reveal.**
  CI: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39917342500 .
- Research gap: proper action priority and animation frames, charge/visual/damage hit moment, actual counter-Soultimate interaction, move-by-move timelines and wall-clock slowdown; do not call these verified original mechanics. Actual iPad Safari and two-device online play remain untested. `main`, live Firebase and Google Sites direct-code build remain untouched.


---

## 2026-10-23 — Phase 5B Counter Soultimate: actual hit-time HP + dynamic target front (LATEST)

Source/engineering notebook: `docs/PHASE5_COUNTER_HIT_QA_20261023.md`.

- Original competitive report distinguishes (1) charge completed **during opposing Soultimate cut-in** → hit the front held at completion, (2) charge completed after cut-in → generally hit current front about **0.5s after cut-in**, and (3) **2 Endure (我慢) consumptions** → exception selecting the front shown *during cut-in*. Main source: https://note.com/tombow_yw/n/n1e4cf179d2d9 . **Timing and exact Endure frame are observations, not verified 3DS source code.**
- New isolated `engine/counter-window.mjs` timestamps cut-in, own charge start/finish, opponent frontline rotations and impacts with `completion`, `impact`, `endure-exception` target locks. The fixture assumes original cut-in front for the Endure exception; this specific frame is UNVERIFIED.
- `engine/combat.mjs` adds opt-in `researchCounterTiming:true` (requires researchPresentation and researchSpecialEffects). Valid counter charges spend Soul upon successful completion but **do not inflict HP until due**. At the computed hit clock, real research HP/KO/winner logic applies to the appropriate front targets; records one `counter-hit`. Cancels, mode switches, and rotation remain connected. Default old combat remains unchanged.
- `lab/phase2.html`: two visible manual cut-in scenarios, active hit time, current front, locked front and result log. No original-game art or copyrighted sprites.
- Actual branch verification: Node test suite and Chromium synthetic-touch E2E both passing on https://github.com/8mahi8/yokai-battle-lab/actions/runs/39919485794 (151/151 tests), including HP unchanged during counter charge and affected only after animation gate. Additional once-only/atomic counter regressions were committed later; consult latest green run.
- Source fidelity gap: independent research virtual clocks only, fixed animation 800ms and ~500ms lag fixture, genuine Endure and move hit frames absent. *No* authoritative networked PvP, school Safari real-device QA or direct Google Sites paste testing. **Neither main nor live Google Sites/Firebase changed.**


---

## 2026-10-23 — Phase 5C: paired wheel-rotation targeting / no-motion display QA (LATEST)

Details and source ledger: **[PHASE5_WHEEL_PAIR_QA_20261023.md](./PHASE5_WHEEL_PAIR_QA_20261023.md)**.

- Competitive source https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c reports: two wheel rotations with no intervening ordinary Yo-kai action can suppress the **intermediate front** as a Soultimate targeting candidate. This is **player-observed behavior**, NOT a disassembled game-source fact.
- Added `engine/wheel-coalescing.mjs` and `researchWheelCoalescing:true` (optional, requires counter research). First rotation tracked; if special charge completes between the first and second rotation, a second rotation can correct **the pending early counter target IDs** to the original front, but **never after the damage has resolved**. A special completed after both rotations still targets the final front. An ordinary auto action clears grouping.
- The opponent presentation timeline has optional `coalesceRotations` and shows only the final rotation within a hidden animation block, separated by actual auto-action events; payload includes the visible front.
- `engine/counter-window.mjs` supports one validated `revisePendingTarget`. **Fixed a real boundary bug**: a wheel movement at a timestamp-due counter hit could previously silently erase that hit before HP was applied. `setFront` now rejects due hits until dispatched, while `combat.rotate` and `combat.step` first drain due hits using zero-time advance.
- Research lab shows rotation count, actual physical front, correction event and manual two-turn demo; synthetic pointer E2E verifies a charge completed BETWEEN the two wheel changes, then the original front takes HP at the due hit while the intermediate pose is not shown to the opponent.
- **Confirmed on GitHub Actions (before doc-only commits): 180/180 unit tests passed, zero failures, plus the real Chromium render/gesture/opponent-gate smoke test**, https://github.com/8mahi8/yokai-battle-lab/actions/runs/39921476753 .
- **Key uncertainties remain:** exact original wheel-pair frame boundary, 3+ consecutive rotations, whether real hit timing uses cut-in start vs end, real Endure mechanics, authentic networking and school iPad Safari. Nothing here warrants release. Keep main and published Google Sites unchanged.


---

## 2026-10-23 — Phase 5D: 3+ wheel unknown-state handling + action boundary verification (LATEST)

Primary research and technical evidence: [PHASE5_THREE_PLUS_ROTATIONS_QA_20261023.md](./PHASE5_THREE_PLUS_ROTATIONS_QA_20261023.md).

- **External research boundary:** Competitive sources describe exactly TWO wheel turns without an intervening Yo-kai automatic action (intermediate front gets ignored), but provide no trustworthy reproducible rule for THREE or MORE consecutive rotations. Original-turn priority and Flash Soul research suggest an action boundary is important but its precise scheduling remains unsettled: https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c , https://note.com/tombow_yw/n/n1e4cf179d2d9 and https://note.com/ricosama0726/n/n14710bbe446c .
- **Code updated:** `engine/wheel-coalescing.mjs` records and returns `three-plus-rotations-unverified` from the third turn onward, with immutable bounded uncertainty history. Existing sourced TWO-turn candidate-target correction remains intact.
- `engine/combat.mjs`: in the **opt-in research mode**, delayed counter hits touched by 3+ rotations are classified `counter-hit-indeterminate`, not applied as speculative HP/KO/winner changes. This is an *unknown-result flag*, NOT an assertion that YW2 cancels an attack. Other-team moves do not contaminate the target-side result; an action boundary resets wheel-pair grouping without retrospectively inventing target evidence.
- `engine/presentation-timeline.mjs`: tags aggregated 3+ hidden turns `unsourcedThreePlus:true` so an experimental coalesced render is never presented as verified original behavior.
- `lab/phase2.html`: new B three-turn experiment button, clear unverified-warning display, hit-time candidate vs actual HP difference, and no-damage indeterminate results.
- Tests: `tests/wheel-three-plus.test.mjs` (7), `tests/combat-wheel-action-boundaries.test.mjs` (3), `tests/rotation-three-plus-visibility.test.mjs` (3), plus real Chromium synthetic-pointer two-vs-three-turn E2E assertions.
- **Actual GitHub CI:** `193/193` tests passed with **0 fail / 0 skip**, and real Chromium render + interactive branch ESM and button/touch tests passed on https://github.com/8mahi8/yokai-battle-lab/actions/runs/39926638836 . Docs-only commits after this run should be checked against their own workflow result.
- Original 3DS split-video comparison needed before implementing 3+ targeting. Source-backed initial action rights and Flash Soul consumption also need isolated research before scheduler changes. No user action needed yet; **main, live Google Sites version and production Firebase remain unchanged**.


---

## 2026-10-23 — Phase 6: initial-front action rights / Flash Soul experimental prototype (LATEST)

Detailed source and implementation ledger: **[PHASE6_OPENING_FLASH_QA_20261023.md](./PHASE6_OPENING_FLASH_QA_20261023.md)**.

- Investigated matching-time original-front bias, weaker-than-earned opening rights, and Flash Soul's one-time interception of the next planned actor. Sources: https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c , https://note.com/ricosama0726/n/n14710bbe446c , https://note.com/tombow_yw/n/n1e4cf179d2d9 ; grounded baseline speed/initial wait table: https://www.mtwildwood.net/turn-order.php .
- Added **opt-in** `engine/opening-priority.mjs`. Tracks the matching-time registered front independently of currently visible wheel positions, one-use Flash flags and action interception. `skippedTurnPolicy:'consume'|'preserve'` is a **pair of research hypotheses**, not a verified Flash point formula. Flash does NOT become a permanent speed boost and its flag is not used up by merely rotating to rear.
- `engine/phase1.mjs`: optional `openingPriorityResearch` changes real seeded action selection, annotates consumed Flash and replaced original actor, and supports identical non-mutating 5-action forecasts. `visibleStartOffsets` and `matchingCreditMode:'metadata-only'|'initial-wait'` let original matching-front registration be compared with the lineup displayed immediately before combat. The latter uses the published speed-specific opening wait as a **provisional interpretation**, valid only before the first auto action; no unsupported numerical original-front credit is forced on default battles.
- `engine/combat.mjs`: optional `researchOpeningPriority` connects Flash selection to actual BOT combat actions; default identical rental party is untouched.
- `lab/phase1.html`: Flash ON/OFF, deploy B6, original matching-front toggle, prebattle half-turn, matching initial-wait comparison, and skipped-turn wait policy, with one-use Flash badge, next-five forecast and labeled assumptions.
- New tests `opening-priority` 7, `phase1-opening-flash` 8, `combat-opening-flash` 6, `opening-priority-ui` 2 and `opening-match-offset` 6. **222/222 tests PASS; zero fail/skip** in actual GitHub CI at https://github.com/8mahi8/yokai-battle-lab/actions/runs/39929586534 . Real headless Chromium exercised both the new Phase 1 matching/Flash UI and previous Phase 4/5 battle interactions.
- **Important unsourced gaps:** correct Flash point subtraction and skip compensation, initial-front advantage surviving after others already act, multiple simultaneous Flash ordering, no-action infinite Flash exploit and proper source-frame timing. No physical old iPad Safari or network peer match tested. Remains research-only. `main`, published Google Sites and production Firebase unchanged.


---

## 2026-10-23 — Phase 7: initial-version fundamentals restored; Watch Zero Poke usable (LATEST)

Research and full QA details: [PHASE7_INITIAL_POKE_QA_20261023.md](./PHASE7_INITIAL_POKE_QA_20261023.md).

- **Confirmed scope:** Original launch's shared six-rental team **does not include Flash Soul**. Phase 6 Flash remains available only as a separate research experiment, default OFF. Development has returned to the initial necessary combat controls.
- Nintendo's official YW2 manual confirms Zero Watch Poke replaces Target/Pin, works on **Loafing or Inspirited** enemies, requires rapid tapping to fill a gauge, and can give rewards including draining enemy Soul. Source: https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-Yo-Kai_Watch_2_Fleshy_Souls .
- `engine/poke-input.mjs`: touch input meter, target circle, progress/completion validation; **12 hits / generous circle are research fixtures**, not reconstructed 3DS values.
- `engine/combat.mjs`: begin / tap / cancel Poke command, one successful Poke per enemy per side, interrupted attempts cancel on watch change or target rotating away, living enemy and active negative Inspirit/Loaf status gating. Loaf vulnerability until next own action remains **a hypothesis**. Poke and charge minigames cannot overlap on the same side.
- Unverified Poke reward numbers remain **OFF by default**. Lab-only `researchPokeSoulTransfer:20` drains at most 20 Soul from the affected foe to the first living own front ally, respecting Soul availability/capacity. This particular amount, recipient and fixed outcome are NOT original YW2 facts; friendship and money rewards are omitted for initial 1v1.
- `lab/phase2.html`: Watch Zero enemy buttons now open real pointer-tap Poke overlay, with progress bar, cancel and lab-only Soul-transfer feedback; default Watch Pin and G-tech continue to work.
- Added unit/integration tests and real headless Chromium synthesized-pointer browser E2E (sleep B1, zero switch, poke B1 twelve times, lab transfer and reuse prevention, Poke B2 cancel). Verified **238/238 passing** at run https://github.com/8mahi8/yokai-battle-lab/actions/runs/39943107156 ; an additional mutually exclusive G/Poke test was added afterward (check latest CI).
- Still research, not production: exact enemy Soul gain/drain/reward RNG, actual Poke tap thresholds and windows, purify gestures, statuses and attack formulas, physical old Safari iPad + multiplayer network transport + direct embedded Google Sites HTML.
- User action NOT required at this phase. `main`, published Google Sites and production Firebase unchanged; no paid service used.


---

## 2026-10-23 — Phase 8: five touch Purify challenges for initial rental battle (LATEST)

Full research sources, code, QA and open fidelity gaps: [PHASE8_PURIFY_TOUCH_QA_20261023.md](./PHASE8_PURIFY_TOUCH_QA_20261023.md).

- **Original YW2 supports five normal touch purification kinds**: つぶせ / 連打 / こすれ / まわせ / 斬れ. A negatively Inspirited ally must be rotated into the bench and the touch action completed before cure. References: Nintendo's official YW2 manual, https://game8.jp/youkai-watch2/505163 and https://gamepedia.jp/youkai-yw2/archives/1397 .
- Added pure `engine/purify-input.mjs`: guarded normalized pointer input for five kinds, 0–100% progress, deterministic lab selection, defensive snapshots. Geometry, difficulty and frequency are **research fixtures** until original recordings corroborate them.
- Combat API now includes `beginPurify`, `purifyInput`, `cancelPurify`. A negative Inspirit remains active until successful completion, and cancelling or returning to frontline interrupts without cleansing. Positive status retained. Same watch cannot run Poke/Soultimate/Purify concurrently. Instant old `purify()` remains only for developer/test backward compatibility and is **not used by player UI**.
- The real `lab/phase2.html` overlay renders each gesture and uses touch/pointer events. Optional kind selector clearly labelled as research-only. No fake experience rewards in friend PvP.
- **Actual CI:** 257/257 tests passed on https://github.com/8mahi8/yokai-battle-lab/actions/runs/39956769749 , plus headless Chromium synthetic PointerEvents executed all five patterns, cancellation, return-to-front interruption and prior battle regression scenarios. Added UI contract tests afterward; check subsequent latest CI before treating new exact totals as confirmed.
- Reminder: initial rental team **does not contain Flash Soul**. Phase 6 Flash remains separately opt-in and not promoted to default.
- Remaining: exact original gesture thresholds, school iPad Safari physical-touch QA, source-correct stats, two-peer network session and Google Sites direct embed. No main/Google Sites/Firebase deployment or cost.


---

## 2026-10-23 — Phase 9: initial-version attack, technique, hit chance and Inspirit stages (LATEST)

Implementation details, game-data research, QA and unverified assumptions: **[PHASE9_BASIC_DAMAGE_ACCURACY_QA_20261023.md](./PHASE9_BASIC_DAMAGE_ACCURACY_QA_20261023.md)**.

- Rechecked YW2 data-mined single-hit damage formulas and guard, per-element resistance, attack-specific accuracy, critical chances and stat-stage multiplier table against Mt. Wildwood's YW2 pages: https://mtwildwood.net/damage.php?g=yw2 , https://mtwildwood.net/elements.php , https://mtwildwood.net/stat-changes.php?g=yw2 , https://mtwildwood.net/hit-chance.php , https://mtwildwood.net/critical-hits.php .
- Added `engine/damage-model.mjs`: YW2-inspired neutral Attack/Technique and critical formulas, special critical Defense input, elemental affinity, physical-only guard-break and exact source 17-stage stat table (stage -8 through +8). The `hits` option calculates **one hit of a multi-hit move** but full repeated hit scheduling is NOT yet wired into combat. Strong-up Inspirit effects add their level as research stat stages, clamped +8.
- Added `engine/hit-model.mjs`: fractional basic speed hit chance 75–98%, normal physical move-specific accuracy multiplier, technique baseline hit chance, one-in-99 critical and +6/99 on Loafing target. Other accuracy/crit modifiers remain undone.
- Updated `engine/inspirit.mjs` to retain explicit application level 1–4 and `engine/combat.mjs` to validate optional per-renter technique element/resistance/crit-defense/Inspirit level/accuracy/crit immunity/guard-break, with **`researchDamageModel:true` opt-in only**. Default `createCombat()` still uses previous auto battle behavior; separate advanced Flash remains OFF for initial rental.
- `lab/phase2.html` research view uses **identical six-member original-character rental teams** with intentionally fictional elemental balance fixtures and visible `研究補正` damage log. Never call those elemental affinities original YW2 character data.
- New source-calculation tests (10), hit/critical tests (5), deterministic combat-damage tests (6) and combat-hit tests (5), covering defensive state, statuses, move accuracy, and many simulated actions/seeds; previous Soultimate, Zero Poke, five Purify touch types, wheel and counter tests stayed green. Code/test milestone reached **286/286 passed**, Chromium research damage display and all previous touch/browser smoke passed on https://github.com/8mahi8/yokai-battle-lab/actions/runs/39960508755 .
- Original unverified: per-move critical defense, rounding subtleties, full multi-hit actor/hit/time updates, accurate healing, other negative Inspirits, authentic Soul generation, Safari hardware, authoritative online 1v1 and Google Sites single-HTML direct paste. Nothing ready for user school testing or publishing; **main/live Google Sites/Firebase unchanged**.
