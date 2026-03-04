# Plan for Approval: Canvas 2D Engine Core

## TL;DR

- **What**: Replace the CSS Grid office renderer with a Canvas 2D game engine -- same visual appearance, adds zoom/pan, establishes foundation for sprites and AI movement
- **Scope**: 1 initiative (moderate complexity), 6 tasks in sequence
- **Risk**: Low -- the 20x14 grid is trivially small for Canvas 2D, patterns are proven (pixel-agents repo, 2.7k stars)
- **Cast**: Riley builds, Sarah reviews architecture, Marcus reviews product/UX
- **Needs your call**: Approve to proceed with execution

## Brainstorm Synthesis

**Sarah (CTO) -- architecture:**
- Use `store.getState()` in rAF loop, never `useStore()` hooks -- prevents React re-render/game-loop conflict
- Camera module must be pure math (no state, no React imports). Camera state lives in useRef inside the component.
- Add dirty flag -- do not render 60fps unconditionally. Set dirty on camera move, selection change, data update. Idle CPU near zero.
- HiDPI/DPR scaling is mandatory: `canvas.width = cssWidth * dpr`, then `ctx.scale(dpr, dpr)`. Without this, pixel art is blurry on Retina.
- Do NOT create game-loop.ts as separate module -- fold rAF logic into component useEffect. Extract only when complexity demands it.
- Renderer should use dispatch table pattern: `TILE_RENDERERS[tileType](ctx, x, y, opts)` to avoid monolithic render function.

**Marcus (CPO) -- product/UX:**
- Zoom must anchor to mouse cursor position, not viewport center. Users expect "zoom into where I'm pointing."
- Show zoom level indicator (small badge in corner).
- Click feedback: track mousedown/mouseup for visual pressed state. Canvas has no `:active` pseudoclass.
- Hover hit-testing in `mousemove` handler directly -- not throttled. Must feel instant.
- Cursor style must be manually managed (`canvas.style.cursor = 'pointer'` on interactive tiles).
- Selected tile must stay highlighted when side panel is open (already works via prop, just render it).

**Priya (CMO) -- positioning:**
- "HQ" name is correct -- one syllable, serious, scales.
- The hook is watching real work happen inside a game. Demo mode with canned data would be valuable later.
- Position as spatial interface for AI orchestration, not a gimmick. Dashboard stays primary.

## Risk & Scope Assessment

**Risks (ranked):**
1. **State boundary confusion** -- rAF loop reading stale React state. Mitigation: `getState()` pattern enforced, Sarah reviews.
2. **HiDPI scaling bugs** -- blurry canvas on Retina if DPR not handled. Mitigation: explicit in build spec, audit verified DOM lib available.
3. **Zoom anchor math** -- cursor-anchored zoom requires offset adjustment. Mitigation: integer zoom (1-4x) simplifies math, Marcus verifies feel.
4. **Emoji rendering in Canvas** -- `ctx.fillText` for tile icons has inconsistent sizing across OS/browser. Mitigation: test on macOS Chrome/Safari, use fixed offsets.
5. **Accessibility regression** -- Canvas is a black box to screen readers. Mitigation: deferred to follow-up (hidden DOM overlay). Sighted users unaffected.

**Over-engineering flags:**
- No spatial hash, culling, or draw-call optimization -- 280 tiles is nothing
- No generic game engine abstraction -- build exactly what this game needs
- No separate game-loop.ts module yet -- fold into component

## Technical Audit Findings

**Store interface**: CanvasOffice can take the exact same 3 props as OfficeGrid (`selectedPosition`, `onTileClick`, `agentStatuses`). Zero GamePage changes beyond import swap.

**TypeScript**: `tsconfig.app.json` has `lib: ['ES2022', 'DOM']` -- all Canvas APIs available. `strict:true` requires null-check on `getContext('2d')`. `erasableSyntaxOnly` means no enums -- use const objects. `verbatimModuleSyntax` requires `import type` for type-only imports.

**Color map** (extracted from current Tailwind classes):
| TileType | Tailwind | Hex (light) |
|----------|----------|-------------|
| floor | bg-stone-100 | #f5f5f4 |
| wall | bg-stone-600 | #57534e |
| desk | bg-amber-100 | #fef3c7 |
| ceo-desk | bg-yellow-100 | #fef9c3 |
| conference | bg-blue-50 | #eff6ff |
| whiteboard | bg-white | #ffffff |
| mailbox | bg-red-100 | #fee2e2 |
| bell | bg-yellow-200 | #fef08a |
| server-room | bg-emerald-100 | #d1fae5 |
| door | bg-amber-300 | #fcd34d |

Agent dots: blue=#3b82f6, purple=#a855f7, green=#10b981, orange=#f97316, pink=#ec4899
Status dots: working=#22c55e, waiting=#eab308, idle=#9ca3af, error=#ef4444, offline=#d1d5db
Selection ring: #3b82f6 (2px stroke). Hover ring: #60a5fa (2px stroke).

**Canvas buffer**: At 4x zoom + 2x DPR = 6400x4480 pixels. Under browser limit (16384x16384) but large enough to justify dirty-flag optimization.

**Grid data**: `OFFICE_GRID` is a static 2D array computed at module load -- safe to read in rAF loop. `INTERACTIVE_TILES` is a Set -- use for hit-test membership checks.

## Execution Plan

### Task Breakdown (ordered, single builder)

**T1 -- Engine types** (~15 min)
Create `src/components/game/engine/types.ts`: `CameraState` (zoom, offsetX, offsetY), `RenderState` (grid ref, agents, selection, hover), tile hit result type.

**T2 -- Camera math** (~30 min)
Create `src/components/game/engine/camera.ts`: pure functions only, no state.
- `worldToScreen(row, col, camera, tileSize)` -> {x, y}
- `screenToTile(px, py, camera, tileSize)` -> {row, col}
- `clampToBounds(camera, gridW, gridH, viewW, viewH)` -> CameraState
- `fitToView(gridW, gridH, viewW, viewH)` -> CameraState
- `zoomAtPoint(camera, direction, mouseX, mouseY, viewW, viewH)` -> CameraState

**T3 -- Input translator** (~20 min)
Create `src/components/game/engine/input.ts`: maps raw DOM events to semantic actions. Returns plain objects. Handles drag detection (delta < 4px = click, not pan).

**T4 -- Renderer** (~1.5 hrs)
Create `src/components/game/engine/renderer.ts`:
- `render(ctx, state, camera, tileSize)` entry point
- Dispatch table `TILE_RENDERERS[tileType]` for per-tile rendering
- Tile fills with hex colors from color map above
- Agent brand-color dots + status dots on desk tiles
- Tile icons via `ctx.fillText` (star, T, W, emojis, SRV, agent initials)
- Selection highlight (2px blue stroke) and hover highlight (2px lighter stroke)
- Zoom level badge value returned for overlay

**T5 -- CanvasOffice component** (~2 hrs)
Create `src/components/game/CanvasOffice.tsx`:
- Props: same as OfficeGridProps (`selectedPosition`, `onTileClick`, `agentStatuses`)
- `useRef` for canvas element, camera state, dirty flag, rAF handle, drag state
- ResizeObserver on canvas parent -> recompute dimensions, `canvas.width/height = css * dpr`, `ctx.scale(dpr, dpr)`, mark dirty
- rAF loop in useEffect: check dirty flag, call `render()`, clear flag. Read `agentStatuses` from latest props via ref.
- Mouse handlers: wheel -> integer zoom (1-4x) anchored to cursor, mousemove -> hover hit-test + cursor style, mousedown/mousemove/mouseup -> drag pan (clamp bounds) or click (if delta < 4px)
- `imageSmoothingEnabled = false` set on every resize
- Default zoom via `fitToView` on mount and resize
- Zoom level badge as absolute-positioned div overlay

**T6 -- Wire into GamePage** (~10 min)
Swap `<OfficeGrid>` for `<CanvasOffice>` in GamePage.tsx. Same props. SidePanel and GameHeader untouched.

### Cast

| Role | Agent | Scope |
|------|-------|-------|
| Builder | **Riley** | T1-T6, all engine modules + CanvasOffice + GamePage |
| Architecture review | **Sarah** | engine module boundaries, rAF/store pattern, DPR handling |
| Product review | **Marcus** | zoom UX, click feedback, cursor management, selection persistence |

### Active Files

| Action | File |
|--------|------|
| CREATE | `src/components/game/engine/types.ts` |
| CREATE | `src/components/game/engine/camera.ts` |
| CREATE | `src/components/game/engine/input.ts` |
| CREATE | `src/components/game/engine/renderer.ts` |
| CREATE | `src/components/game/CanvasOffice.tsx` |
| MODIFY | `src/components/game/GamePage.tsx` |
| READ-ONLY | `src/components/game/OfficeGrid.tsx` (reference for colors/behavior) |
| READ-ONLY | `src/components/game/types.ts` (shared types) |
| READ-ONLY | `src/components/game/office-layout.ts` (grid data) |
| READ-ONLY | `src/components/game/SidePanel.tsx` (props interface) |

### Definition of Done

1. CanvasOffice.tsx renders the 20x14 office grid on Canvas with tile colors matching current CSS Grid
2. Agent desks show colored dots (brand color) and status dots matching current OfficeGrid
3. Mouse click on interactive tiles fires onTileClick with correct (row, col, tileType)
4. Scroll wheel zooms in integer steps (1x-4x) with pixel-perfect rendering
5. Mouse drag pans camera, constrained to office bounds
6. Canvas auto-sizes via ResizeObserver, default zoom fits full office
7. Hover over interactive tiles shows visual highlight
8. `npx tsc --noEmit` and `npx vite build` pass with zero errors

### Verification

1. `npx tsc --noEmit` -- zero errors
2. `npx vite build` -- zero errors
3. Visual: /game shows 20x14 grid with colors matching OfficeGrid (needs CEO eyes)
4. Click agent desk -> side panel opens with correct agent (needs CEO eyes)
5. Scroll wheel zoom: snaps 1x->2x->3x->4x, anchored to cursor (needs CEO eyes)
6. Drag pan: smooth, cannot scroll past office bounds (needs CEO eyes)
7. Hover: interactive tiles show highlight, cursor changes to pointer (needs CEO eyes)
8. Resize window: canvas reflows, no blurriness on Retina (needs CEO eyes)

## Follow-ups (from audit)

| Action | Risk | Notes |
|--------|------|-------|
| Add keyboard accessibility overlay for screen readers | Medium | Hidden DOM buttons over interactive tiles. Defer. |
| Add debug mode toggle (grid lines, coord labels) | Low | Dev convenience. Auto-execute in build. |
| Delete OfficeGrid.tsx after visual verification | Low | Dead code cleanup post-CEO-verify. |
| Dark mode color map | Low | Current hex values are light-mode only. Add dark variants when theme support needed. |
