# Phase 18 — Reproduction-first Soul and G Soultimate fidelity
Date: 2026-10-24 JST
Dev branch: `feat/phase1-action-circle-lab-20261023`

## Scope
User explicitly reasserted **original Yo-kai Watch 2 PvP reproduction before any improvements**. This phase is NOT new VFX, not AI redesign, not a release. It corrects a source-verified mismatch in original battle control labels and charged Soul eligibility.

## Original-source evidence, with confidence

**Source-grounded high confidence:**
1. [Yo-kai Watch 2 official battle introduction](https://www.youkai-watch.jp/yw2/game/game06.html) demonstrates Watch Zero, G special and Poke.
2. [Game8 Soultimate guide](https://game8.jp/youkai-watch2/504498): selecting the normal **わざ** command should only offer monsters marked **わざOK** once their own Soul is full; the four Charge games are rotate/tap/trace/align.
3. [攻略の虎 Zero Watch explanation](https://toragame.com/youkai2/chart/06.php), [battle explanation](https://toragame.com/youkai2/kihon/battle.php): Zero Watch replaces the **わざ** command with **Gわざ** and **ねらう** with **つつく**, consumes adjacent Soul.
4. [攻略大百科 Zero Watch](https://gamepedia.jp/youkai-yw2/archives/1873): to use a G move, the casting front unit **AND BOTH fixed-ring neighbors** must individually have full Soul, even if the neighboring units are currently on the bench. G technique strength is commonly described as twice normal, but specific special move results can vary. Do not invent numeric effects without detailed sources.
5. [Mt. Wildwood Soul rank research](https://www.mtwildwood.net/soultimate-charge.php): Rank1=100, Rank2=150, Rank3=200, Rank4=250 Soul points; existing `engine/soul.mjs` implements these.
6. [Game8 general Soul recovery](https://game8.jp/youkai-watch2/504498): gauge fills naturally during battle and is influenced by move/rank/skills. A universal exact per-action regeneration is **not established by this source**. Existing host default +5 after nonattacking unit's own turn is only a narrow community finding; **do not invent attacking/time-based rates or misrepresent it as a complete original Soul economy**.

## Actual source-matched development changes

- `ui/soultimate-ready.mjs`: new **read-only projection using the existing authoritative `createSoulSystem().eligibility`**, not a second implementation of wheel neighbors or meter costs. Additional status gates only: living front, actor not unable-to-act, no pending touch actions, no finished game.
- `ui/match-stage.mjs`: `makeStageView` carries `specialReady`; pressing わざ highlights only full-Soul ready caster medals, not all three living front units. The literal source-grounded badge `わざOK` (or `GわざOK`) appears only while choosing a ready caster. Unready actors no longer falsely appear available.
- `ui/match-stage.mjs`: switching to Zero Watch correctly replaces `わざ` label with `Gわざ`. G readiness correctly consults **caster + fixed-ring two neighbors**, including rear neighbors, while normal readiness checks only the caster.
- `lab/yw2-layout.css`: lightweight readiness badge; no animation or stat changes.
- `ui/match-stage.mjs`: the original game's PvP interface does **not display a speculative five-next-turn forecast**, so `showResearchForecast=false` hides that research-only improvement by default. The underlying developer forecast calculations remain available for research, but are not presented as an original game mechanic.
- `tests/soultimate-readiness-parity.test.mjs`: three integration tests with **real** `createCombat()`—normal one-caster readiness, Zero G caster+neighbors with A6 on bench, blocked input, KO and unable-to-act. The test directly starts a guided G charge to verify the engine accepts the exact same A1+A2+A6 setup.
- `tests/match-stage.test.mjs` and `tools/stage-smoke.mjs`: reject the previous uncharged-frontline highlight assumptions.
- `lab/match-stage.html?review=soul-ready` and `?review=g-soul-ready`: explicitly **local screenshot QA fixtures**. Copies of canonical snapshots have Soul initialized to a reachable charged state for visual verification. This does not mutate any live match or grant Soul commands to players.
- `tools/stage-smoke.mjs`: real Chromium creates original-stage iframes for **normal わざOK** and **GわざOK**, asserts exactly one badge and that A6 still sits on the bench. Also asserts the future-action research overlay is hidden. All earlier wheel/pin/multi-touch QA remains.
- `.github/workflows/phase14-stage-qa.yml`: CI gates readiness tests and archives `phase18-g-soultimate-ready.png` with actual Chromium screenshots.

## Critical honest status: no false reproduction claim
1. **Real host-match special effect is still unimplemented by default.** The actual `createMatchProtocol` creates a battle without `researchSpecialEffects:true`. `engine/combat.mjs::resolveSoultimate` returns `effectStatus:'unimplemented'` after charge if no optional research counter. Therefore, a correct completed charge can spend Soul **without actually damaging/healing a target** in the default online battle. The optional research damage/heal fixture exists but its per-move values/targeting are NOT faithfully established. This is the NEXT MUST-FIX originality blocker, not a cosmetic tweak.
2. **Complete natural Soul accrual and Poke PvP rewards** still need original reference test cases and must not be fabricated. In particular, PvP rewards are narrower than single-player effects; check sources and competitive demonstrations.
3. **Normal vs G special effects per concrete move** may change more than simply doubling flat damage. Source-grounded taxonomy needs to be established before claiming correct effects.
4. Other open gates: actual online battle timing and opponent visual delays/no-motion Soultimate, last 3 turns cadence, true old school iPad Safari, direct Google Sites HTML embed, production cloud Firebase config. All untouched.
5. Default rental characters are original copyright-safe substitutes with provisional move stats; reproducing original game battle *rules* does not make those original character identities equivalent to real in-game Yo-kai.

## Verification evidence
- [Research battle Node run 40095520591](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40095520591): 378 passing Node tests, includes original-G-with-benched-neighbor.
- [Real Chrome original stage + gestures 40095520594](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40095520594): success after initial rework, before forecast-hide review.
- [Final browser + charged readiness fixture](https://github.com/8mahi8/yokai-battle-lab/actions/workflows/phase14-stage-qa.yml): inspect latest run status before claiming final verified.
- No deployment to main, live Firebase or Google Sites.

## Next test-driven original-reproduction work
1. Research exact selected move outcomes: offensive single-target/front AoE, healing, stage statuses, normal/G alternations; collect source observation for each. Prioritize G special that actually inflicts/recovers correct HP.
2. Make real match special resolution **not a no-op**, but only introduce effects with source-verified formulas/fixtures, with regression against actual observed examples. Do not silently flip approximate battle fixtures and call them original.
3. Research authentic rate of Soul gain during attacks/techniques/passive battle and Poke PvP-specific rewards; verify repeated battles or source measurements.
4. Only after parity gates restore or reconsider optional *improvements* such as five-action preview, character presentation polish, or novel strategies.
