# Phase 20A — Audit-first integration of prior combat research into the actual match host
Date: 2026-10-24 JST
Branch: `feat/phase1-action-circle-lab-20261023`

## Authority: user's corrected original-reproduction-first development plan
The user explicitly demanded re-reading **all prior repository research**, not writing another handoff or recreating already-implemented mechanics. After the full Phase1–19 review, the user delegated Phase20 work: integrate existing source-grounded research into the regular deterministic online 1v1 before inventing enhancements.

## Source verification / conflicting evidence
- [Mt. Wildwood YW2 damage](https://mtwildwood.net/damage.php?g=yw2) — physical and technique **per-hit** normal/critical formulas, elemental technique multiplier, critical-defense, damage spread, guarding, hit counts. The rendered indexed [damage table](https://www.mtwildwood.net/damage.php?g=yw1) has an explicit YW2 section. Phase10's `calculateOneHit` already correctly incorporates **the full defense deduction PER hit** and divides attacking Strength/Spirit contribution by the number of hits (the Phase9 bug had been fixed long ago).
- [Mt. Wildwood battle sequence](https://mtwildwood.net/battle.php?g=yw2) — action wait, attack/technique hit + critical, damage, guard, Soul and interruption sequence.
- [Mt. Wildwood critical rules](https://mtwildwood.net/critical-hits.php) — critical is a separate calculation with critical defense, not simply universal ×1.5.
- [2026 independent 3DS numeric study](https://note.com/atoato429429429/n/nfefe8749d432) — measured damages have ~10% variance and slightly different technique/critical inferred coefficients. These formulas are *competing research evidence*, not proof of byte-exact YW2 original RNG or rounding. **Do not silently claim numeric parity.**
- Existing prior studies: [Phase9](./PHASE9_BASIC_DAMAGE_ACCURACY_QA_20261023.md), [Phase10](./PHASE10_MULTI_HIT_INSPIRIT_HEAL_20261023.md); these already implemented `damage-model.mjs`, `hit-model.mjs`, `combat.mjs` optional per-hit resolves and seeded tests. **No rewrite of those source-grounded modules.**

## Implemented
1. **`engine/match-protocol.mjs`**: canonical two-seat host now opts in to `researchDamageModel:true`, `researchMultiHit:true`, in addition to the existing `researchSpecialEffects:true` and `researchSoulRecoveryMode:'owner-nonattack'`. This is the actual default used by both offline original-engine research UI and the Firebase host bridge. Pure `createCombat()` legacy defaults intentionally remain backward-compatible for independent old tests.
2. **`tests/match-phase20-integration.test.mjs`**: real host enters normal auto turns and verifies damageResearch and per-hit ledger; custom rental A1 has 3 physical hits vs guard enemies and a legitimate Pin set by `match.dispatch`, tests HP, three planned hits, every hit record, critical/hit counts, one-sided authority, exact-sequence retry and reproducible full match journal. Explicit `researchDamageModel:false,researchMultiHit:false` remains a controlled older-model comparison. Rejected invalid dependent flags. Tests a 120-step episode and the existing Firebase room **128 KiB** UTF-8 snapshot envelope.
3. **Fix found during Phase1–19 original-source audit**: `ui/match-stage.mjs` had two exact duplicate `mb-special-flare` and `mb-special-title` IDs. Removed the extra, and `tools/stage-smoke.mjs` now asserts exactly one of each in a real Chromium page. This was a real hidden bug notwithstanding prior passing tests.
4. Existing **Phase10 multiple-hit** system only becomes multiple hits when a roster entry explicitly declares `attackHits>1` or `techniqueHits>1`. Default six *original* rental creatures presently set no such property, so their regular attacks still each perform **one** hit. Do not misrepresent enabling the processing path as adding a real triple-hit character to the school rental lineup without separately researching and deciding the roster.
5. No `main` merge, Google Sites publishing, real Firebase RTDB configuration, authentication setting, paid service, or actual school device access.

## Deliberately still OFF / incomplete
- `researchTurnInspirits:false`: while stat stages/inspirit categories were previously studied, the global 5%-per-level negative HP-loss/regen netting and on-turn KO rules are **not fully verified** and must not be enabled by flipping every research option.
- `researchHealingVariance:false`: ±10% variation is supported but the original base healing equation is unverified. The more detailed damage model routes heals through `calculateHeal` while preserving the explicit `unverified-base-healing-fixture` label.
- `researchOpeningPriority:null`: Flash Soul stays OFF for launch.
- The `engine/special-effects.mjs` resolver remains **independent one-hit original-character Soultimate fixture**. Phase10 regular attack multi-hits do not magically implement each original Soultimate's multiple hits or special statuses. This requires separate real-move research.
- `researchCounterTiming:false`, `researchWheelCoalescing:false`: Phase5 no-motion and counter models are experimental, not integrated gameplay.
- Exact natural Soul gain on damage-dealing attacks, original action scheduling/ties/wheel cooldown, Poison/Inspirit exact expiry, accuracy/crit special skills and real-school Safari remain source-validation work.

## Acceptance and CI evidence
- [Source-audited host + 3-hit tests, 384 Node PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099557567).
- [Matching true Chromium stage after enabling flags](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099557554), passed.
- [Two-real-Chromium Firebase Auth+RTDB *local emulator* test after duplicate-ID fix](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40099646469), passed; **not real Internet cloud or old iPad**.
- A subsequent source-head CI with an extra 128-KiB snapshot regression test also needs its own success; do not call it green until verified.

## Recommended next Phase 20B (not yet implemented)
Do not start with another damage model. Verify **specific existing Inspirits / healing phase** against original data and isolate source-supported effects from provisional HP-loss scaling before integrating. Second, study actual original move-hit counts, arrange 6 symmetric rental moves with explicit fixture origin only if needed and agreed. Then research original turn/wheel timing and no-motion mechanics from the existing Phase5 experiments. Keep original screen layout and no player-side five-turn forecast.
