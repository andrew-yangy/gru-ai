# Directive: Game Phase 2 — Canvas Engine, Sprites, and Agent AI

## CEO Brief

Phase 1 proved the concept: a clickable CSS Grid office with real Zustand data. But it's static, ugly, and feels nothing like a game. Phase 2 transforms it into a living, breathing pixel-art office.

**Core insight from research**: We don't need a game engine. Both reference projects (pixel-agents with 2.7k stars, claw-empire with 360 stars) prove that React + Canvas 2D or PixiJS with programmatic sprites works perfectly. Pixel-agents is especially relevant — it's the exact same use case (visualizing AI agents working) built with Canvas 2D, no framework, and it works beautifully.

**What to steal**:
- From pixel-agents: Canvas 2D renderer, programmatic palette-swap sprite system, BFS pathfinding, 3-state FSM (work/idle/walk), Z-sorted rendering, pixel-perfect integer zoom
- From claw-empire: Procedural furniture drawing with Graphics primitives, scene decomposition pattern (buildScene-*.ts), ref-based animation state, working agent particle effects, meeting visualization

**The user wants to "start from AI"** — meaning agent intelligence and behavior is the priority. But Canvas is a prerequisite for showing movement. So we build the minimal visual foundation first, then invest heavily in agent AI.

## Phased Project Plan

Break into 6 small projects. Each is self-contained, delivers visible progress, takes 2-3 days, and builds on the previous one. Do one at a time, do it right.

### Project 1: Canvas 2D Engine Core
**What**: Replace CSS Grid with Canvas 2D renderer
**Scope**:
- Canvas component with requestAnimationFrame game loop
- Tile-based rendering (16x16 or 32x32 tiles) from the existing office-layout.ts grid
- Camera system (viewport, pan, zoom)
- Click/hover detection on tiles (convert screen coords → tile coords)
- Integer zoom for pixel-perfect rendering (imageSmoothingEnabled = false)
- ResizeObserver for responsive canvas sizing
- Keep existing SidePanel working (Canvas handles the grid, React handles the panel)
**Steal from**: pixel-agents gameLoop.ts, renderFrame(), tileMap.ts
**Delivers**: Same office layout, now rendered on Canvas with smooth zoom/pan. Visually similar to Phase 1 but on a proper game foundation.

### Project 2: Programmatic Pixel Sprites
**What**: Characters and furniture drawn with code, no external assets
**Scope**:
- Character sprite system: 16x24 pixel templates with palette keys (H=hair, K=skin, S=shirt, P=pants)
- 6+ palettes for agent diversity (Alex=blue, Sarah=purple, Morgan=green, Marcus=orange, Priya=pink, etc.)
- Animation frames: walk (4 frames/direction), work/type (2 frames), idle (2 frames)
- Sprite caching: render to offscreen canvas per zoom level, WeakMap cache
- Horizontal flip for left/right symmetry
- Furniture: procedural drawing via Canvas paths (desks, chairs, monitors, whiteboards, mailbox, bell, plants)
- Z-sorted rendering (lower Y = drawn later = in front)
**Steal from**: pixel-agents spriteData.ts + spriteCache.ts + characterPalettes; claw-empire drawing-furniture-*.ts
**Delivers**: Pixel-art characters sitting at desks, visible furniture. The office looks like a game.

### Project 3: Agent Behavior & Movement (THE AI PROJECT)
**What**: Agents that think, move, and behave autonomously
**Scope**:
- 3-state FSM per agent: WORK (sitting, typing animation), IDLE (standing, deciding), WALK (following path)
- BFS pathfinding on tile grid (4-connected, no diagonals)
- Blocked tiles from furniture footprints
- Smooth movement interpolation (lerp between tile centers, ~48px/sec)
- Behavior rules:
  - Active agent (session running): walk to desk → sit → type animation
  - Idle agent: wander randomly (3-6 tiles, 2-20s pause between) → return to desk → rest (2-4 min) → repeat
  - Waiting agent (needs approval): sit at desk with speech bubble "?"
  - Error agent: sit at desk with red indicator
- Agent-to-desk assignment (each C-suite agent has a fixed desk)
- Walking animation frame cycling during movement
**Steal from**: pixel-agents updateCharacter(), findPath(), character state machine
**Delivers**: Agents walk around the office, sit when working, wander when idle. The office feels ALIVE.

### Project 4: Live Data Bridge
**What**: Connect agent behavior to real Zustand/WebSocket data
**Scope**:
- Map session states to agent behavior: working→WORK, idle/paused/done→IDLE, waiting-approval→bubble, error→error indicator
- Subscribe to existing useDashboardStore for session data
- WebSocket events trigger behavior changes (agent starts working → walks to desk → types)
- Directive status reflected on whiteboard (progress bar, phase indicator)
- Report arrival triggers mailbox notification (visual pulse/glow)
- Active session count in game header (already exists, reconnect to Canvas)
- Tool-specific animations: Read/Grep/Glob → reading pose, Edit/Write/Bash → typing pose
**Steal from**: pixel-agents JSONL watching patterns (adapted for our WebSocket); claw-empire real-time sync
**Delivers**: The game reflects reality. When you /directive something, agents visibly react.

### Project 5: CEO Avatar & Controls
**What**: The CEO walks around their office
**Scope**:
- CEO character sprite (special design — crown or star, distinct from agents)
- WASD/arrow key movement with collision detection
- Camera follow (smooth, centered on CEO)
- Walk speed ~7px/frame (matching claw-empire's CEO_SPEED)
- Keyboard input handling (prevent browser defaults, don't steal from other UI)
- Proximity highlight: when CEO is near an interactive object, it glows
- Walking into a zone opens the relevant panel (replaces click-to-select)
**Steal from**: claw-empire officeTicker.ts CEO movement; pixel-agents keyboard handling
**Delivers**: You ARE in the game. Walk around your office.

### Project 6: Interaction Layer
**What**: Game actions that trigger real pipeline effects
**Scope**:
- Walk to agent desk → agent panel slides in (reuse SidePanel)
- Walk to whiteboard → see directives (with progress)
- Walk to mailbox → see reports
- Walk to CEO desk → see pending approvals, sign to approve
- Walk to bell → ring it → triggers /scout
- Walk to conference table → see active directive collaboration
- Speech bubbles for agent responses
- Floating text notifications ("Report received!", "Directive approved!")
- Simple particle effects for working agents (stolen from claw-empire)
**Steal from**: claw-empire meeting visualization, delivery animations; pixel-agents speech bubbles
**Delivers**: Full game loop. CEO walks, interacts, triggers real work.

## Architecture Decisions

1. **Canvas 2D, not PixiJS** — pixel-agents proves Canvas 2D works perfectly for this scale. No WebGL overhead, simpler debugging, no extra dependency.
2. **Programmatic sprites, not asset packs** — Both references do this. Zero asset loading, infinite customization, theme-aware.
3. **Ref-based animation state** — All game loop state in useRef, not useState. No React re-renders during animation frames. (Stolen from claw-empire pattern.)
4. **Full scene rebuild on data change** — Don't try incremental updates. When Zustand data changes, rebuild the scene. Simple, correct, fast enough.
5. **Game and React coexist** — Canvas handles the game world. React handles the side panel and overlays. They share Zustand.

## What NOT to Do

- No game engine framework (Phaser steals keyboard, Unity is overkill)
- No external sprite sheets or paid asset packs (programmatic is better for our case)
- No sound yet (save for a future polish project)
- No drag-and-drop (walk-to-interact is better game design)
- No multiplayer/networking (single CEO, local only)
- No save/load game state (the real state IS the state)

## Success Criteria

After all 6 projects:
- CEO opens /game, sees pixel-art office with agents walking around
- Agents visually reflect real session states (working, idle, waiting, error)
- CEO walks with WASD, camera follows
- Walking to objects opens context panels with real data
- At least one action triggers real pipeline effect (ring bell → /scout, or sign → approve)
- Looks and feels like a real indie game, not a prototype
