# Phase 4 — Soul / Soultimate / Watch Zero research QA
Date: 2026-10-23
Branch: `feat/phase1-action-circle-lab-20261023`
Status: **research prototype; not playable faithful Soul moves**

## Verified broad YW2 behaviors and supporting sources

1. Soultimate becomes usable when the owner's Soul meter fills. There is a 3DS touch charge mini-game before the special takes effect. Multiple charge gesture types exist.
   - https://game8.jp/youkai-watch2/504498
   - https://gamepedia.jp/youkai-yw2/archives/1446
2. Standard Watch and Watch Zero can toggle. Zero replaces normal Soultimate and Pin commands with **G-tech** and **Poke**.
   - https://gamepedia.jp/youkai-yw2/archives/1873
   - https://toragame.com/youkai2/kihon/battle.php
3. G-tech requires a **FULL gauge on the active caster and both immediate neighbors in the fixed six-member wheel**, even if a neighbor is currently on the backline. All three gauges are consumed. The described ordinary power improvement is **2×**, but this does **not** establish a universal way to double final inflicted damage; some specials have additional changes.
   - https://gamepedia.jp/youkai-yw2/archives/1873
   - https://game8.jp/youkai-watch2/504889
4. Poke becomes selectable against vulnerable enemies such as loafing or negative Inspirits in Zero mode. Poking can restore Soul and can have other outcomes. Exact success mini-game and multiplayer reward distribution are **not yet confirmed**.
   - https://game8.jp/youkai-watch2/504889
   - https://toragame.com/youkai2/kihon/battle.php
5. Soul accumulates naturally; rank, skill, Soul equipment, and actions can change accumulation. A community investigator experimentally reported **5 gauge units per turn without attacking**, but its exact unit definition and across-field scheduling must be rechecked before adoption as a universal engine rule.
   - https://note.com/ricosama0726/n/n14710bbe446c
   - https://note.com/tombow_yw/n/n1e4cf179d2d9
   - https://game8.jp/youkai-watch2/504498

## Implemented

### `engine/soul.mjs`

- Two ordered six-unit rosters and independent member Soul meters with explicitly configurable max Soul. **100 max in the default rental fixture is deliberately fictional.**
- Distinct per-side Standard/Zero Watch modes.
- Strongly validated front and wheel adjacency; G-tech checks both fixed-ring neighbors, including backline neighbors; normal Soultimate checks only caster.
- Two-stage `prepare()` and `resolve(success)` with pending unique tokens. No spending before resolution; failed/cancelled charge leaves meters intact; spent charge cannot replay. Rotation and mode switching cannot incorrectly spend a stale charge.
- Poke eligibility only for opponent front targets vulnerable via negative Inspirit or loafing; **returns only eligibility, not a made-up reward**.
- No automatic Soul regeneration in core module.

### `engine/combat.mjs`

- Soul state added to immutable battle snapshots, supports per-rental `soulCapacity`.
- API: `setWatchMode(side,mode)`, `giveSoul(id,amount)` (explicit debug/test injection), `prepareSoultimate(side,id)`, `resolveSoultimate(side,token,success)`, `pokeEligibility(side,id)`.
- Pin is cleared and unavailable in Zero mode; standard mode recovers Pin.
- `researchSoulGainPerAction` is **OFF by default (0)** and may optionally add an explicit fixture amount to every living unit per simulated event. **NOT a claim about YW2 natural Soul rules.**
- A resolved special **consumes the correct gauges** but explicitly returns `effectStatus:'unimplemented'`. There is **no Soultimate damage/heal/buff or charge gesture action yet**.

### `lab/phase2.html`

- Research UI now includes visible Soul bars for front units, rear-unit Soul amounts, debug `妖気+25`, separate modes for both sides, charge start/finish/cancel controls, and Poke eligibility indicator.
- The research UI deliberately says manual increments and move outcomes are fictional/unimplemented.
- Inline browser JS syntax and required control handlers are checked in CI. This is NOT a visual-review or iPad Safari claim.
- A separate local reference prototype existed during development; GitHub branch content is authoritative.

## QA

- Local isolated `node --test` on `engine/soul.mjs`: **13/13** passed. Also locally checked standalone integration-contract tests.
- GitHub Actions on the actual repository branch, `node --test tests/*.test.mjs`: **71/71 passed**, **0 failed**, **0 skipped**, on commit `262b52319495b3b2f70fdabff496f7977e9d1c9`.
- GitHub Actions run: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39871087337
- The checked branch has `engine/soul.mjs`, `tests/soul.test.mjs` (13), `tests/combat-soul.test.mjs` (8) and `tests/ui-source.test.mjs` (3).
- The tests verify fixed-wheel backline neighbor G cost, regular special cost, mode gating, pin/poke mutual exclusion, charge cancel, rotation invalidation, replay prevention, Soul cap, and integration with simulator.

## BLOCKERS for release

1. Precise per-rank/per-move max Soul and natural gain; action and enemy contact modifications; adjacent Soul equipment; poke gain.
2. Real Soultimate charge mini-games + animation, interrupts, action-wait, targeted damage, healing, buff, exceptions; G-tech full actual outcomes.
3. Real Zero poke gesture/outcomes, loaf/inspirit timing windows, tactical poke regeneration tactics.
4. Source-verified status/AI and end-game Sudden Death; no arbitrary formulas.
5. Rendering and interaction tested on a real browser from the GitHub branch, Safari/iPad, then two-client PvP and actual Google Sites direct-code embedding.
6. Review third-party artwork pipeline before replacing original placeholder characters.

Keep `main`, Google Sites published version, existing Firebase production settings and any paid services untouched.
