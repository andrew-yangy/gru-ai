# Game Goal — Context & Standards

## Visual Quality Standard (CEO Mandate — March 2026)

**The quality bar is BETTER than pixel-agents and claw-empire — and better than anything else in the market. These are the floor, not the ceiling. No compromises. No "good enough for now."**

Reference repos (minimum baseline — we must exceed these):
- https://github.com/pablodelucca/pixel-agents (Canvas 2D, ~1800 lines, 2.7k stars)
- https://github.com/GreenSheep01201/claw-empire (PixiJS 8, procedural furniture, PNG characters)

Character quality reference (visual target for procedural sprites):
- https://jik-a-4.itch.io/metrocity-free-topdown-character-pack (CC0, top-down pixel art, 4-dir running, hair/outfit variations — use as QUALITY REFERENCE only, not as assets)

**The goal is to be the best office simulation pixel art in the market.** If someone screenshots our game, it should be immediately obvious this is a level above anything else out there. Every detail matters — lighting, shadows, texture, character personality, environmental storytelling, animation fluidity.

### What "Best in Market" Means

**Characters**: Hand-crafted pixel art at minimum 16x24, with animation frames (walk, sit, type, idle). Multiple directions (down, up, left/right). Distinct hair, face, clothing per agent. Brand color applied via palette system or runtime tinting. NOT blind LLM-generated pixel arrays — must have visual verification loop.

**Furniture**: Rich procedural Canvas 2D drawings with multiple layers — wood grain, monitor screens showing code, keyboard with keycaps, coffee mugs with steam, bookshelves with colored books, sticky notes. Follow claw-empire's approach: 20-40 lines per furniture piece with highlights, shadows, and detail.

**Floors**: Textured patterns (checkerboard, wood grain, tile) with HSL colorization per room type. NOT flat solid fills.

**Walls**: Depth shading, auto-tiling, room borders with accent colors. NOT flat rectangles.

**Z-sorting**: Painter's algorithm — walls, furniture, and characters merged and sorted by Y coordinate. Objects in front occlude objects behind.

### Visual Feedback Loop (MANDATORY)

Every sprite, furniture piece, and visual change MUST go through a visual feedback loop:
1. Riley (or builder) writes the rendering code
2. The main session (or reviewer) views the result in Chrome via MCP tools
3. Screenshots are taken and compared against the quality bar
4. If it doesn't match the reference quality → iterate. Send screenshot back to Riley with specific feedback.
5. Repeat until the visual quality matches pixel-agents/claw-empire level.

This applies to ALL game visual work, not just sprites. Slow is fine. Ugly is not.

### Technical Findings from Reference Analysis

**pixel-agents architecture** (Canvas 2D):
- 16px tile grid, 16x24 character sprites
- Characters: PNG sprite sheets (112x96) sliced into frames, with code-defined fallback using 2D hex arrays + palette template (H/K/S/P keys → hair, skin, shirt, pants)
- Sprite cache: WeakMap keyed by zoom level, rendered via fillRect per pixel
- Floor: grayscale PNG patterns + Photoshop-style HSL Colorize transform
- Walls: PNG sprite sheet with 4-bit bitmask auto-tiling (16 variants)
- Furniture: code-defined 2D arrays + imported PNG tileset
- Z-sorting: painter's algorithm (walls + furniture + characters merged by zY)
- Character anchoring: bottom-center, sitting offset of 6px
- Animation: walk (4-frame), typing (2-frame), reading (2-frame)
- Left sprites = horizontally flipped right sprites

**claw-empire architecture** (PixiJS 8):
- Characters: individual PNG files (~52px tall), 14 types × 5 frames each
- Floor: 100% procedural — 2-color checkerboard (20px tiles) with highlight/shadow strokes for fake 3D
- Walls/rooms: 100% procedural with atmosphere shading
- Furniture: 100% procedural PixiJS Graphics — insanely detailed (desks with wood grain + monitors showing IDE code lines + coffee mugs with bezier steam + sticky notes)
- Text/labels: PixiJS Text objects (not HTML/CSS)
- Device pixel ratio: capped at 2x
- Agent slots: 100x120px per station
- `imageRendering: "pixelated"` for crisp scaling

### What We Steal (as starting points — then surpass)

We learn from these repos, then go beyond them:

| From pixel-agents | From claw-empire |
|-------------------|-----------------|
| Palette template system (H/K/S/P) | Procedural furniture detail level |
| Floor colorization (HSL transform on grayscale) | Checkerboard with fake 3D lighting |
| Wall auto-tiling (4-bit bitmask) | Room atmosphere shading |
| Sprite cache with WeakMap | Multi-layer furniture rendering |
| Character sitting offset | Monitor screens showing code/status |
| Outline effect for selection | Coffee mugs, plants, sticky notes |
| Z-sorting by zY coordinate | Department color themes |
