# Phase 21C-C / 21D-A — Initial-action provenance and Soul-gain evidence gate
Updated 2026-10-25 JST | Only development branch: `feat/phase1-action-circle-lab-20261023`

## Whole-project location
Original Yo-kai Watch 2 sources → Phase21C initial action/rotation evidence → Phase21D Soul accrual → existing Phase4 Soul / Phase7 Poke studies → canonical Phase11/20/21B host later **only if original-game parity is supported**. Phase22/23/24 (original PvP tactics, online reliability, school Safari/Google Sites direct HTML) are still downstream.

## Phase 21C-C: what was and was not learned
Revisited these:
- [Mt. Wildwood YW2/YW3 Turn Order](https://mtwildwood.net/turn-order.php) — indexed initial wait and action weights, rotating-in cost. The original ROM's tie resolution and RNG are not supplied.
- [マグロ「妖怪ウォッチ2対戦の全て」](https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c) describes qualitative sequences involving first-front credit and later-accrued normal rights. A representative described turn progression (ブシニャン → ブシニャン → ふさふさん → 青鬼 → ボー坊, then a rotated lineup) establishes *which may have an accumulated right*. It does NOT supply every participant's effective in-battle Speed, source wait/RNG, initial registered wheel and authoritative timestamps needed to test a numerical first-action classifier. **Do not fabricate a reproducible fixture** from the character names.
- [RC original player experiments](https://note.com/ricosama0726/n/n14710bbe446c) and [たくトンボ PvP write-up](https://note.com/tombow_yw/n/n1e4cf179d2d9) corroborate that initial-front and later-accrued rights require careful distinction, but published text does not resolve same-zero counter precedence.
- Existing [Phase21C-B first-action auditor](../engine/opening-first-action-audit.mjs), [Phase6 opening-credit opt-in](../engine/opening-priority.mjs), and [94-row parity test](../tests/phase21c-order-source-parity.test.mjs) remain reused. **No extra opening-priority engine was created and no original numeric tie rule was guessed.**
- **21C-C blocker:** obtain a controlled 3DS side-by-side/opening trace with 12 effective speeds, registered front and visible front for each player, wheel-change history, first several action identities, skill/Soul flags, and matching observation time. The available qualitative examples are not controlled measurements. Phase21C remains *open for ROM-level parity*, so proceeding to independent research on 21D does not mark it fully reproduced.

## Phase 21D-A: what actual sources say
| Behavior | Support | Consequence |
| --- | --- | --- |
| Non-attack *owner's* action gives +5 Soul after action | [RC observed experimental result](https://note.com/ricosama0726/n/n14710bbe446c); narrow community evidence | Existing `researchSoulRecoveryMode:'owner-nonattack'` in `engine/combat.mjs` is a partial study, **not** full Soul reproduction |
| Attack / damaging technique Soul gain | RC explicitly reserves attack-case study; [たくトンボ](https://note.com/tombow_yw/n/n1e4cf179d2d9) distinguishes many rate classes and situational variation | No single sourced numeric constant. Keep current standard host behavior unchanged, **do not call 0 true YW2 gain** |
| Natural recovery / Soul equipment | [Game8 YW2 mechanics](https://game8.jp/youkai-watch2/504498) and [たくトンボ](https://note.com/tombow_yw/n/n1e4cf179d2d9) describe automatic and skill/equipment variations | Isolate player observations from possible passive/equipment/adjacency influences |
| Zero Watch Poke | [YKW2 battle description](https://gamepedia.jp/youkai-yw2/archives/1482) and [manual referenced by Phase7](../engine/poke-input.mjs) support Soul absorption as *one* reward | Outcome, recipient, amount and frequency **unverified**. Existing `researchPokeSoulTransfer` remains lab-only, default 0 |
| Soultimate charge cost | [Mt. Wildwood Soultimate Charge](https://mtwildwood.net/soultimate-charge.php) reports charge ranks 1–4 with 100/150/200/250 points | Already present in `engine/soul.mjs`, **do not reimplement**. Original rental move-specific capacity and levels may still be provisional |

## Work implemented (independent research, NO default gameplay modifications)
Added `engine/phase21d-soul-observation.mjs` pure function `auditSoulGaugeChange`. Inputs: `gaugeOwnerId`, `actorId`, `actionKind`, `before`, `after`, `capacity`, `noOtherSoulSourcesConfirmed`.
- Always reports observed Soul delta and confidence `community-experiment-not-ROM`.
- **Only** when a record explicitly excludes outside sources, Soul belongs to the acting unit, and action is non-attacking (guard, Inspirit, heal, loaf), compare `after` to `min(capacity,before+5)`. Matching means `consistent-with-research`, **never "YW2 verified"**.
- Unknown confounders, another actor's Soul, attack/technique, Poke, switch, Soultimate return `indeterminate` with reasons. Does not create imaginary +5, 0, or Soul-transfer rules.
- Strict integer gauge/range/identity/mode validation. No network calls, state change or connection with `createMatchProtocol`.
- `tests/phase21d-soul-observation.test.mjs` adds 9 tests for +5 saturation and discrepancies, all four research nonattacking paths, unknown attack/Poke, confounder/owner caution, invalid inputs, and **actual host** step on forced guard vs forced attack with replay. Host attack showing 0 Soul is labeled **not verified original** by the diagnostic. All existing tests retained.

## Verification and explicit remaining work
- [Research CI including browser smoke, run 40109349907](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40109349907): **417 / 417 Node passed**, Chromium smoke passed.
- [Stage CI run 40109349911](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40109349911): stage/pointer QA; check final status in Actions.
- [2-browser Firebase Auth/RTDB local emulator after research module addition, run 40109310363](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40109310363): passed. *Local emulator only*, not cloud, iPad or Google Sites.
- **Next Phase21D-B:** source-specific observation data for attack/technique, gauge-rates by move/level and natural time recovery. Cross-check actual gauge changes under controlled conditions. **Next Phase21D-C:** verified Zero Poke recipient/amount and repeatability under real 3DS observation. Only when a rule has original evidence + engine integration + browser/2-seat QA should it be enabled as an original-style online default.
- **Still untested:** controlled 3DS parity, original turn ties, Soul rates on attack/Poke, physical school old-iPad Safari, direct HTML code embed, live Firebase.
- **Boundaries:** initial identical six original rental characters; Flash Soul OFF. No extra UI, currency, features, charges, production changes. Only `feat/phase1-action-circle-lab-20261023` changed. User action is **not yet necessary**.
