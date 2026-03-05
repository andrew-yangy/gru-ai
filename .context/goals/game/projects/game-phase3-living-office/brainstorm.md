# Brainstorm Synthesis — Game Phase 3: Living Office

## Participants
- **Sarah** (CTO) — architecture, rendering pipeline, data binding
- **Marcus** (CPO) — game UX, player experience, game feel
- **Riley** (Frontend/Builder) — implementation reality, codebase constraints

## Convergence (All Three Agree)

1. **Phased approach**: 4 phases, each independently shippable
2. **Z-sort fix is Phase 1**: broken rendering destroys game feel, must fix first
3. **Spatial behavior scoped to 3 states in v1**: desk (working), meeting room (discussing/planning), idle wander — defer break room and CEO office routing to follow-on
4. **CEO character**: JSON-only add to agent-registry.json (`game: null` → `game: {...}`), no code changes needed beyond the registry entry
5. **Data flow**: existing Zustand → GamePage → CanvasOffice → OfficeState pipeline is correct, extend it rather than adding new data paths
6. **Smooth movement**: existing pathfinding (A*, walkToTile, reassignSeat) handles the actual movement — spatial behavior is a dispatch layer on top (~50 lines)
7. **Linger behavior**: belongs in the game loop tick, not React useEffect timers (Sarah/Marcus critiqued Riley's timer approach; race conditions with rapid state changes)

## Key Disagreements

### 1. Z-Sort Fix Location
- **Sarah**: Fix the source — `FurnitureInstance.zY` in `layoutSerializer.ts` where it's written. Up-facing chairs have zY set to sprite top-left y instead of seat row bottom pixel.
- **Riley**: Fix the consumer — clamp `charZY` in `renderer.ts` renderScene().
- **Marcus**: Sides with Sarah — renderer-side clamp masks the bug, breaks again when new furniture added.
- **Resolution**: Fix at source (layoutSerializer.ts). Sarah's approach is more robust.

### 2. HUD Rendering Architecture
- **Sarah**: HTML/CSS as **peripheral UI outside canvas boundary** (not overlay). Canvas owns game viewport, HTML wraps it. Same pattern as claw-empire.
- **Riley**: React DOM **overlay positioned on top** of canvas. Allows shadcn/ui components and Tailwind.
- **Marcus**: Keep HUD in Canvas (minority position).
- **Rebuttals**: Both Sarah and Marcus critiqued Riley's overlay approach — two rendering trees with no shared coordinate system, compositing headaches, z-index conflicts.
- **Resolution**: Peripheral HTML bar above/around canvas (Sarah's approach). Riley's shadcn/ui benefit is valid but can be achieved with peripheral placement too.

### 3. Status Indicators Implementation
- **Sarah**: Full ZDrawable pipeline — rasterize icons to OffscreenCanvas, inject into z-sort.
- **Riley**: Simple canvas fillArc pass after character sprites — colored dot + white border, 15 lines, no ZDrawable plumbing.
- **Unresolved**: Sarah's approach is architecturally pure but Riley correctly flags OffscreenCanvas caching as premature for tiny 8-12px dots. Pragmatic middle ground: render status icons in a dedicated pass after renderScene() (like renderBubbles()), not in z-sort pipeline.

### 4. Phase Ordering
- **Marcus**: Status indicators first (biggest perceptual impact — transforms office from decoration to data)
- **Sarah**: Data binding infrastructure first, then status indicators
- **Riley**: Z-sort fix first, then data binding + spatial together
- **Resolution**: Z-sort fix is trivially fast (one file change), so do it first. Then status indicators + data binding together (Marcus's "never ship a pretty lie" principle). Spatial behavior Phase 3. HUD Phase 4.

## Insights That Survived Challenge

- **Marcus**: "Claw-empire's game feel comes from tight feedback loops and responsiveness, NOT feature count" — unchallenged, critically important for scope decisions
- **Marcus**: Zustand update frequency (5s poll intervals) will cause jittery movement without a debounce/smoothing layer between store updates and visual state transitions
- **Sarah**: CEO character has no session in dashboard-store (it's the user, not an agent) — needs special-casing, cannot be treated like other agents
- **Sarah**: Room zones (meeting room, break room, CEO office) are not currently modeled as named regions — need tile coord ranges or waypoint lists
- **Riley**: Clickable furniture follows exact same pattern as existing `getCharacterAt()` in OfficeState — low implementation risk

## CEO Clarification Questions

### Q1: HUD Placement and Scope
The team agrees the HUD should be HTML (not canvas-rendered), but should it be:
- **(A)** A simple dark bar above the canvas (like current GameHeader but richer — date/time, notification badges, quick buttons)?
- **(B)** A full chrome wrapper (top bar + optional side panels + bottom status bar) around the canvas viewport?
Option A is ~2 days work, Option B is ~5 days and changes the page layout significantly.

### Q2: CEO Character Behavior
The CEO character needs adding, but how should it behave?
- **(A)** Static presence — always sits in CEO office, purely decorative. Trivial to implement.
- **(B)** Reactive — moves to meeting room when a directive is running, appears at agent's desk when reviewing. Medium complexity.
- **(C)** Player-controlled — WASD/click-to-move, the player IS the CEO walking around. High complexity, changes the game fundamentally.

### Q3: Spatial Behavior Scope for V1
- **(A)** 3 locations only: own desk (working), meeting room (discussing/planning), idle wander. Fastest to ship.
- **(B)** 5 locations: + CEO office (when talking to CEO) + break room (when truly idle vs working-idle). More meaningful but needs room zone definitions.
- **(C)** Full context-aware: agent goes to server room when running infra tools, design room when doing UI work, etc. Requires threading tool/task context into spatial decisions. Significantly more complex.

## CEO Answers

- **Q1**: (B) Simple dark bar above canvas — richer GameHeader with date/time, notifications, quick buttons
- **Q2**: (C) Player-controlled CEO — WASD/click-to-move, the player IS the CEO walking around
- **Q3**: (C) Full context-aware routing — agents go to contextually relevant rooms based on current tool/task
- **Layout**: Use zone definitions on existing 32x32 map (carve lobby into server room, break room, etc.) rather than redesigning the Tiled layout
