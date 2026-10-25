# Asset style sheet — outside 3D models (.glb)

Owner: prop · Status: v1 (Sprint 1, story S1-03) · Applies to every model made outside the code
(3D artist, AI 3D tool, asset store) before it enters `assets/models/`.

The game builds its rooms, props and food in code (`src/props/clay.js`). An outside model is
only worth it when code cannot reach the shape. It must then look as if it came from the same
hands: soft matte clay, rounded, pastel, calm.

## 1. Shape language
- **Rounded everything.** No sharp edge or corner: every edge has a bevel of at least 8% of the
  object's smallest side (a 1-unit box has ≥ 0.08 corner radius). Chunky, slightly swollen
  proportions, as if pressed from clay by hand.
- **Simple silhouettes.** Readable at 60 px tall on a phone. 1–3 big forms plus at most a few
  small accents (a knob, a leaf, a cherry). No thin parts under 0.03 units.
- **Soft asymmetry is welcome** (brand blob shapes, design.md §9) — a slight lean or wobble —
  but no broken, cracked, dirty or worn look.
- No text, logos or numbers modelled or painted on (UI is the HUD's job).

## 2. Material
- **One matte material.** glTF `pbrMetallicRoughness`: metallic **0**, roughness **0.85–0.95**.
  No clearcoat, sheen, transmission, emission or normal/roughness maps.
- **No textures.** Colour comes from **vertex colours** (`COLOR_0`) or from a separate
  primitive per colour with a flat `baseColorFactor`. No baked lighting, AO, gradients that fake
  shadow, or photo textures. The game adds its own soft blob shadow under the object.
- Glass, water, metal are shown by colour only (glass `#E7EFF8`, water `#D3E0F2`,
  metal `#C9D7E8`), still matte.

## 3. Palette
- Accents come from the brand gradient (design.md §3.1), usually **lightened 25–65% toward
  white**: `#7FA9B1` teal-grey · `#9BB0DE` periwinkle · `#CBA5D1` lavender · `#EB92B3` pink.
- Room tints (wall / floor): living `#F2F1FB / #E6E4F6` · kitchen `#FBF0F4 / #F4E1E9` ·
  bathroom `#EDF4F6 / #DCEAEE`. A prop must not be the same value as the room it sits in.
- Neutrals: white `#FFFFFF`, cream `#FDF8F4`, ink for tiny dark details `#5B6683` (no pure black).
- Food may use soft natural hues (banana `#F6DE8D`, apple `#F2A7B2`, crust `#F3DCC8`) at the
  same pastel lightness. **Never** saturated red or green (design.md §15); "bad/low" is muted pink.
- Saturation stays low: HSL saturation ≤ 60%, lightness ≥ 70% for large surfaces.

## 4. Poly and draw-call budget (phones first)
| Asset | Max triangles | Max primitives (draw calls) |
|---|---|---|
| Food / small item (≤ 0.5 units) | 2 000 | 1 |
| Decor item / small furniture | 5 000 | 2 |
| Large furniture (sofa, bed, tub) | 10 000 | 3 |
| Whole room total (static + animated) | 120 000 | 60 (budget; rooms built in code use ~5) |

Smooth shading with merged vertices (no faceted low-poly look). No hidden interior faces.
Static parts of one object are merged into one mesh; separate only the parts that animate.
File size: ≤ 300 KB per prop `.glb` (Draco/meshopt compression allowed only after a
`wire` check that the decoder is loaded).

## 5. Scale and units
- **1 unit = the pet's body radius** (the pet is about 2 units tall). Y up, metres not implied.
- Reference sizes: food 0.45 across · mug 0.2 · chair seat height 0.45 · table top 0.85 high ·
  sofa seat 0.7 high, 3.3 wide · fridge 2.5 high · toilet seat 0.8 high · door 3.2 high.
- Export with scale 1 on every node (apply transforms). No cameras or lights in the file.

## 6. Pivot and orientation
- **Floor items:** pivot at the centre of the footprint on the floor (y = 0 at the bottom).
- **Wall items:** pivot at the centre of the back face, the back face on the wall plane;
  front faces +Z.
- **Food and hand-held items:** pivot at the bounding-box centre (the code drags them by it).
- Front of every object faces **+Z** (toward the camera).
- Animated parts are separate child nodes with their pivot at the hinge (lid hinge, button
  centre, door hinge), named `anim:<part>`.

## 7. Decor items (room decoration and gacha, later sprints)
Each decor `.glb` ships with a sidecar entry so `wire` can place it:
`{ "id": "lamp_mushroom", "kind": "floor" | "wall" | "table", "footprint": [w, d], "anchor": [x, y, z] }`
— footprint in units on the floor (or wall), anchor = where it attaches relative to its pivot.

## 8. Naming and delivery
- File: `assets/models/<room|food|decor>/<snake_id>.glb`, e.g. `decor/lamp_mushroom.glb`.
- Node names in English snake_case; display names (Thai) live in data JSON, not in the model.
- Send a turntable screenshot on `#F2F1FB` with the triangle count; prop reviews it in the
  room demo (`tests/visual/rooms-demo.html`) before it is accepted.

## 9. Checklist before hand-off
- [ ] Rounded, no sharp edges, readable silhouette at 60 px
- [ ] One matte material, metallic 0, roughness 0.85–0.95, no textures
- [ ] Colours from §3, no saturated red/green, no pure black
- [ ] Within the §4 budget; transforms applied; smooth shading
- [ ] Pivot and +Z front per §6; animated parts named `anim:*`
- [ ] AI-generated: licence allows commercial use, free tool (CLAUDE.md: only free tools unless the owner approves spending)
