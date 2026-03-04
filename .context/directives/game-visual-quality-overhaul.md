# Directive: Game Visual Quality Overhaul

## CEO Intent

The current game visuals are unacceptable. They look 1980s. pixel-agents and claw-empire are the MINIMUM baseline — we must EXCEED them and be the best office simulation pixel art in the market. If someone screenshots our game, it should be immediately obvious this is a level above anything else out there. Every detail matters — lighting, shadows, texture, character personality, environmental storytelling, animation fluidity. No compromises. It can be slow, but it must be the best.

Reference repos (floor, not ceiling):
- https://github.com/pablodelucca/pixel-agents
- https://github.com/GreenSheep01201/claw-empire

## What Needs to Happen

### 1. Research Phase

Deep-dive into BOTH reference repos' actual source code. The exploration agents have already produced findings (see `.context/goals/game/context.md`). Now we need:

- **Character sprite approach**: pixel-agents uses PNG sprite sheets with a palette template system (H/K/S/P keys for hair/skin/shirt/pants). claw-empire uses individual PNG files per frame. Decide: do we hand-craft our own sprite PNGs? Use the palette template approach from pixel-agents? Find open-source character sprites and tint them?
- **Furniture rendering**: claw-empire draws every furniture piece procedurally with 20-40 lines of PixiJS Graphics code — wood grain, monitor screens, coffee mugs with steam, bookshelves with books. Can we achieve this quality with Canvas 2D? What's the equivalent approach?
- **Floor/wall system**: pixel-agents uses grayscale PNG patterns + HSL colorize. claw-empire uses procedural checkerboard with fake 3D lighting. Which approach fits our Canvas 2D renderer?
- **Z-sorting**: Both repos use painter's algorithm. We need this for depth.
- **Room system**: claw-empire has colored department rooms with borders and atmosphere. We should have distinct areas (CEO office, engineering area, conference room, etc.)

### 2. Replan Game Phase 2

The current Phase 2 project breakdown may need to change. The original 6 projects were:
1. Canvas Engine Core (DONE)
2. Pixel Art Sprites (DONE but quality insufficient)
3. Agent AI & Movement
4. Data Bridge
5. CEO Avatar
6. Interactions

Replan based on the research. The visual quality overhaul might mean:
- Project 2 gets redone/expanded significantly (character sprites, furniture, floors, walls, z-sorting)
- Projects 3-6 may shift scope
- New projects may be needed (room system, animation system)

### 3. Update Backlog

Check `.context/goals/game/backlog.json` for conflicts with the new plan. Update as needed.

## Constraints

- Canvas 2D only (no PixiJS migration — our engine works, we just need better art)
- Programmatic sprites preferred, but PNG assets acceptable if they produce better quality
- Visual feedback loop is MANDATORY — every visual change must be verified in Chrome
- Read `.context/goals/game/context.md` for the full quality standard and technical findings

## What I Want Back

1. A detailed research document comparing approaches for each visual system (characters, furniture, floors, walls)
2. A recommended approach for each, with pros/cons
3. A revised project breakdown for the rest of Phase 2
4. Updated backlog if needed
