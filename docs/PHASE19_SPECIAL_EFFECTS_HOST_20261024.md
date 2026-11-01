# Phase 19 — Actual host Soultimate outcomes, explicitly provisional individual move numbers
Date: 2026-10-24 JST
Branch: `feat/phase1-action-circle-lab-20261023`

## User decision and task
The user instructed "first reproduce Yo-kai Watch 2 PvP, only afterwards improve". Phase18 identified a concrete playable blocker: the original engine permitted a complete normal/G charge, then consumed Soul **without dealing damage or healing** because `createMatchProtocol` created `createCombat` without `researchSpecialEffects:true`. The user delegated fixing this and requested external-reference checks.

## External references verified this phase
- [Level-5 official battle page](https://www.youkai-watch.jp/yw2/game/game06.html): normal and Watch Zero G techniques, charged G uses more Soul and is more powerful. This verifies the basic effect *exists* and G is not merely a cosmetic button, but it **does not provide exact move-by-move numbers**.
- [攻略大百科 full 398 Soultimate list](https://gamepedia.jp/youkai-yw2/specials): lists offensive single-target attacks (e.g. 切り込み一番 威力155×1), attacks against multiple targets (e.g. さみだれようじ 威力20×7), front/full-team healing (e.g. ピカピカ除菌の術 威力70×1, party heal + purify), attack/defense boosts and numerous other move families. **Not all Soultimates are identical physical one-hit AoE.** Original-rental character names are original creations, so no actual official exact power or hit counts can be assigned without deliberate design research.
- [Mt. Wildwood original mechanics analysis](https://www.mtwildwood.net/damage.php?g=yw1) describes YW2's physical/technique per-hit calculation family, element multipliers, critical/guard and ±damage/10 spread. Existing `engine/special-effects.mjs` has only a deterministic **one-hit approximation** without per-move multi-hit, variance, elemental affinities and many skills; therefore **not numerically faithful** even if the form resembles a YW2 damage formula.
- [3DSNote game-2 Soultimate categories](https://3dsnote.com/youkai2/hissatsu-ichiran/): corroborates single/all attacks, recoveries, buffs, statuses and revive moves. Its categories are background corroboration, not primary move definition.

## Changes made
1. `engine/match-protocol.mjs`: the original development match-host now creates `createCombat` with **`researchSpecialEffects:true` as an explicit source-typology study default**, so a legitimately charged normal or G move now actually resolves the already implemented attack/healing *fixture* on authoritative host state. A caller can still explicitly pass `researchSpecialEffects:false` to leave the effect unimplemented for controlled research or backward comparison. **This is not a claim of exact original Yo-kai Watch move damage.**
2. Engine `applyResearchSpecial` and `planResearchSpecial` are reused without change; these modules already mark the battle event `model:'research-fixture'` and output `effectStatus:'research-fixture'`. True deterministic match replay, host-only authority and anti-dupe sequencing remain untouched.
3. `ui/match-stage.mjs`: visible disclaimer now explicitly states original game is being researched and **individual Soultimate powers/effects are provisional**, so the user cannot mistake working damages for a completed replica.
4. `tests/match-special-effects-active.test.mjs`: **real host command path**: owner guard actions naturally charge the Soul gauge without an unsafe giveSoul command, player launches chargeStart, inputs every kind of guided trial, checks damage on exactly enemy front 3, no effect on bench 3, exactly one event and precisely one Soul-meter expenditure. Deterministic `replayMatchJournal` validated. Second test explicit study opt-out remains no-effect. Third test `createCombat` Watch Zero A6+A1+A2 (with A6 still benched) consumes exactly those Soul meters and resolves G damage only once.
5. No graphic upgrades, invented information display, account data, production Firebase, Google Sites published game or main branch changes.

## QA
- [Research unit suite **381/381 PASS**](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40096963285).
- [Real Chromium stage + touch minigames PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40096963300).
- [Firebase emulator two-browser battle](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40096963299): inspect latest conclusion when reporting; no production connection or physical Safari test.
- No sourced real-move numeric parity claim or unverified new guaranteed accuracy.

## Remaining primary fidelity blockers — more important than visual polish
1. **Specific Soul-move data:** build an explicit rental move matrix (single/multi-target, hit count, technique/physical/element, stat effects, resurrection, unique status) using documented original action families; separate data-field provenance and unknowns. Our six characters remain original so final per-character powers require clearly accepted design choices, not pretending they are original values.
2. **Multi-hit Soultimates**, critical/guard/element resistance and interruption per hit: original examples specify ×5, ×7, ×10; our research effect planner currently only deals one hit per target. Test reference situations with real move details.
3. **G vs standard damage and effects**, including Soul neighbors and source-grounded power scaling rather than always naively multiplying all types by 2 (G source describes "stronger", not universally exact power).
4. **Natural Soul growth on attacks/techniques and Poke PvP effects**, especially repeated charge-spam competitive techniques: still not fully sourced.
5. **No-motion Soultimate, opponent presentation delays/counter timing and wheel interactions** in real PvP: not yet source-verified as an integrated default.
6. **School older iPad Safari real touch/render, Google Sites DIRECT code paste, real Firebase production rules**: not tested/deployed.

## Reporting standard
Distinguish **playable study implementation** vs **original-rule proven**. 381 passing tests indicate deterministic implementation, not original-game numerical equivalence. Never say the full battle system is already faithfully reproduced. Continue verifying individual moves before spending more time on new effects or game UI improvements.
