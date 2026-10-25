# Phase28 | Full-match gate and next plan | 2026-10-26

## Release freeze
- School friend-playtest build: keep the already-shared **Phase27 Google Drive HTML/TXT** unchanged. GitHub development branch continues separately. No automatic replacement of live Google Sites, main, Supabase schema or other games.
- The user prioritizes a complete **playable match** over exact Soul values, exact original characters, ranking, replay, reload recovery, or extensive security infrastructure. Keep provisional numbers and existing original-inspired rental six.

## This turn: actual full-match regression
- New tests in tests/full-match-playtest-gate.test.mjs run the canonical authoritative createMatchProtocol from initial state to all-six KO and winner on *both* sides. A winning, B winning, and voluntary loser-wheel input with realistic host timestamp are each covered.
- Tests validate living reserve replacement, advancing actions, HP/Soul limits, finish/stop result, matching winner in both makeStageView seats and deterministic full match journal replay.
- The dedicated QA rosters have artificially boosted damage to keep tests short. This is not a pass for the normal roster's balance or an actual network-to-death test.

## Actual blocking bug discovered and fixed
- Prior combat.ensureFront() attempted the required replacement of KO front by calling clock.rotate(side, 1, 0). The three-second voluntary wheel cooldown then blocked later required replacements, with the match indefinitely returning awaiting_rotation. All three new tests reproduced this **before** the fix.
- Added an internal automaticKo option to engine/phase1.mjs rotate(). Only the forced replacement path in engine/combat.mjs uses it. A forced replacement does **not** consume or reset the player's existing wheel cooldown; regular player commands still obey the original three-second restriction.
- After the fix all three completion tests passed, plus a fourth regression that explicitly checks the voluntary three-second clock remains intact.
- [Node 533/533 PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207418914).
- [Chrome stage and real PointerEvents PASS](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207418956).
- [Configured Supabase Sites build PASS, ~178 KB](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207316875).
- Old school Phase27 build predates this fix! It **may still pause in the later match when multiple forced reserve substitutions occur**. The user's explicit freeze decision remains; tell the user about this risk rather than silently replacing their school file.

## Cloud integration test correction
- First real Supabase two-iframe smoke after the change failed at a test assumption that the second wheel command must always occur during its three-second cooldown. Under cloud CI latency the command can legally arrive after three seconds, and therefore be accepted. Failure run: https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207316845.
- Updated tools/supabase-sites-browser-smoke.mjs to assert second ACK at **both** seats, then require either rejection with unchanged front or successful rotation with identical host/guest front. The exact cooldown boundary remains checked by deterministic Node tests.
- Rerun E2E: https://github.com/8mahi8/yokai-battle-lab/actions/runs/40207566828 (verify result before claiming success).

## Prioritized upcoming work
1. Phase28-B: *real Supabase two-iframe full-match-to-winner* with host auto tick, multiple reserve swaps, both seats matching winner and auto stop. The Node completion test is NOT equivalent.
2. Phase29: clear victory/defeat presentation and simple finished-match controls rather than a repeating blocking alert.
3. Phase30: finish important special/Poke effect categories, reusing existing combat, status and Soul systems. Attack / heal / buff / debuff exist; absorb, revive, mixed status attack, multiple Poke outcomes are not yet all playable. Values may remain provisional.
4. Phase31: selectively integrate original high-level PvP techniques (no-motion charge/counter etc.) from existing Phase5/22 studies, with playtest-specific approximations where original details are unknown.
5. Phase32: adapt to real school iPad Safari and Google Sites direct embed feedback; fix any severe freezing, sync or touch usability immediately.

Do NOT implement reload-after-close match restoration, Flash Soul in initial lineup, ranking, character development, replay, or exact Nintendo character likeness. Focus on short and enjoyable 1vs1 among friends.
