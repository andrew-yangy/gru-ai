# Riley Kim — Frontend Dev Memory

## Game/HQ Module (Phase 1)
- Files: `src/components/game/{types,office-layout,OfficeGrid,SidePanel,GameHeader,GamePage}.tsx`
- 20x14 grid, 40px tiles, CSS grid (no Canvas)
- Route: `/game`, sidebar item "HQ" with Building2 icon (2nd position)
- Data flows from useDashboardStore: sessions → agentStatuses, directiveState, workState
- Known agents: Alex, Sarah, Morgan, Marcus, Priya — matched by Session.agentName
- Session status → AgentStatus mapping: working→working, waiting-*→waiting, idle/paused/done→idle, error→error

## Game Engine (Phase 2 — Renderer)
- Engine files: `src/components/game/engine/{renderer,rooms,types,color-utils,sprites}.ts`
- `color-utils.ts`: blendHexColors, hexWithAlpha, darkenHex, lightenHex — CSS hex string ops
- `TileRenderOpts` carries grid/row/col for neighbor-aware wall rendering (auto-tiling bitmask)
- Wall bitmask: bit0=N, bit1=E, bit2=S, bit3=W; exposedNorth/South drive lighting/baseboard effects
- Floor: 2x2 checkerboard per tile (even=floorColor, odd=darken 6%), per-quadrant edge strokes
- resolveRoomAt() also used in renderWall to get adjacent room palette for baseboard color
- Room palettes in rooms.ts: conference=blue, ceo-office=gold, open-office=warm stone, lobby=gray-blue

## Game Engine (Phase 3 — Rich Multi-Layer Furniture)
- All 8 furniture renderers rewritten with 25-40 line procedural detail each
- Pattern: triple-layer wood shading (base → darken for shadow, lighten for highlight)
- Top-left light source convention: highlight on top/left edges, shadow on bottom/right
- ctx.arc() for circles (coffee mug, magnets, rivets, LED dots, doorknob, bell vibration)
- ctx.quadraticCurveTo() for curves (steam wisps on mug, wavy whiteboard writing)
- hexWithAlpha/darkenHex/lightenHex from color-utils used for all shading effects
- Desk: grain lines, monitor with IDE code lines, keyboard with keycap grid, coffee mug+steam, paper stack
- CEO Desk: mahogany grain, dual monitors (bars+chart), leather pad, gold nameplate, pen holder, trophy
- Conference: polished table with center reflection, 6 chairs with cushions, notepads, water glass, plant
- Whiteboard: beveled aluminum frame, wavy colored writing, circle magnets, marker tray+eraser
- Mailbox: rounded top cap, rivets (arc), shadow-depth slot, red flag, MAIL label, stand+base
- Bell: brass dome with per-section highlight/shadow, specular streak, vibration arcs, pedestal
- Server: ambient blue glow, frame with vent holes, round LED dots+glow, temp gauge, colored cables
- Door: transom window, grain lines, recessed panels with inset shadows, brass arc knob, green indicator

## Game Engine (Phase 4 — Multi-Frame Directional Character Sprites)
- Complete rewrite of `src/components/game/engine/sprites.ts`
- 3 body templates: A (male flat-top: Alex, Marcus), B (female flowing hair: Sarah, Priya), C (male swept: Morgan)
- Template system: H/K/S/P/O/E/A/_ placeholders in 16x24 2D string arrays
- AgentPalette interface: hair, skin, shirt, pants, shoes, eyes, accent
- 8 animation frames per template: idleFront, walkFront[4], idleSide, sitFront, type[2]
- AnimState matches animation.ts: 'idle' | 'walk' | 'typing' | 'sitting' (NOT 'sit'/'type')
- Direction: 'front' | 'left' | 'right' | 'back'
- Left-facing sprites derived via flipHorizontal() on right-facing side templates
- Cache key: `{name}-{anim}-{normalizedFrame}-{direction}`
- getAgentSprite(name, animName?, frame?, direction?) -- backward compatible with string params
- Type guards (isValidAnimState, isValidDirection) handle the string inputs from animation.ts
- getOutlineSprite() expands opaque pixels by 1px cardinal (returns 18x26 array)
- Renderer passes opts.animState?.animName, .frame, .direction from AnimationState

## Patterns Confirmed
- `npx tsc --noEmit` for type check (never `npm run lint` — OOMs)
- `npx vite build` for production build verification
- Lazy-load pages in router.tsx, default export
- Sidebar nav items: `{ to, icon, label, end? }` in navItems array
- Always use Zustand selectors: `useDashboardStore((s) => s.field)`
- shadcn/ui Badge does NOT have a typed `variant` prop for custom colors — use `className` with cn()
