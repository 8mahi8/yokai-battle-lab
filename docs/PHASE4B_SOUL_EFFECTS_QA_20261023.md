# Phase 4b — Soul recovery & original rental special effects
Date: 2026-10-23

## Repository workflow

- Base feature branch was concurrently updated by another operation while this work started. To avoid overwriting those changes, implementation was branched from the then-newest commit `5fee7a3cae3bc1647fa24d274475a2850082fd1d` to a separate isolated branch:
  `feat/phase4-soul-effects-research-20261023`.
- **Neither `main`, the parent feature branch, nor any Google Sites code was updated by this work.**
- Existing published Firebase data and settings were not accessed or changed. No paid resources used.

## Direct findings and their confidence

| Rule | Source | Interpretation |
| ---- | ------ | -------------- |
| YW2 special move has attack, healing and buff classes | [Mt. Wildwood YW2 Soultimates](https://mtwildwood.net/soultimates.php?g=yw2), [Game8 battle guide](https://game8.jp/youkai-watch2/505163) | **Verified as structure**. Source lists different powers/hits/targets/unique effects, not universal final-damage formulas |
| Rank 1/2/3/4 costs 100/150/200/250 Soul | [Mt. Wildwood YW2 Soul charge](https://mtwildwood.net/soultimates.php?g=yw2) | **Source-supported**. Applies to individual Soultimate grade, NOT the character's overall Yo-kai rank. The parent branch already added `soulCapacityForRank()` during concurrent development |
| Non-attack action gives +5 Soul immediately after the acting member's turn | [RC(里恋)'s measured tests](https://note.com/ricosama0726/n/n14710bbe446c) | **Single researcher observation** for a nonattacking unit. Attack, offensive technique, skill, Soul equipment, rank and adjacent regeneration cases need further testing. **Do not generalize to all units per global event** |
| Ordinary one-hit physical and technique damage use power + Strength/Spirit and target Defense | [Mt. Wildwood damage formula](https://mtwildwood.net/damage.php?g=yw2) | **Supported for normal attacks**, but applying the same expression to original Soultimates is unverified. This project uses a flagged **experimental** approximation for original rental specials |
| The G-tech's three-member cost and strengthened effect | [YW2 Zero-mode guide](https://gamepedia.jp/youkai-yw2/archives/1873) | **Verified structurally**. The current `powerMultiplier:2` is applied to *fixture power*, not blindly multiplied to every final HP damage value |

## Implementation

### `engine/soultimate-effects.mjs`

Pure validation and experiment-only helpers:

- `observedNonAttackRecovery(kind)`: default 5 for `heal`, `guard`, `inspirit`, `loaf`; 0 for physical attack or damaging technique.
- `normalizeRentalSpecial(spec)`: validates `{kind:attack|heal,targets:one|all,method,power}`; uses only invented original-rental move profiles, **not copied YW2 character moves**.
- `soultimateBaseHit()`: normal-attack-inspired experimental one-hit damage. Real multi-hit/element/crit/accuracy/special effects are explicitly not claimed.
- `researchSpecialHeal()`: arbitrary working formula `floor(power + spirit/3)` with cap at target HP and a fixture G multiplier; NOT confirmed YW2 healing formula.

### `engine/combat.mjs`

- New flags, both **off by default**: `observedSoulRecovery`, `enableResearchSoultimateEffects`.
- When opt-in: after **the actor's own eligible non-offensive action**, add 5 only to that actor; not to all living units. The older all-team `researchSoulGainPerAction` remains for backward compatibility, but both modes cannot be used together.
- Adds unique experimental attack-all, attack-one, heal-all rental specials to six original characters.
- On valid Soultimate/G-tech completion: consumes the correct Soul gauges through existing `soul.resolve()`; optional effects damage/heal **living front units only**, log individual HP changes, count KO, update target/pins, declare game winner if an entire six-member team is down.
- Preserves old test contract with flags disabled: `effectStatus:'unimplemented'` with no fake damage.
- The new UI explicitly opts into the **experimental effect pipeline** and displays the experimental label; original base gameplay module behavior is unchanged.
- Shared `interruptChargingCaster()` now handles both regular attacks and experimental Soultimate hits; KO cancels a pending charge without burning the target's Soul. We did not introduce an invented special immunity rule or unsourced interrupt bonus.
- `snapshot()` deep-copies the fixture special profiles and nested effect logs to prevent accidental state mutation.
- Accepts optional `soultimateRank:1..4` on rentals, with validated rank-capacity derived from parent branch's `soulCapacityForRank()`; manual `soulCapacity` remains an explicit research override.

### `lab/phase2.html`

- Uses `createCombat({observedSoulRecovery:true, enableResearchSoultimateEffects:true})` only in the research demo.
- Existing normal/G Soul, tap/trace/spin/align touchscreen charge UI remains.
- After successfully completing charge, the HP of front units changes with attack/heal effects, log displays each affected unit and amount and states the formula is provisional.
- Normal non-offensive action logs show `妖気+5` for the actor only.
- The passive Soul gain is **event/actor based**, not a brand-new real-time ATB gauge.

## Quality results

- New `tests/soultimate-effects.test.mjs`: 8 cases covering Soul rank 100–250, non-attack actor-only 5 recovery, attack exclusion, invalid fixtures, damage/guard, healing caps, G spend, defensive copy.
- New `tests/special-interrupt.test.mjs`: 2 cases covering Soultimate hit interruption and nested event snapshot isolation.
- GitHub Actions verified against **the actual isolated GitHub branch**:
  `node --test tests/*.test.mjs` **101/101 PASS**, 0 failures, 0 skipped.
- Chromium actual same-origin browser UI smoke ran successfully: rendered teams/forecast/Soul, clicked refill, started/canceled charge, sleep/rotation/purification, checked G eligibility and completed one special via synthetic PointerEvents, verifying HP effect log and completion UI.
- Verified GitHub Actions: https://github.com/8mahi8/yokai-battle-lab/actions/runs/39913340191

## Remaining problems — NOT RELEASE-READY

1. Real per-move YW2 Soultimate damage/crit/target/elemental/hit tables and heal formulas, action ordering and multi-hit handling need independent checking. **Do not call the current fictional move numbers original.**
2. True rank-based Soul regeneration beyond the single nonattacking case; natural regeneration under animation overlap and Soul-recovery adjacent/skill effects.
3. Soultimate cut-in, animation locks, delayed opponent wheel visualization, no-motion specials and counter interactions need a proper event/visual queue, **not** a faked network lag or timer.
4. Real Poke rewards and touch minigame, automatic special/Pin targeting during real matches, match Sudden Death, enemy skill/status exceptions.
5. Two-browser online 1vs1 consistency, host/guest latency, Safari school iPad landscape QA, and direct **Google Sites code embed** still untested.
6. Original characters' animation and visual quality remain separate acceptance gates.

## Next engineering priority

First establish a small event queue with explicit phase boundaries for charge start, cut-in and effect resolution in offline BOT mode (no unsourced timer). Then research actual move tables and natural Soul rates before hardening the multiplayer simulation. No merge into `main` or Google Sites without human approval.
