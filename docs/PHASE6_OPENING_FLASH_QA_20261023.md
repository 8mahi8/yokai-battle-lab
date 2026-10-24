# Phase 6 — Matching-time front action rights and one-use Flash Soul

**Date:** 2026-10-23
**Branch:** `feat/phase1-action-circle-lab-20261023`
**Result:** Research-only Flash/matching-front comparison module, tested in the actual branch. Neither the school Google Sites code nor `main` was changed.

## 1. Evidence and confidence tiers

### Higher-confidence qualitative descriptions

1. The original registered front at matchmaking (rather than the wheel shown later before the fight starts) can matter for the initial action advantage. That advantage is described as weaker than an ordinary action opportunity newly earned while fighting:
   - https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c (マグロ, 2024, "初期前衛行動権")
   - https://note.com/ricosama0726/n/n14710bbe446c (RC, 2025 experimental protocol "優先行動権について実験")
2. Initial wait is a seeded random number bounded by speed, while ordinary post-action wait and rotating-in wait are determined from speed and the action wait multiplier (mostly 3 in Yo-kai Watch 2):
   - https://www.mtwildwood.net/turn-order.php (101Leafy's YW2/YW3 table; NOT YW1)
3. Flash Soul grants a **one-time first-move opportunity**:
   - https://toragame.com/youkai2/kihon/rare.php
   - https://youkai-gh.g-takumi.com/kon64.html
4. Advanced player descriptions characterize Flash as **replacing the unit due to act next**, rather than a persistent speed boost. Returning the holder to the bench without a real action can leave the special unused and supports the `無限閃光` competitive technique (which itself may suppress the next ordinary action). This *non-action* abuse case requires a separate model:
   - https://note.com/uzoumzou_nanoha/n/n2fb6ae41559c
5. The original-front bias is reported as a random action-point advantage with uncertain coefficient. Another advanced guide says Flash subtracts the Flash user's current action points from others, suggesting Flash changes the shared action-time schedule, not only who the selector chooses:
   - https://note.com/tombow_yw/n/n1e4cf179d2d9
   - https://note.com/ricosama0726/n/n14710bbe446c

### Crucial UNSOURCED implementation details (explicit hypotheses)

- We do **not** know the exact amount or persistence of original-front points after a prebattle wheel swap, nor how it interacts with previously earned ordinary rights.
- We do **not** know the exact debt treatment of the unit whose action is replaced by Flash, nor Flash actor point subtraction. The prototype exposes `skippedTurnPolicy:'consume'|'preserve'` to compare those alternatives. Neither is claimed as verified by gameplay.
- When two Flash holders are simultaneously eligible, the research prototype sorts by remaining wait and then visible-front order. Actual game tiebreaks and Flash ability flags are not definitively established.
- `matchingCreditMode:'initial-wait'` uses the published *speed-derived sampled initial wait* as a possible **research interpretation** for matching-time original members re-entering BEFORE the first automated action. This does **not** assert that the 3DS engine uses the same sampled wait for that return.
- `matchingCreditMode:'metadata-only'` avoids assigning any new priority numeric mechanism while preserving matching-time original identities. This mode is the default for feature experiments.
- A 2026 community reverse-engineering article proposes concrete assembly addresses for the Flash once-only flag and comparator (https://note.com/isakaakasi/n/nf0b8cd7f79fb), but claims needing replication/consistency checks with the observed infinite-Flash behavior are **not treated as verified internal mechanics** here.

## 2. Actual code

### `engine/opening-priority.mjs`

- Holds exactly three **match-registered original-front IDs per side**, separately from the visible ring.
- Holds Flash-ready flag per user; flag persists while benched and is consumed on its actual Flash action, never on a mere rotation.
- `choose({frontIds,waits,scheduledId})` chooses a ready Flash holder, otherwise the next actor from the existing debt scheduler, returning `skippedId`, `consumedFlash`, `registeredFront`, confidence and source tag. This is read-only.
- `commit()` changes right ownership after an actual scheduled action. `fork()` is independent for side-effect-free five-action forecast.
- `visibleStartOffsets:[a,b]` records different prebattle wheel offsets and `matchingCreditMode` separately.
- Validates ID membership, unique flags, offset 0..5, and explicit speculative skip policies.

### `engine/phase1.mjs`

- `createBattle({openingPriorityResearch:{...}})` is the **only opt-in**; default `createBattle()` remains unchanged.
- Flash can override a due actor on a real `step()` and marks the replaced actor, one-time consumption and hypothesis confidence. The default experimental skip variant advances ordinary actor's wait as though its slot were spent; the alternative retains its due wait.
- `predict(5)` uses a forked rights model and agrees with actual seeded steps. A preview never consumes the original right.
- Match-registered IDs are kept separate from the current visible wheel. Initial visible ring can begin at any valid offset.
- `matchingCreditMode:'initial-wait'` samples each registered initial member's speed-based initial-wait range, but grants it on re-entry **only before any automated action**. Afterwards standard rotated-in wait applies. No permanent fictional priority buff is introduced.
- The matching metadata/credit does NOT yet model the stronger, source-reported case where the original-front advantage may still matter after other units have already acted. This is the next research gate.

### `engine/combat.mjs`

- `researchOpeningPriority` is optional and passed directly to the seeded scheduler. If enabled, combat action events include `priorityKind`, replaced actor, one-use flag, and `priorityConfidence:'research-fixture'`.
- Rental six-unit lineup is otherwise unchanged; no Flash is given to every default character. The existing Soul, charge, Poke, status, KO and wheel counter branches continue to work.

### `lab/phase1.html`

The independent scheduler research page now offers:
- **閃光研究 ON/OFF**
- **B6を前衛へ** (Flash is on the B6 research fixture)
- **マッチング前衛変更**
- **開始時サークル：標準/半回転**
- **初期待ち仮説：ON/OFF**
- **割込先の待ち：消費/保持**
- Next five actor forecast with a visible Flash indicator, status of remaining one-use flag, registered original-front units and detailed action log.

All toggles that change a hypothesis reset the seeded test battle so differences are reproducible.

## 3. Test results

- New `tests/opening-priority.test.mjs`: 7 tests.
- New `tests/phase1-opening-flash.test.mjs`: 8 tests.
- New `tests/combat-opening-flash.test.mjs`: 6 tests.
- New `tests/opening-priority-ui.test.mjs`: 2 tests.
- New `tests/opening-match-offset.test.mjs`: 6 tests.
- The unchanged earlier suites covering Soul, Soultimates, interruption, double-turn, three-plus-turn uncertainty, and counter timing remain in CI.
- GitHub Actions **222/222 Node unit tests passed**, 0 failed or skipped, with actual Chromium HTML/ES module load. Chromium interaction tested the Flash toggle, deploying B6, one-use action interception, reset, matching-original-front switch, visible-start-half-turn, alternate initial wait and skipped-turn policy. The existing battle-page synthetic-pointer counter and two-vs-three wheel QA also passed.
- Verified run after the code/test changes:
  https://github.com/8mahi8/yokai-battle-lab/actions/runs/39929586534
- Browser test is desktop Chromium, not Safari on a real school iPad. It cannot prove original 3DS fidelity.

## 4. Original-game comparison matrix for future work

| Case | Matching front | Visible start front | Flash-equipped front | Expected from sources | Unknown |
|---|---|---|---|---|---|
| 1 | A1–3 | A1–3 | None | Sampled speed first wait | Exact RNG algorithm |
| 2 | A1–3 | A4–6 | None | Original registration can retain an advantage | How many points and when |
| 3 | A1–3 | A1–3 | B6 enters | Flash B6 replaces next planned actor | Exact point-shift |
| 4 | A1–3 | A1–3 | B6 enters, exits before action | Flash remains unused | Does skipped action disappear immediately |
| 5 | A1–3 | A1–3 | Two ready Flash holders | Both are priority candidates | Relative tie comparator |
| 6 | A1–3 | A4–6, then A1–3 | Flash users act first | Initial-front right may be consumed along with Flash | Simultaneous credits / later eligibility |
| 7 | A1–3 | A4–6, then A1–3 | Flash holder briefly exposed and re-benched | Infinite Flash technique can skip an action without consuming the effect | Exact frame/event mechanics |

**Do not replace the default scheduler with this model until original-side tests corroborate point shifting and original-front persistence.** The model is useful for isolating and comparing hypotheses, not for certifying balance.

## 5. Production guardrails

- `main`, the user's published Google Sites direct-embed HTML and live Firebase remain unchanged.
- No paid service, new backend, external account sharing, or unauthorized deployment.
- Still missing original move tables, true Flash input timing, initial-right ordering after swaps, online transport, single-file Sites HTML, and school Safari compatibility.
- Next recommended step: **compare the Flash actor's wait shift with the actual game's action-point behavior**, and study the infinite-Flash rotation event *without* turning its alleged glitch into a universal rule prematurely.
