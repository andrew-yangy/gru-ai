# Plan for Approval: Game Visual Quality Overhaul

## Directive
game-visual-quality-overhaul (strategic)

## TL;DR

- **What**: Overhaul all game visuals to exceed pixel-agents and claw-empire quality -- z-sort, rooms, textured environments, multi-frame character sprites, animation system
- **Scope**: 4 initiatives (3 complex P0, 1 moderate P1), all frontend (Riley builds, Sarah+Marcus review)
- **Risk**: Proceed as-is -- Morgan flagged wall auto-tiling and RoomGrid scope creep as over-engineering concerns, but both are within CEO's explicit mandate
- **Key dependency**: Strict execution order (z-sort -> environment -> characters -> animation). No parallelism possible.
- **Character art risk**: 9+ hand-crafted pixel arrays require visual feedback loop. Highest quality risk.

Approve all / Approve with changes / Reject

---

## Risk and Scope Assessment (Morgan)

**Risks:**
1. Procedural character art quality -- hand-crafting 32+ pixel arrays (4 animation states x 2+ directions x 2-4 frames) is error-prone. Each 16x24 = 384 pixels that must form recognizable humans. Without visual feedback, bad arrays fail the quality bar.
2. Renderer restructuring for z-sort -- moving from flat grid-order to painter's algorithm requires merging walls/furniture/characters into a sorted draw list. Wrong z-sort = visual artifacts.
3. Environment rendering scope -- upgrading ALL 10 tile types to 20-40 lines = 200-400 new lines, each needing visual verification. The feedback loop could make this 3x slower.

**Over-engineering flags:**
- Wall auto-tiling with 4-bit bitmask (16 variants) is complex -- simpler depth shading achieves 80% of the visual lift
- RoomGrid data model could creep toward a room editor -- must stay render-only (static data, no CRUD)

**Recommendation:** Proceed as-is. CEO mandated ALL furniture gets full treatment. Floors/walls/furniture combined into one initiative to avoid merge conflicts on renderer.ts.

---

## Audit Findings Summary

Sam investigated the codebase, Sarah provided architectural design.

**Current state:**
- renderer.ts: 590 lines, 10 tile renderers (15-47 lines each), flat grid-order rendering, no z-sort
- sprites.ts: 166 lines, 1 sitting template, 7 palette indices, 6 agent palettes, Map cache by name only
- types.ts (engine): 13 lines, only CameraState interface
- office-layout.ts: OFFICE_GRID (20x14), no room zones
- CanvasOffice.tsx: render-on-dirty rAF loop, no animation tick
- OfficeGrid.tsx: DEAD CODE (old DOM grid, zero imports)

**Key architectural findings (Sarah):**
- Agent sprites are drawn INSIDE renderDesk() -- must be extracted for z-sort to work
- Canvas 2D supports `hsl()` strings natively -- no utility needed for room colorization
- Several renderers already hit 27-47 lines -- only renderFloor (15 lines) needs major work
- Hybrid animation approach recommended: keep dirty-flag for tiles, add separate animation tick (cheap frame index comparison)
- Keep getAgentSprite() as backward-compatible wrapper until z-sort extracts sprites

---

## P0 -- Must Ship

### 1. Z-Sort Painter's Algorithm + Room Zone Data Model
**Phases:** design -> clarification -> build -> tech-review -> product-review
**Cast:** Riley builds, Sarah audits, Sarah+Marcus review
**Complexity:** complex

**Scope:** Add RoomGrid data model (RoomZone interface with id, name, department, baseHSL, bounds). Export ROOM_GRID from office-layout.ts with 4+ zones. Refactor render() into two passes: ground pass (tiles in row order with room colors) and entity pass (agents collected into Renderable[], sorted by zY, drawn back-to-front). Extract agent drawing from renderDesk().

**Audit approach (Sarah):** Types first (engine/types.ts + game/types.ts), then data (office-layout.ts), then render refactor (split render() into ground+entity passes), then wire-up (CanvasOffice.tsx). Engineering zone rows 4-10 cols 3-16, Executive rows 2-3 cols 14-18, Conference rows 2-3 cols 3-5, Lobby rows 11-12 cols 1-18.

**Active files:** renderer.ts, engine/types.ts, office-layout.ts, game/types.ts, CanvasOffice.tsx
**Dead code:** OfficeGrid.tsx (delete -- confirmed zero imports)

**DOD:**
1. RoomGrid type exists in types.ts with room id, display name, color theme (HSL), and tile boundary rect
2. office-layout.ts exports ROOM_GRID with at least 4 distinct room zones covering the full 20x14 grid
3. Renderer sorts all drawable entities by Y coordinate using painter's algorithm before drawing
4. Existing tile renderers produce no visual regressions -- all 10 tile types still render correctly
5. TypeScript compiles and Vite builds with zero errors

---

### 2. Floors, Walls, and Furniture Visual Overhaul
**Phases:** design -> clarification -> build -> tech-review -> product-review
**Cast:** Riley builds, Sarah audits, Sarah+Marcus review
**Complexity:** complex

**Scope:** Upgrade all tile renderers. Floors: checkerboard with fake 3D lighting, HSL colorization per room. Walls: depth shading (light top/dark bottom), room accent baseboard. Furniture: all 10 types to 20-40 lines with multi-layer detail -- wood grain, monitor code lines, coffee mugs, book spines. Desk monitors show green-on-dark terminal lines. CEO desk shows blue dashboard tones.

**Audit finding:** Several renderers already 27-47 lines. renderFloor (15 lines) needs most work. renderDesk and renderCeoDesk monitors are flat blue -- need code-line detail. Canvas 2D supports hsl() strings natively. Depends on z-sort for roomHSL in TileRenderOpts.

**Active files:** renderer.ts, game/types.ts

**DOD:**
1. Floors use textured patterns (checkerboard or wood grain) with HSL colorization per room -- zero flat solid fills remain
2. Walls have visible depth shading (light top edge, dark bottom) and room-specific accent colors
3. All 10 tile type renderers use 20-40 lines of procedural drawing with highlights, shadows, and at least 2 detail layers
4. Desk monitors show colored rectangles suggesting code content, desks show wood grain texture
5. TypeScript compiles and Vite builds with zero errors

---

### 3. Multi-Frame Directional Character Sprite System
**Phases:** design -> clarification -> build -> tech-review -> product-review
**Cast:** Riley builds, Sarah audits, Sarah+Marcus review
**Complexity:** complex

**Scope:** Hand-craft 9+ pixel array templates (16x24): walk front 0-3, sit front, type front 0-1, idle front 0-1. Side-facing templates (right drawn, left flipped). 2-3 hair style variants across agents. Palette expansion with skin tone variation. getSpriteFrame(name, frame, direction) API. Cache key updated to name:frame:direction composite.

**Audit finding:** Only 1 template exists today (sitting front). Need 10+ new templates, each 384 hand-crafted pixel values. Hair variants: override rows 0-4 of base template. Keep getAgentSprite() as backward-compatible wrapper. clearSpriteCache() is a dead export (never called).

**Active files:** sprites.ts, renderer.ts

**DOD:**
1. Sprite templates exist for at least 4 animation states: walk (4 frames), sit (1), type (2), idle (2) -- minimum 9 unique pixel arrays
2. Front-facing and side-facing directions supported, with side-right as horizontal flip of side-left
3. Each of the 5 named agents has visually distinct appearance via palette + at least 2 hair style variants across agents
4. getSpriteFrame(name, action, direction, frameIndex) exported and returns correct cached canvas
5. TypeScript compiles and Vite builds with zero errors

**VISUAL FEEDBACK MANDATORY:** Character pixel arrays must be verified in browser. Builder writes, reviewer screenshots, iterate until quality matches references.

---

## P1 -- Should Ship

### 4. Character Animation State Machine and Frame Cycling
**Phases:** design -> clarification -> build -> review
**Cast:** Riley builds, Sarah audits, Sarah reviews
**Complexity:** moderate

**Scope:** AnimationState type tracking action/direction/frame/lastFrameTime per agent. Animation tick function with configurable fps (8fps walk, 4fps type/idle). AgentStatus-to-animation mapping. Hybrid rAF approach: keep dirty-flag for tile redraws, add animation tick that only swaps cached sprite frames. Wire renderer entity pass to use getSpriteFrame with animation state.

**Audit finding:** rAF loop currently ignores timestamp parameter. propsRef pattern exists for stale-closure fix. Hybrid approach keeps CPU low when nothing animates (agents offline = no redraws). Must land AFTER z-sort (entity pass) and character-sprites (getSpriteFrame).

**Active files:** CanvasOffice.tsx, engine/types.ts, game/types.ts, GamePage.tsx, sprites.ts, renderer.ts

**DOD:**
1. AnimationState type in types.ts tracks action, direction, and frameIndex per agent name
2. Frame cycling runs at 8fps for walk and 4fps for type/idle, decoupled from display refresh rate
3. AgentStatus automatically maps to animation action -- working agents type, idle agents idle
4. Renderer uses animation state to select correct sprite frame via getSpriteFrame
5. TypeScript compiles and Vite builds with zero errors

---

## Execution Order (strict dependency chain)

```
z-sort-room-system (P0) ──> environment-rendering (P0) ──> character-sprites (P0) ──> animation-system (P1)
    (foundation)              (uses room colors)           (needs z-sort entity pass)  (needs sprites + z-sort)
```

No parallelism possible -- each initiative depends on the previous one's output.

---

## Follow-ups Identified by Audit

| Action | Risk | Initiative |
|--------|------|-----------|
| Delete OfficeGrid.tsx (dead code) | low | z-sort-room-system |
| Extend TileRenderOpts with roomHSL | medium | z-sort-room-system |
| Add code-line details to desk monitors | medium | environment-rendering |
| Add wood grain texture lines | low | environment-rendering |
| Update spriteCache key to composite | medium | character-sprites |
| Add hair variants + skin tones | medium | character-sprites |
| Switch rAF to hybrid animation tick | medium | animation-system |

All follow-ups are within scope of their parent initiatives -- no separate work items needed.

---

## Backlog Conflict Check
Current backlog has 1 item: "agent-process-stats-in-game" (P2, depends on game-phase2-data-bridge). No conflict -- that is a data feature, not visual. Remains unchanged.

## Reference Files
- Brainstorm: `brainstorm.md` (this directory)
- Morgan plan: `morgan-plan.json` (this directory)
- Audit findings: `audit-findings.json` (this directory)
- Quality standards: `.context/goals/game/context.md`
- Directive brief: `.context/directives/game-visual-quality-overhaul.md`
