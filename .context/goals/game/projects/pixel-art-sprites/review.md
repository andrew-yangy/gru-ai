# Product Review: Pixel-Art Sprites
**Project:** pixel-art-sprites
**Reviewer:** Marcus Rivera, CPO
**Date:** 2026-03-04
**Files Reviewed:** `engine/sprites.ts`, `engine/renderer.ts`, `types.ts`, `CanvasOffice.tsx`

---

## Summary Verdict: **PASS WITH NOTES**

Both initiatives shipped working, coherent pixel-art. The character sprites achieve their core goal — at a glance you can tell Alex from Priya from Morgan. The environment tiles are all recognizable and visually distinctive from one another. There are two gaps that need addressing in the next iteration, and three polish improvements worth queuing.

---

## 1. Visual Quality — **PASS**

**At 40px (1× zoom):**
Every tile is readable as the thing it's supposed to be. The wall's brick bond is clear, the whiteboard's sticky-note grid is delightful, the server room's dark rack with LED dots reads as high-tech. The bell's stacked-rect dome shape is surprisingly effective — you wouldn't think rectangles could suggest a bell, but they do.

The desk monitor (10×7px with 8×5px blue screen) is very small but contributes context rather than being the focal point. It works.

**At 2× and 4× zoom:**
`imageSmoothingEnabled = false` means pixel art scales without blurring. Each "pixel" simply becomes a larger square. The sprite cache renders at 1× and uses `drawImage` — this is the correct approach. At 2× the character sprites are 32×48px and become nicely chunky; at 4× they're 64×96px and fully readable as stylized figures.

**One concern:** Floor grout lines (`ctx.stroke()` with `lineWidth = 1`) will appear as 4px-wide stripes at 4× zoom since the camera transform scales line width along with geometry. At maximum zoom, the grout dominates the floor. Not a blocker but worth knowing.

---

## 2. Sprite Readability — **PASS**

**Color differentiation is excellent.** Five highly saturated, perceptually distinct colors:
- Alex: bright blue `#3B82F6`
- Sarah: vivid purple `#A855F7`
- Morgan: teal-green `#10B981`
- Marcus: warm orange `#F97316`
- Priya: hot pink `#EC4899`

These will never be confused for each other, even at the smallest practical zoom. The brand color occupies the shirt (rows 9–14 of the sprite template, the dominant body mass) plus the 5×5 top-left indicator square on the desk tile. Double visual cue — good redundancy.

**Hair color differentiation is negligible and that's fine.** All five hair colors are dark shades occupying ~4px height at 40px tile. Don't rely on hair to distinguish agents; the implementation correctly uses shirt color as the primary signal.

**The sitting pose is readable but slightly off anatomically.** Rows 17–21 show legs spread apart with shoes at the bottom. At 40px the sprite is centered with `spriteY = y + 8`, putting the shoes at `y + 29`. The desk surface extends to `y + 35`. So the shoes are hovering above the desk floor — the character reads more as "floating figure" than "seated at desk." There's no chair sprite grounding the agent. This is acceptable at 1× (the overall impression is "person at desk") but becomes more noticeable at higher zoom.

The brand color + status dot squares (`5×5` at top-left and top-right of desk tile) are effective status indicators that don't depend on sprite detail to be legible.

---

## 3. Consistency — **PASS**

All tiles share a coherent visual grammar:
- Rectilinear-only paths throughout (no arcs, no beziers)
- All furniture tiles start with a floor base, then layer furniture on top
- Color palette uses the same muted warm-neutral tones for wood surfaces across desk, CEO desk, conference, and door
- Status coloring (green/yellow/gray/red) is consistent with the rest of the system

The server room is the most visually deviant tile — dark background, cool blue-gray palette — but this is intentional and appropriate. It reads as "different environment" which is correct.

The whiteboard background uses `#e7e5e4` (wall-like gray) rather than floor color. Given whiteboards are wall-mounted, this is the right call and doesn't break consistency — it contextualizes the tile.

**No tiles look out of place.** The visual family holds.

---

## 4. Completeness — **NEEDS_WORK**

**All 10 tile types are implemented.** The dispatch table in `TILE_RENDERERS` covers every `TileType` value. No missing cases. ✓

**Gap 1 — CEO Desk has no occupant sprite (functional regression risk):**
`renderCeoDesk` does not accept an `opts` parameter. The render call in the main loop only passes opts for `tileType === 'desk'`, never for `'ceo-desk'`. This is currently fine since the CEO desk is the player's desk. But if the model ever puts an AI agent there, the desk will render empty. More immediately: the CEO desk has no status indicator squares, so there's no visual feedback when the CEO is "working" vs "idle." The floor occupying `y+0` to `y+8` above the desk looks empty. This should match the standard desk pattern (brand + status dots, or deliberately leave them out and document why).

**Gap 2 — No chair sprite behind sitting characters:**
Agent sprites show legs hanging down in a sitting posture, but there's nothing under them. The desk surface extends to `y+35` and the sprite's shoe tips end at approximately `y+29`. A small `4×4` or `6×4` chair-back indicator at the bottom of the desk tile (between the sprite's waist and the desk edge) would ground the character visually and make the "sitting at desk" reading unambiguous. This is a cosmetic gap, not a functional one.

**Gap 3 — Conference tile shows no occupancy state:**
Six chair indicators are drawn, but there's no mechanism to show agents present at the conference table (no sprite, no status dot, no color highlight). If the conference tile is used for "meeting in progress" state, there's no visual signal. Acceptable for v1 if conference rooms aren't yet wired to agent state, but worth tracking.

---

## 5. Technical Quality — **PASS**

**Dirty-flag render loop:** Only redraws when `dirtyRef.current = true`. The rAF loop runs every frame but skips rendering when nothing changed. This is the correct pattern — zero GPU work for idle frames. ✓

**Viewport culling:** The visible tile range is computed from camera offset and zoom before the render loop. Off-screen tiles are never drawn. For a 20×20 grid this matters less, but the implementation is correct and scales to larger maps. ✓

**Sprite caching:** Each agent's 16×24 offscreen canvas is rendered once and cached in `spriteCache`. `getAgentSprite` is a pure cache hit after first call. `drawImage` is one of the cheapest Canvas operations. ✓

**No per-frame allocations:** The render function receives all data as arguments and doesn't create objects in the hot path. `agentByName` is a module-level Map built at init. ✓

**DPR handling:** `imageSmoothingEnabled = false` is set in ResizeObserver. However, it's set on the context obtained inside the observer callback. The rAF loop calls `canvas.getContext('2d')` every frame — this returns the same context object, but if the DPR changes (rare, but possible when moving to a different monitor), the smoothing flag would be reset by the canvas resize and needs to be reapplied. This is a minor edge case, not a practical bug.

**One performance note:** `canvas.getContext('2d')` is called inside the rAF loop every frame. This is idempotent and cheap, but could be cached in a ref established during the ResizeObserver setup. Not a performance problem at this scale.

---

## 6. Pixel Art Aesthetic — **PASS**

The rectilinear-only constraint is honored throughout. Let's audit the hardest cases:

| Furniture | Challenge | Result |
|-----------|-----------|--------|
| Bell | Dome requires curves | Stacked rects (widths 6/10/14/18px) — effective silhouette ✓ |
| Doorknob | Should be circular | 3×3px square with 1px highlight — reads as knob ✓ |
| Monitor screen | Rounded corners in real life | Sharp rectangle — matches pixel aesthetic ✓ |
| Chair backs | Rounded seats | 4×4 squares — abstract but sufficient ✓ |
| Mailbox | Curved top | Two-rect top (wider cap) — readable ✓ |

The constraint succeeds. Everything reads as the intended object. The aesthetic is internally consistent — it feels like a deliberate design choice, not a technical limitation.

The bell is the standout success. The tapered stacked-rect dome plus clapper plus pedestal is a recognizable bell silhouette built entirely from rectangles. That's good pixel-art craft.

---

## 7. Top 3 Recommendations for Future Polish

### Recommendation 1: Add chair-back sprite to desk tiles (High impact, low effort)
Draw a `6×4` dark gray rect at `y + size - 8` centered behind the agent sprite. This single addition makes "agent sitting at desk" immediately readable at all zoom levels and fixes the floating-character issue. Coordinate with the sitting leg gap (rows 17–21 in the template) to make the full seated posture legible.

### Recommendation 2: Unify CEO Desk with standard desk status system (Medium impact, low effort)
Either add brand + status indicator squares to `renderCeoDesk` (matching the regular desk pattern), or document a deliberate reason for the omission. The current state looks like an oversight. If the CEO is always the human, a gold crown pixel-art indicator would be a nice differentiator over the plain empty space at the top of the tile.

### Recommendation 3: Animate status dot at working state (High impact, medium effort)
The current status dot is static. A 2-frame blink (green dot present / absent) on a 1-second cycle for `working` status would add life to the office without being distracting. The dirty-flag pattern means this requires a timer that marks dirty every 500ms only when any agent is `working`. This would be the single highest-impact visual polish addition — a still office feels frozen, a blinking office feels alive.

---

## Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| All text/emoji placeholders replaced | ✓ Met | All 10 tile types render procedurally |
| 5 named agent sprites distinguishable | ✓ Met | Shirt colors are clear differentiators |
| Retro RPG pixel-art style | ✓ Met | Consistent rectilinear aesthetic |
| Environment tiles cover all TileTypes | ✓ Met | Full dispatch table |
| Offscreen canvas sprite caching | ✓ Met | `spriteCache` Map, `getAgentSprite()` |
| No jank / clean render loop | ✓ Met | Dirty flag, culling, no per-frame alloc |
| CEO desk distinct from standard desk | ✓ Met | Mahogany color, larger monitor, gold accents |

---

**Overall: PASS.** Both initiatives delivered working, coherent pixel art that meaningfully improves the game's visual quality over text/emoji placeholders. The two gaps (CEO desk status integration, chair-back sprite) should be addressed in the next Polish pass before the game is shown externally. The three recommendations are v2 improvements, not blockers.
