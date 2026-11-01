# Phase 4: four touch charge challenges and interruption — 2026-10-23

**Research implementation only.** Branch: `feat/phase1-action-circle-lab-20261023`. Neither `main` nor the school Google Sites version was modified.

## Source hierarchy and fidelity

**Supported by multiple YW2 sources:**

- Four **random** Soultimate charge challenges: *Spin (まわせ)*, *Tap yellow orb (打て)*, *Trace the displayed glyph three times (なぞれ)*, *Drag clock hand to the highlighted number three times (あわせろ)*.
  - https://game8.jp/youkai-watch2/504498
  - https://gamepedia.jp/youkai-yw2/archives/1482
  - https://game8.jp/youkai-watch2/505163
- Each successful normal Soultimate requires caster's full Soul, or G-tech requires the same full gauge on the caster and both **fixed-ring neighbors**, including benched neighbors (see `PHASE4_SOUL_QA_20261023.md`).
- During Soultimate charge, incoming hits can interrupt. For each hit:
  `chance% = min(100, base[hitsAlreadyTaken] + 10 × damage / maxHP + moveInterruptBonus + (critical ? 10 : 0))`, with bases 8%, 12%, 18%, 35% for hits 0,1,2,3+.
  - https://mtwildwood.net/soultimate-charge.php
  - https://toragame.com/youkai2/kihon/battle.php
- Competitive trick: charge completion overlaps other battle animations, allowing a low-visible-motion/“ノーモーション” special. The exact scheduling is **not** reproduced yet.
  - https://note.com/tombow_yw/n/n1e4cf179d2d9

**Unverified research fixture values — not faithful YW2 internals:**

- Spin: two complete rotations; Tap: six orbs; Trace: choose one prototype shape and repeat it three times; Align: three clock targets. Coordinate tolerance and stroke geometry are prototype, not a reverse-engineered 3DS input detector.
- Type selection is deterministic uniform over four types for reproducible test seeds. Original game's distribution weights are not known.
- Base attack interrupt bonus is currently 0: specific attacks/skills may add a bonus.
- Pending caster's automatic normal actions are suspended while charging and restored on cancel/complete, using a fresh normal wait. Precise wait phase and animation overlap remain **provisional**.
- Charge interruption cancels the pending operation without deducting Soul. This resource behavior needs cross-check against actual game footage.
- No real special attack, heal, buff effect, charge animation timing, touchscreen finger-drag tuning or PvP synchronization yet.

## Implemented

- `engine/charge-input.mjs`: pure seeded four-mode gesture state machine in normalized touch coordinates (0..1), deterministic trial choice, incremental progress, continuous trace/rotation validation, clock drag and release; replay-safe complete state and input validation. Nearby numeric seeds mixed before first draw to remove initial xorshift selection bias.
- `engine/combat.mjs`: guided charging API `beginGuidedCharge()`, `chargeInput()`, `cancelGuidedCharge()`; correct Soul consumption only after successful guided completion; cancellation on wheel rotation/mode changes, and pending caster excluded from regular action scheduling (test hypothesis). On attack damage to a charging caster, apply the sourced hit-interruption chance and cancel on success or KO. Log `action.interruption`.
- `engine/soul.mjs`: exported pure, testable `chargeInterruptChance()`.
- `lab/phase2.html`: responsive on-screen SVG charge overlay, browser Pointer Events and captured pointer ID, four visual challenges, hint/progress bar/cancel. There is a lab-only `戦闘を1行動進める` control to reproduce interruption during charge. Charge step does **not** automatically run at real-game time intervals yet.
- No original game art, textures or sound were copied.

## Quality assurance

- `tests/charge-input.test.mjs`: 8 pure-gesture tests for all 4 modes, seeded selection, tap miss, spin jump rejection, trace continuity, clock drag/three repetitions, defensive snapshots.
- `tests/combat-charge.test.mjs`: 7 integrated tests for all four touch modes ending in correct normal/G Soul spending, cancellation/rotation, no early spend and replay safety.
- `tests/charge-interrupt.test.mjs`: 5 hit probability and battle interaction tests.
- GitHub Actions unit suite: **91 / 91 PASS**, **0 failed** at commit `c8b642b0db74ecdea37532035d4a6831f5a2a8af`, run:
  https://github.com/8mahi8/yokai-battle-lab/actions/runs/39873480930
- Same CI checks branch HTML/ESM in **real Chromium** (not a mock). First smoke checks rendered two teams, forecast, Soul and charge controls. Second same-origin iframe smoke actually clicks buttons: Soul increment x4, charge open/cancel, sleep, wheel rotate, bench purification, and G-mode charge preparation. Both pass. Browser startup can flake in hosted runners; two isolated-profile attempts prevent a transient startup from spuriously failing the build.
- Tests **do not yet physically drag a pointer through each SVG** on real Safari; those four modes are tested as source-level input events and via engine integration, not by actual iPad fingers.

## Next engineering gates

1. Visual QA and touch feel on Safari iPad landscape, especially position thresholds and single-finger pointer capture.
2. Connect exact *per-move Soultimate effects* (attack, healing, buff/debuff), Soul rank/capacity and natural accumulation, cross-check damage and status rules.
3. Correct animation/event queue ordering for charge finishing during another move, interrupts, “no-motion” tactics, counter specials and responsive wheel.
4. Validate true Poke input/rewards and timing, release finished special in PvP only with server-side arbitration. Do not expose a user-callable raw `resolveSoultimate` as an authority in online code.
5. Online sync + latency and direct-copy self-contained Google Sites HTML. School hardware test remains pending.

All changes are on the development branch. No cost-incurring providers, migrations, or production state changes.
