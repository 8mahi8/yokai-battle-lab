# Phase 7 — Initial-rental combat priority: Watch Zero Poke

**Date:** 2026-10-23
**Development branch:** `feat/phase1-action-circle-lab-20261023`
**Milestone:** Turn development priority back from optional Flash Soul research to the INITIAL identical-rental-six combat basics.
**Release status:** Not ready for school iPad online / Google Sites. No changes to `main`, current published HTML, or Firebase.

## Scope decision

- **INITIAL VERSION: NO FLASH SOUL.** The separately committed Phase 6 Flash Soul model remains isolated behind the default-OFF `researchOpeningPriority:null` flag. It is not loaded in `lab/phase2.html`. This is deliberate, aligned with the user's earlier agreement.
- High priority: manual player actions around automatic character combat: rotate, Pin/Zero Poke, bench purification, Soul/Soultimate/G, stable original-like turn order, and competitive 1v1.
- Choose one important currently absent initial mechanic to finish before adding more optional competitive glitches: **Watch Zero Poke**.

## Research and source hierarchy

**Primary authoritative source:** Official English Nintendo Yo-kai Watch 2 user manual (Model Zero Command: Poke):
https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-Yo-Kai_Watch_2_Fleshy_Souls

From the manual:
- In Watch Zero, the ordinary Target/Pin command changes to Poke.
- Pick an **enemy Loafing or Inspirited**, then **repeatedly poke** to fill a gauge.
- On success, a reward can include **draining their Soul Meter**, additional money, or higher befriending odds. Not every successful Poke must grant Soul; the resulting selection/outcome is not established by the manual.

Additional:
- https://gamepedia.jp/youkai-yw2/archives/1873 (Zero mode, eligibility, gauge, absorption)
- https://game8.jp/youkai-watch2/504889 (Poke benefits)
- https://youkai-gh.g-takumi.com/sp/bbs_detail.php?bbs_id=29926 (community report: a successful poke is once per enemy, with benefits including damage, Soul, coins, befriending; unverified precise restrictions)
- https://note.com/tombow_yw/n/n1e4cf179d2d9 (competitive Soul recovery tactics)

**What has NOT been authenticated for original YW2:**
- Required taps per target, duration and cancel window, geometry and position/number of weak points.
- PvP-compatible reward weights, whether/which recipient gains drained Soul, how much, Soul ownership cap and exact timing.
- Whether loaf vulnerability lasts until an actor's next turn, or only the current loaf animation; currently a testable hypothesis.
- Whether one Poke attempt or only one successful Poke is allowed on a target; current initial research model chooses **one SUCCESSFUL** Poke.
- Whether special targets, bosses, immunity or real UI latency require additional restrictions.

## Implemented this turn

### New: `engine/poke-input.mjs`
- Pure normalized-coordinates 0..1 touch model. Repeated valid taps fill a progress gauge; out-of-circle taps do not advance it.
- Default **12 taps** is an explicit adjustable TEST fixture; not an original-game claim.
- Defensive snapshots; ignored invalid coordinates and rejected unsupported gesture types; finished trials cannot be replayed to gain additional rewards.

### Updated: `engine/combat.mjs`
- Real lab commands `beginPoke(side,targetId)`, `pokeInput(side,{type:'tap',x,y})`, `cancelPoke(side)`.
- Eligibility validates Watch Zero, living enemy on the current front, negative Inspirit or Loafing, and not already successfully poked by that player.
- Only one pending Poke per player side, no conflicting target switches.
- Target rotates away or watch switches to Standard → cancel in-progress Poke, no consumption. Losing vulnerability/target KO before a new input → reject safely.
- Per-enemy, per-side success record blocks repeated rewards.
- A loafing member remains a Poke candidate until their NEXT actor turn, even if another unrelated action occurs; this is deliberately labeled tentative.
- **By default** Poke success records an **unresolved reward** and does not invent numeric Soul gains.
- Optional `researchPokeSoulTransfer:20` in the UI alone: one possible, forced laboratory Soul-transfer outcome, moving **up to 20** gauge points from enemy target to first living front ally (subject to enemy balance and recipient capacity). The quantity and recipient choice are fictional fixture choices, NOT original mechanic claims. No Soul can appear from zero enemy balance, overflow a recipient, or be obtained twice from one target.
- Snapshot contains active Poke, progress, used targets, loaf indicators and explicit reward-fixture amount.
- No paid backend or network calls.

### Updated: `lab/phase2.html`
- In Zero mode, enemy Pin button reads **つつく** and opens touch-responsive overlay with actual pointer-input circle, progress, cancel, win message and Soul count changes.
- The overlay and log plainly mark required hits and forced numeric Soul outcome as research assumptions.
- Existing standard Target/Pin, G-tech charging, wheel counter lab, recovery, attack damage, Soul bars all remain available.
- Phase 6 Flash remains OFF in this battle lab.

## Verified CI and browser QA

- `tests/poke-input.test.mjs`: five gesture/coordinate/completion state-machine tests.
- `tests/combat-poke.test.mjs`: eleven gameplay integration tests including vulnerable enemy, repeated-tap success, one-use reward, no double-spend, both sides, target rotation, Watch mode, bench purify, Loaf vulnerability, Soul conservation/caps and default-off behavior.
- Existing 222 tests of Phase 1–6 stayed passing, including the default non-Flash combat model.
- `tools/browser-smoke.mjs` now performs a real **headless Chromium** synthetic pointer scenario: switch Watch Zero, give enemy B1 50 Soul, apply negative Inspirit, select B1, tap 12 times, observe B1 Soul 50→30 and own A1 Soul 0→20 (LAB ONLY), confirm target used once, then start and cancel Poke on B2.
- Verified GitHub Actions branch commit `a80896cf1ff922d5974cb26203cda5403d5a5135`: **238/238 Node tests PASS** (0 failures/skips), actual branch Chromium DOM + all combat UI scenarios and opening research UI smoke pass.
- Run: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39943107156
- This is desktop Chromium synthetic events, not physical iPad Safari touch, direct Sites embed or 2-player network QA.

## Initial-release backlog (not optional Flash feature creep)

1. **Source-backed Poke result distribution and multiplayer Soul recovery behavior**, then remove hard-coded research-only transfer.
2. **Purification mini-game:** bench-only restriction already exists but completion is instantaneous in the current lab; original requires stylus interaction. Design standalone pure touch challenge and cancellation/timeouts without overspecifying the real values.
3. **Normal attack/technique/inspirit** accurate damage/status formulas, attack Soul gain and anti-status exceptions, calibrated against recorded gameplay.
4. **Turn order**, original action priority, status suppression and move-specific exception tests; Phase 6 Flash/glitch studies remain a later optional lane.
5. Render complete rental battle UI for older Safari iPad without heavy textures or sound, then 2-device PvP authority and **single self-contained Google Sites HTML** delivered as individual files (not a ZIP).
6. No user hardware action until internal readiness; do not claim publishable state because 238 tests pass.

Maintain zero-cost constraint. No changes to `main`, Google Sites production, or Firebase.
