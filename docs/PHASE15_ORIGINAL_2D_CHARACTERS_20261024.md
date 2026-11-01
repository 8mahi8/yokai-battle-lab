# Phase 15A — Six original 2D vector familiars in canonical stage
2026-10-24 JST

## User direction
The user delegated the character art direction and explicitly does not require pixel art.
Their stated priority is fun, readable school-iPad Safari 1v1 and **visual/gameplay quality over full-browser-restart recovery**. The complete tab/process restart restoration feature should not be pursued for this hobby build; create a new room and start a new match after a full restart. Brief transport outages still use Phase14C pause/reconnect.

## Actual implementation
- `ui/character-art.mjs`: hand-authored original six SVG silhouettes without official sprites, raster textures, external imports, fonts or SVG filter effects:
  1. **あかねこ / embercat** — ember tail, cat ears and triangular flame markings
  2. **こもれび / leafkin** — unequal leaf canopy, sprouts, root feet
  3. **いしもり / stoneguard** — wide rock totem, block brow and crystalline mark
  4. **すずかぜ / breezefox** — long ears, sweeping tail and wind scarf
  5. **ほたる / glowbug** — antenna bulbs, wings, large lantern belly
  6. **くろがね / ironmask** — angular horns, shoulder armor, narrow red eye visor
  - Art is mapped by the actual `A1..A6/B1..B6` **canonical original rental positions**, so both players use the same six original designs, no parallel combat data.
  - `aria-hidden=true` and `focusable=false` on the SVG; visible name and interactive target are provided by the existing parent button. Browser supplies no remote image requests.
  - SVG dimensions within a wheel card ~47×47; five forecast miniatures ~26×26.
- `ui/match-stage.mjs`: render inline original vectors in **both** battle wheels and next-five forecast. Cache unchanged wheel/forecast DOM rather than rebuilding 12 complex SVGs on every gesture/ACK event. Cache includes active seat's pin, selection, team state and temporary combat feedback; action replay remains the original deterministic engine. All combat gameplay and full match protocol unchanged.
- `lab/match-stage.css`: animate only active/front-line portraits via lightweight CSS transform. Additional short one-shot strike/recoil/lift on the action event; bench and forecast portraits remain static. Reduced-motion users receive no portrait animations. Removed unused legacy rounded-head placeholder CSS.
- `lab/character-gallery.html`: separate development **gallery** of six larger characters, linked to the exact same source module and data, not a shipping game.
- `tests/character-art.test.mjs`: validates six distinct designs/roster names and side symmetry; rejects external scripts/assets/filters and invalid IDs; maintains a small markup budget.
- `tools/stage-smoke.mjs`: actual Chromium opens canonical original-engine lab and verifies **all 12 SVG character instances**, 6 distinct designs, matching teams, 5 character forecast icons, vector card sizes and no clipping, plus wheel/pin/watch/turn/gesture regressions.
- `.github/workflows/phase14-stage-qa.yml`: runs new character tests and archives real Chrome screenshots of **stage + large character gallery**.

## Evidence
- [All battle + art Node tests](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40083791925): success (370 Node tests).
- [Chrome stage + pointer QA + screenshot artifact](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40083791984): success.
- [Actual two-Chromium-client Firebase Emulator battle integration](https://github.com/8mahi8/yokai-battle-lab/actions/runs/40083791933): success.
- The review images are in the `phase14-original-engine-stage-preview` CI artifact: `phase14-stage-preview.png`, `phase15-character-gallery.png`.
- External tech references consulted: [W3C SVG decorative/accessible images](https://design-system.w3.org/styles/svg-icons.html), [MDN browser animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate), [WebKit CSS compatibility status](https://webkit.org/css-status/). Animate SVG root and avoid costly filters/individual internal path animations.

## Visual review verdict
- Screenshot reviewed: readable Japanese labels, all 12 characters inside their cards, mini forecasts match silhouettes. Art style is **simple flat/cartoon original 2D**, no pixel commitment, coherent enough to iterate.
- The characters are intentionally still **early-stage game art**, with simple face shapes and limited expression variety. Future work: coherent impact VFX, special activation cut-ins and stage/FX polish, better phone portrait layout (only as needed), responsive iPad testing. Do not mistake this for professional final design approval.
- No physical school iPad Safari, Google Sites embed, public online Firebase or user playtest conducted. No work done to main or public Google Sites.
- No Flash Soul in original initial game.

## Next development recommended
1. Add a character-specific short attack tell and negative/positive status icon clarity (do not overanimate the 12 units).
2. Improve hit feedback/audio optional-off, touch activation clarity and action turn cadence in local browser.
3. Validate old iPad Safari, then package the **real integrated game** for Google Sites code embed. No new standalone rushed substitute games.
4. Full browser process restart recovery **not required**; intentional new-room restart is acceptable.
