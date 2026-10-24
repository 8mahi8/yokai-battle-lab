# Reproduction-first gate — Yo-kai Watch 2 PvP
2026-10-24 | Decision: **first reproduce existing battle behavior, only then improve.**

## Explicit user correction
User said: 「なんか妖怪ウォッチを改善しようとしてるけど、まずは再現からがけどちゃんとやってる？」
**Answer: Not yet at source-verified fidelity.** Progress on visual enhancements should NOT be presented as evidence of reproduction. Restore the user's fundamental priority and halt unrequested redesign, speculative improvements, and art/effect polish while foundational PvP mechanics are provisional.

## Source hierarchy
A. Original official [Level-5 battle description](https://www.youkai-watch.jp/yw2/game/game06.html) and official instruction manual — confirm basic UI, 3 front and reserve switching, standard/Zero/G/Poke. Do not interpret promotional copy as detailed numeric proof.
B. [Experienced YW2 PvP player's frame/motion/tactic notes](https://note.com/tombow_yw/n/n1e4cf179d2d9) and [detailed tactics and bug examples](https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c) — research leads for no-motion special, opponent-facing visual lag, charge/counter windows, and other competitive mechanics. **Community reports are hypotheses to verify**, not exact engine truths.
C. Actual match videos, annotated frame observations, and mechanic-specific reproducible tests should be consulted for each unresolved claim. Code tests alone only prove self-consistency.

## Fidelity matrix based on inspected branch
| Mechanic | Current | Faithfulness confidence | Next gate |
|--|--|--|--|
| Six-member battle, 3 front + 3 bench wheel | Implemented canonical ring, rotation and two seats | Core structural parity | Verify timing/snapshot visibility, reserve turn behavior |
| Automatic action choice/turn order | Deterministic scheduler and action weights | Provisional (rental stats/attitudes/weights original placeholders) | Research action cadence, weights, turn interrupt behavior and test reference situations |
| Basic attack/technique/heal/guard/critical/damage | Engine + opt-in research models | Partially source-grounded; detailed per-move effects and stats provisional | Write reference cases with explicit sources; match observed behavior before cosmetics |
| Inspirit/negative status and Purify | Core status ledger + five gesture trials | Basic imitation; duration/effect/mini-game timing not fully verified | Source specific effects/status expiry/charge interaction and compare |
| Soul generation/charge speed | Rank capacities + own nonattack +5 research option | **Incomplete**: attack/technique refill and exact character/skill rate unverified | Investigate via source videos and player testing; make full meter sources explicit |
| Normal Soultimate/G technique | Eligibility, neighbor Soul consumption, touch minigames, research damage/heal and cut-in | **Incomplete**: actual move-by-move values, timing, move interruption, semantics | Validate distinct normal/G before claiming reproduced |
| Zero Watch Poke | Trigger/UI/gesture and eligibility, reward unresolved | **Incomplete** (reward + priority + conditions) | Learn PvP-specific results; don't import single-player rewards blindly |
| No-motion Soultimate and opponent visual-state timing | Exploratory Phase 9 presentation/counter timing opts; online match not validated | **NOT reproduced** | Compare real PvP videos, build animation/visibility timing model |
| Four-corner two-screen battle UI | Original-inspired layout, distinct original familiars | Layout inspired, not pixel/interaction identical | Check authentic state transitions, lockouts/ready prompts, interaction sequence |
| Five-next-action forecast | Debug UI addition | **Not an original guaranteed PvP UI feature** | Keep developer-only until reproduction finished, exclude shipping target |
| 36° drag threshold, flashy enhancements | Own UX policy/FX | **Not proven original** | Preserve as clearly labeled provisional, avoid tuning as 'improvement' for now |
| Authentication, online transport, old Safari/Google Sites code embed | Local emulator proven | Actual iPad + live cloud not verified | Test after core battle parity gates |

## Immediate development order — locked until user's approval to improve
1. **Engine reference audit**: for one mechanic at a time document observed original rule, primary/community evidence, uncertainty and exact tests. Avoid retroactively blessing guessed values by having a passing test.
2. **Core fidelity**: action cadence, Soul accumulation, skill-specific stats, status durations and wheel input timing. Keep no Flash Soul in initial match as already agreed.
3. **Competitive fidelity**: normal Soultimate/G, Poke, no-motion + opponent presentation delay, counter cut-ins, chain attacks/adjacency. Verify against recorded source situations.
4. **Original-like interface with no invented guidance**: upper/lower screens and original copyright-safe characters remain; preserve only information the original shows in PvP. Remove/hide improvements (5-turn forecast, extras) from release-mode until fidelity matches.
5. **Test on two Chrome SDK seats + real school iPad Safari**, and only then create a self-contained original-engine Google Sites direct-code-paste version.

## Non-negotiable reporting
- Distinguish [implemented], [original-source-verified], [provisional fixture], [not reproduced] every phase.
- Every new fidelity claim needs source + repeatable evidence + matching engine tests.
- 375 passing tests are valid regression evidence, **not** evidence of fidelity.
- No main/Google Sites/public Firebase changes. No separate rushed mini-game.
- Do not resume "improvement" work without the original-rule parity gate or explicit new user decision.
