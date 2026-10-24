# Phase 20B — Original-inspired stat debuffs isolated from unverified HP-over-time effects
**Date:** 2026-10-24 JST
**Branch:** `feat/phase1-action-circle-lab-20261023`
**Phase position:** architecture section `[engine/combat.mjs]` → `[engine/match-protocol.mjs]`, after Phase20A damage/multihit integration; before Phase21 original numeric/timing research. The latest architecture map is [PROJECT_MAP_AND_PROGRESS](./PROJECT_MAP_AND_PROGRESS.md).

## WHY — reproduce before improving, reuse earlier Phase10 work
Phase10 built an opt-in `researchTurnInspirits` group that bundled original-like **STR/DEF/SPR down** with **HP loss/regen over time**. Its global `5% maxHp × level` negative HP-loss and signed regen-minus-loss netting were explicit guesses. As a result **stat debuffs couldn't be enabled in the real online host without also enabling those conjectural HP effects**. Phase20B separates these existing effects without inventing a new combat model or retuning the six rental characters.

## Primary sources checked again
1. [Mt. Wildwood — YKW2 Inspirits](https://mtwildwood.net/inspirits.php?g=yw2): `STR down`, `DEF down`, `SPR down` are documented move classes with 1–4 levels. Negative Inspirits normally persist until Purify; positive Inspirits typically expire after 30 battle actions, with explicitly owner-turn-counted exceptions. Sources also differentiate `Loses HP each turn` and `Restores HP each turn`, which are **not the same** as stat debuffs.
2. [Mt. Wildwood — YKW2 Stat Changes](https://mtwildwood.net/stat-changes.php?g=yw2): YW2 nonlinear battle stat stages `-8..+8` with -2=×.7 and +2=×1.2, already represented in `engine/damage-model.mjs`. **Caveat:** this does not prove a specific original Yo-kai's Inspirit level corresponds to the same number of stage increments; the invented rental effect level is a research fixture.
3. [Mt. Wildwood — YKW2 Move List](https://mtwildwood.net/yw2/moves): status moves have distinct effect kinds and levels. Avoid extrapolating the positive regen 5% from particular monsters to all negative HP drain skills.
4. [2026 paired original handheld healing study](https://note.com/atoato429429429/n/nfefe8749d432) / [original healing technique categories](https://gamepedia.jp/youkai-yw2/magics/3171): healing variance is a plausible research model but the exact base formula is **not established** by these references. `engine/heal-model.mjs` formula `(power+spirit)/3` remains openly provisional. No new healing arithmetic was introduced this phase.

## WHAT CHANGED — source-backed *kind*, provisional rental *power*
- `engine/combat.mjs` now accepts a separate independent `researchStatInspirits` boolean (requires `researchDamageModel`). Source-shaped `strength-down`, `defense-down`, `spirit-down` are allowed when either stat research or the old full research mode is active; the existing damage-stat-stage path works on actual HP. Normal `sleep` and `strength-up` remain unaffected.
- `engine/combat.mjs` **still rejects `hp-loss` and `hp-regen`** in regular play without explicit `researchTurnInspirits:true`. The corresponding per-actor HP tick function is NOT touched and stays disabled by default.
- `engine/match-protocol.mjs` opts in to `researchStatInspirits:true` for the real 2-seat host. A caller explicitly setting `researchDamageModel:false` gets dependent `researchStatInspirits:false` unless they also explicitly force the contradictory `true` (then the engine rejects it); preserves prior legacy comparison tests.
- `tests/match-phase20b-inspirit.test.mjs` tests a **real host**: A1 casts a DEF-down Inspirit with 0% *fixture* resistance on B1; A2's later pinned physical attack uses `defenseStage:-2` and `defenseMultiplier:.7`. The ledger records a persistent negative effect, HP-over-time does NOT activate, and the full journal replays identically. The other tests ensure the host does not silently change the original six default rental members, heals/Soultimates stay as before, malformed flags fail, and HP tick variants remain locked.
- `tests/match-phase20-integration.test.mjs` initial-options expectation updated for new explicit host contract.
- No changes to `engine/damage-model.mjs`, `engine/turn-inspirit.mjs`, `engine/heal-model.mjs`, battle styling, behavior-specific 2.5D assets, production Firebase, Google Sites, or `main`.

## Verification after correction
- [Research unit and browser lab workflow run 40101561056](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40101561056): **388/388 Node tests PASS** and old research Chromium lab PASS.
- [Original two-screen game Chromium and touch QA run 40101561015](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40101561015): PASS.
- Three integration tests added. Earlier intermediate commits had failed CI because an old explicitly disabled damage model inherited the new flag; fixed backward-compatible defaults and fully retested. Do not hide this regression and recovery.
- Latest prior [two-browser Firebase Auth/RTDB emulator test 40099646469](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099646469) PASS, but was on a previous branch SHA. **Not a Phase20B cloud or device E2E pass.**

## Current limits / next step
- **Do not claim absolute original damage/status parity**: original individual Inspirit levels and per-character resistance are not imported, and mapping of a rental level 2 to stat stage -2 is a source-inspired fixture.
- Positive status 30-action expiry and negative status persistence were *already* in the status ledger and have tests; no rewrite needed.
- Exact `(power+spirit)/3` healing base and **all-negative HP loss=5% per level** remain unverified and are deliberately NOT integrated; these require actual original battle measurements.
- Next: **Phase21 original-rule fidelity validation**: prioritize action order/wheel timing, owner Soul accrual when attacking and specific Soultimate targeting/power before working on cosmetics. Review current phase1/Phase5 studies first. If original handheld samples are unavailable, document unknowns rather than manufacture numbers. User's next action: none, until actual physical iPad testing is needed.
