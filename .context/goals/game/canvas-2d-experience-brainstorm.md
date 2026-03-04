# Canvas 2D Experience Design
Date: 2026-03-04
Decision: Pixel-Perfect Viewport approach
Participants: Marcus (CPO), CEO

## Context

Transitioning the office simulation game from CSS Grid prototype to Canvas 2D for proper game feel. This is the PRIMARY CEO interface that needs to feel like a real indie game, not a prototype.

**Key Requirements:**
- Professional visual quality that clearly beats CSS Grid
- Smooth pan/zoom that solves CSS Grid's clunky interactions
- Foundation for eventual WASD movement without over-engineering

## Options Considered

**A. Pixel-Perfect Viewport (CHOSEN)**: Game-like camera system with smooth pan/zoom controls, professional viewport experience
**B. Minimal Canvas Upgrade**: Basic Canvas rendering with current interaction model

## Decision: Pixel-Perfect Viewport

Chosen for decisive visual upgrade and smooth interaction feel critical for indie game positioning.

## Implementation Details

### Game Feel Elements
- Agent movement interpolation at 48px/second between tiles (no instant CSS jumps)
- Typing animation frames during work sessions (2-frame loop: head bob + keystroke)
- Wandering behavior with 3-6 tile random walks and 2-20 second pauses
- Pulsing/glowing status indicators instead of static CSS dots
- Fading speech bubbles for agent communication
- Collision detection preventing CEO walking through furniture
- Z-sorted rendering with proper depth occlusion
- Pixel-perfect scaling at integer zoom levels (100%, 200%, 300%)

### Camera System
- **Zoom**: 3 discrete levels via mouse wheel, centers on cursor position
  - 100%: Office navigation and agent overview
  - 200%: Reading speech bubbles and detailed observation
  - 300%: CEO desk interactions and whiteboard reading
- **Pan**: Smooth camera follow with 0.1 lerp factor when CEO moves, middle-mouse drag override

### Visual Polish (No Sprites Phase)
- Programmatic pixel furniture (L-shaped desks, monitors, chairs)
- Distinct agent silhouettes with palette-swapped brand colors
- Furniture shadows using darker pixel outlines for depth
- Screen glow effects on monitors during active work (green tint)
- Pixel-art whiteboard text rendering
- Mailbox notification pulse for reports (red glow animation)
- Walking particle effects (dust clouds on tile transitions)

### Architecture Components
- GameCanvas component with useRef for animation state
- requestAnimationFrame game loop with delta time
- Tile coordinate system with screen-to-world conversion
- Sprite cache using WeakMap for zoom-level optimization
- BFS pathfinding on existing OFFICE_GRID with furniture blocking
- Agent state machine (WORK/IDLE/WALK) integrated with Zustand session data
- Camera viewport system with smooth interpolation
- WASD input handler with proper focus scoping
- Canvas layer composition: background → furniture → agents → UI overlays

### Watch Outs
- Canvas pixel coordinates vs CSS coordinates - DPI scaling consistency
- Performance on large grids - implement viewport culling
- Keyboard conflicts - scope game controls to canvas focus only
- Agent pathfinding deadlocks - implement queuing/avoidance
- Window resize handling - preserve agent positions
- Animation timing across refresh rates - use delta time
- Memory leaks from sprite caching - implement LRU eviction
- Blurry rendering - enforce pixel-perfect scaling boundaries
- Game/data disconnection - ensure WebSocket changes trigger visual updates

## Next Steps

This design provides the foundation for Canvas 2D implementation. Ready for /directive execution to build the pixel-perfect viewport system.