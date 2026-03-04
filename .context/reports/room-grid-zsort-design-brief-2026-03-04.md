# Design Brief: Room Grid Data Model + Z-Sort Rendering Pipeline

**Author:** Sarah Chen, CTO
**For:** Riley (builder)
**Initiative:** Visual Quality Overhaul — Initiative 1
**Date:** 2026-03-04

---

## 1. Orientation

The current renderer (`src/components/game/engine/renderer.ts`) draws every tile type directly to `ctx` in row-major scan order. This is correct for a pure top-down view but wrong for a game where objects closer to the viewer (larger row index) must visually occlude objects farther away (smaller row index). Today all furniture, sprites, and props paint in the same forward pass with no depth sorting.

This brief specifies three concrete deliverables:

1. A `rooms.ts` file that partitions the 20x14 grid into named zones.
2. A `ZDrawable` interface and the z-sort pass inside `render()`.
3. A `TileRenderOpts` extension that carries room data down to individual renderers.

The `CanvasOffice.tsx` call signature does NOT change. All changes are internal to the engine.

---

## 2. Room Type Definition

### 2.1 File location

Create a new file: `src/components/game/engine/rooms.ts`

Do NOT put room data in `office-layout.ts`. That file owns the raw character grid. Room zones are a derived, semantic layer on top of it.

### 2.2 `Department` union type

```typescript
export type Department =
  | 'open-office'
  | 'ceo-office'
  | 'conference'
  | 'server-room'
  | 'lobby';
```

These are the logical zones distinguishable from the current layout. Do not invent zones that have no furniture evidence in the RAW_LAYOUT. Each string value is the canonical department identifier used in palette resolution.

### 2.3 `RoomBounds` interface

```typescript
export interface RoomBounds {
  rowStart: number;  // inclusive
  rowEnd:   number;  // inclusive
  colStart: number;  // inclusive
  colEnd:   number;  // inclusive
}
```

Bounds are in grid coordinates (row, col). They are rectangular. Rooms may share wall tiles at their edges — walls are NOT exclusive to a room.

### 2.4 `RoomPalette` interface

```typescript
export interface RoomPalette {
  floorColor: string;  // CSS hex color for the floor fill in this room
  groutColor: string;  // CSS hex color for the grout seam lines
}
```

Keep it concrete and simple. Do NOT use abstract HSB values that require math at render time. The floor renderer does a direct color lookup from `RoomPalette` — no conversion needed.

### 2.5 `Room` interface

```typescript
export interface Room {
  id:         string;      // unique kebab-case, matches Department value
  department: Department;
  bounds:     RoomBounds;
  palette:    RoomPalette;
}
```

Export this interface from `rooms.ts`.

---

## 3. Room Zone Definitions (Derived from office-layout.ts)

The RAW_LAYOUT is the ground truth. Reading it character by character:

```
Row 0:  ####################   perimeter wall
Row 1:  #..................#   interior
Row 2:  #..TTT.........CC.R#  T=conference (cols 3-5), C=ceo (cols 15-16), R=server (col 19)
Row 3:  #..TTT.........CC..#  T=conference (cols 3-5), C=ceo (cols 15-16)
Row 4:  #..........A.......#  A=Alex desk (col 11)
Row 5:  #..................#
Row 6:  #....S.........M..W#  S=Sarah (col 5), M=Morgan (col 15), W=whiteboard (col 19)
Row 7:  #..................#
Row 8:  #..................#
Row 9:  #.......X.....P....#  X=Marcus (col 8), P=Priya (col 14)
Row 10: #..................#
Row 11: #..................#
Row 12: #.B......D.....L..##  B=mailbox (col 2), D=door (col 9), L=bell (col 15)
Row 13: ####################   perimeter wall
```

### 3.1 Room boundary table

Riley must use exactly these values in the ROOMS array:

| id | rowStart | rowEnd | colStart | colEnd | Notes |
|----|----------|--------|----------|--------|-------|
| `server-room` | 2 | 2 | 19 | 19 | Single tile. Col 19 row 2 only. |
| `ceo-office` | 2 | 3 | 15 | 16 | C tiles at (2,15),(2,16),(3,15),(3,16). NOT col 19. |
| `conference` | 2 | 3 | 3 | 5 | T tiles at (2,3..5),(3,3..5). |
| `lobby` | 12 | 12 | 1 | 18 | Full bottom interior row — mailbox, door, bell live here. |
| `open-office` | 1 | 11 | 1 | 18 | Large interior region. Checked LAST; more-specific rooms overlap it. |

The perimeter walls (row 0, row 13, col 0, col 19 except the server room tile) are not assigned to any room. `resolveRoomAt` returns `undefined` for these.

### 3.2 Room palette values

```typescript
// server-room palette intentionally dark — renderServerRoom overpaints its
// own background anyway, so the palette only affects edge tiles if any.
const ROOM_PALETTES: Record<Department, RoomPalette> = {
  'open-office': { floorColor: '#f5f5f4', groutColor: '#e7e5e4' },
  'conference':  { floorColor: '#eef2ff', groutColor: '#dde6f8' },
  'ceo-office':  { floorColor: '#fdfcf0', groutColor: '#ede9d0' },
  'server-room': { floorColor: '#1a2330', groutColor: '#141c27' },
  'lobby':       { floorColor: '#f0f0ef', groutColor: '#e2e2e1' },
};
```

Place this map inside `rooms.ts` as a module-private constant. It is consumed only during ROOMS array construction — do not export it.

---

## 4. `rooms.ts` Export Specification

### 4.1 `ROOMS` constant

```typescript
export const ROOMS: readonly Room[] = [ ... ];
```

An ordered array of all room definitions. Order is critical for `resolveRoomAt`: more-specific rooms must appear BEFORE `open-office` because `open-office`'s bounding box fully contains the conference, ceo-office, server-room, and lobby coordinate ranges.

Required order:
1. `server-room`
2. `ceo-office`
3. `conference`
4. `lobby`
5. `open-office`

### 4.2 `resolveRoomAt` function

```typescript
export function resolveRoomAt(row: number, col: number): Room | undefined
```

Contract:
- Iterates `ROOMS` in declaration order.
- Returns the first `Room` where all four bounds conditions are satisfied: `row >= bounds.rowStart && row <= bounds.rowEnd && col >= bounds.colStart && col <= bounds.colEnd`.
- Returns `undefined` if no room matches (wall tiles, perimeter, out-of-bounds).
- O(n) where n = 5. No caching required.

Do NOT call `resolveRoomAt` per-pixel. It is called once per visible tile per frame — at most 280 calls on a 20x14 grid. It is fast enough.

### 4.3 Verification cases (Riley must validate these manually)

| Call | Expected result |
|------|----------------|
| `resolveRoomAt(2, 19)` | server-room |
| `resolveRoomAt(2, 15)` | ceo-office |
| `resolveRoomAt(2, 3)` | conference |
| `resolveRoomAt(12, 9)` | lobby (door tile is in lobby row) |
| `resolveRoomAt(4, 11)` | open-office (Alex's desk) |
| `resolveRoomAt(6, 5)` | open-office (Sarah's desk) |
| `resolveRoomAt(0, 0)` | undefined (top-left wall) |
| `resolveRoomAt(13, 0)` | undefined (bottom-left wall) |

---

## 5. `ZDrawable` Interface

### 5.1 Where it lives

Add to `src/components/game/engine/types.ts`, alongside the existing `CameraState` interface. Do not create a new file for it.

### 5.2 Definition

```typescript
export interface ZDrawable {
  /**
   * World-space Y coordinate for painter's-algorithm sorting.
   * Set to the bottom edge of the object's visual footprint:
   * (row + 1) * tileSize for single-tile objects.
   * Objects with smaller zY are drawn first (appear behind).
   */
  zY:   number;
  /**
   * Draws this object onto ctx. The camera transform is already applied
   * before any draw() calls are issued — do not apply transforms here.
   */
  draw: (ctx: CanvasRenderingContext2D) => void;
}
```

### 5.3 Which renderers become ZDrawable producers

| Renderer function | Gets ZDrawable wrapping? | Reason |
|---|---|---|
| `renderFloor` | NO | Always behind everything; drawn directly in Pass 1 |
| `renderWall` | NO | Walls render at their tile position; they do not need z-sorting relative to furniture in the current top-down layout. A wall tile always shares row 0 or the perimeter — never behind a character. |
| `renderDoor` | NO | Door is set into a wall tile (row 12); no object in front of it |
| `renderDesk` | YES | Sprites and desk surfaces can be occluded by sprites in a lower row |
| `renderCeoDesk` | YES | Same |
| `renderConference` | YES | Table furniture has implied height |
| `renderWhiteboard` | YES | Projects forward from wall |
| `renderMailbox` | YES | 3D prop on the floor |
| `renderBell` | YES | 3D prop on the floor |
| `renderServerRoom` | YES | Equipment with vertical extent |

### 5.4 zY calculation rule

For ALL single-tile objects: `zY = (row + 1) * tileSize`

This places the sort key at the BOTTOM of the tile — consistent with the painter's algorithm convention that objects whose base is lower on screen are drawn in front.

The conference table tiles span rows 2 and 3 in the current layout. But because the renderer is called once per tile cell (not once per object), each conference tile naturally receives its own row-based zY. No special multi-tile handling is needed.

---

## 6. `TileRenderOpts` Extension

### 6.1 Current definition (renderer.ts lines 53–57)

```typescript
interface TileRenderOpts {
  agentName?:  string;
  brandColor?: string;
  statusColor?: string;
}
```

### 6.2 Extended definition

```typescript
interface TileRenderOpts {
  agentName?:   string;
  brandColor?:  string;
  statusColor?: string;
  room?:        Room;  // add import: import type { Room } from './rooms';
}
```

The `room` field is optional and may be `undefined` for wall tiles and perimeter tiles.

### 6.3 Where `room` gets populated in render()

In the current render loop body (renderer.ts around lines 540–554), opts is only constructed for desk tiles. This must change. For every visible tile:

```typescript
const room = resolveRoomAt(row, col);
let opts: TileRenderOpts | undefined = { room };

if (tileType === 'desk') {
  const name = agentNameAt(row, col);
  if (name) {
    const agent = agentByName.get(name);
    opts = {
      ...opts,
      agentName:   name,
      brandColor:  agent ? (AGENT_BRAND_COLORS[agent.color] ?? '#9ca3af') : '#9ca3af',
      statusColor: STATUS_DOT_COLORS[agentStatuses[name] ?? 'offline'],
    };
  }
}
```

Always initialise `opts` with `{ room }`. Spread additional fields for desk tiles on top. This ensures floor renderers always receive room data.

---

## 7. `render()` Refactor Plan — Step by Step

### 7.1 Current structure reference

```
Lines 500–508:  function signature
Lines 509–518:  logical dimension calculations
Lines 519–524:  clear + camera save + translate + scale
Lines 525–529:  visible tile range computation (culling)
Lines 531–556:  tile draw loop
Lines 558–585:  hover/selection highlights
Lines 586–589:  ctx.restore()
```

### 7.2 New tile loop structure (replaces lines 531–556)

The loop header stays the same. The body changes from:

```typescript
// BEFORE (single-pass direct draw)
for (let row = startRow; row <= endRow; row++) {
  for (let col = startCol; col <= endCol; col++) {
    const tileType = grid[row]?.[col];
    if (!tileType) continue;
    const x = col * tileSize;
    const y = row * tileSize;
    // ... build opts ...
    TILE_RENDERERS[tileType](ctx, x, y, tileSize, opts);
  }
}
```

To:

```typescript
// AFTER (two-pass: floor direct, everything else deferred)
const drawables: ZDrawable[] = [];

for (let row = startRow; row <= endRow; row++) {
  for (let col = startCol; col <= endCol; col++) {
    const tileType = grid[row]?.[col];
    if (!tileType) continue;

    const x = col * tileSize;
    const y = row * tileSize;

    // Build opts (room always, desk fields conditionally)
    const room = resolveRoomAt(row, col);
    let opts: TileRenderOpts = { room };

    if (tileType === 'desk') {
      const name = agentNameAt(row, col);
      if (name) {
        const agent = agentByName.get(name);
        opts = {
          ...opts,
          agentName:   name,
          brandColor:  agent ? (AGENT_BRAND_COLORS[agent.color] ?? '#9ca3af') : '#9ca3af',
          statusColor: STATUS_DOT_COLORS[agentStatuses[name] ?? 'offline'],
        };
      }
    }

    // Pass 1: floor tiles draw directly
    if (tileType === 'floor') {
      renderFloor(ctx, x, y, tileSize, opts);
      continue;
    }

    // Wall and door render directly (no z-sort benefit in current layout)
    if (tileType === 'wall' || tileType === 'door') {
      TILE_RENDERERS[tileType](ctx, x, y, tileSize, opts);
      continue;
    }

    // Pass 2: everything else is deferred for z-sort
    const capturedType = tileType;
    const capturedOpts = opts;
    const capturedX    = x;
    const capturedY    = y;
    drawables.push({
      zY:   (row + 1) * tileSize,
      draw: (c) => TILE_RENDERERS[capturedType](c, capturedX, capturedY, tileSize, capturedOpts),
    });
  }
}

// Sort by zY ascending — objects with smaller Y (farther from viewer) draw first
drawables.sort((a, b) => a.zY - b.zY);

// Draw all deferred objects in sorted order
for (const drawable of drawables) {
  drawable.draw(ctx);
}
```

IMPORTANT: The closure variables `capturedType`, `capturedOpts`, `capturedX`, `capturedY` must be declared with `const` inside the loop body to avoid closure-over-loop-variable bugs. Do not capture `tileType`, `x`, `y`, or `opts` directly in the closure — capture the re-assigned consts.

### 7.3 `renderFloor` signature change

The floor renderer must accept `opts` to read room palette. Change the signature from:

```typescript
function renderFloor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void
```

To:

```typescript
function renderFloor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opts?: TileRenderOpts): void
```

This matches the `TileRenderer` type, which already has `opts?` as the fifth parameter. The TILE_RENDERERS dispatch table does not need to change — `TileRenderer` already accepts optional opts.

Inside `renderFloor`, replace the hardcoded `'#f5f5f4'` and `'#e7e5e4'` with values from `opts?.room?.palette`:

```typescript
const floorColor = opts?.room?.palette.floorColor ?? '#f5f5f4';
const groutColor = opts?.room?.palette.groutColor ?? '#e7e5e4';
```

No other changes to `renderFloor`.

### 7.4 Imports to add at the top of renderer.ts

```typescript
import { resolveRoomAt } from './rooms';
import type { Room } from './rooms';
import type { ZDrawable } from './types';
```

---

## 8. CanvasOffice.tsx — No Changes

The `render()` function signature in renderer.ts is NOT changing. CanvasOffice.tsx line 131 calls:

```typescript
render(
  ctx,
  OFFICE_GRID,
  cameraRef.current,
  TILE_SIZE,
  propsRef.current.agentStatuses,
  propsRef.current.selectedPosition,
  hoverRef.current,
);
```

This call is unchanged. Do not modify CanvasOffice.tsx.

---

## 9. What Riley Must NOT Do (Scope Boundary)

- Do NOT change `CanvasOffice.tsx`.
- Do NOT change `office-layout.ts`, `sprites.ts`, or `camera.ts`.
- Do NOT add isometric projection. The camera remains top-down. Z-sorting is painter's algorithm only.
- Do NOT add room name labels or visual overlays to the canvas.
- Do NOT modify sprite rendering. The `drawImage` call inside `renderDesk` is unchanged.
- Do NOT add a collision system. Rooms are visual/semantic metadata only.
- Do NOT add a `corridor` department. The layout does not have a dedicated corridor zone.

---

## 10. Acceptance Criteria

Riley self-checks in order:

1. `src/components/game/engine/rooms.ts` exists and compiles.
2. It exports: `Department`, `RoomBounds`, `RoomPalette`, `Room`, `ROOMS`, `resolveRoomAt`.
3. `ROOMS.length === 5`.
4. `ROOMS[0].id === 'server-room'` and `ROOMS[4].id === 'open-office'` (order enforced).
5. All 8 verification cases in section 4.3 return correct results.
6. `src/components/game/engine/types.ts` exports `ZDrawable`.
7. `renderer.ts` imports `resolveRoomAt` and `ZDrawable`.
8. `TileRenderOpts` has the `room?: Room` field.
9. `renderFloor` accepts `opts?: TileRenderOpts` and uses `opts?.room?.palette`.
10. The tile loop in `render()` performs: floor direct-draw, wall/door direct-draw, deferred collection, sort, draw.
11. The closure variables inside the deferred push use captured `const` bindings, not the loop variable directly.
12. `npm run type-check` passes with zero errors.
13. The CanvasOffice render call at `CanvasOffice.tsx:131` is byte-for-byte unchanged.
14. Visual smoke test: conference room floor tiles are faintly blue-tinted vs. open-office warm stone.

---

## 11. File Inventory

| File | Action |
|---|---|
| `src/components/game/engine/rooms.ts` | CREATE — new rooms data model |
| `src/components/game/engine/types.ts` | MODIFY — add `ZDrawable` interface |
| `src/components/game/engine/renderer.ts` | MODIFY — extend `TileRenderOpts`, refactor render loop, fix `renderFloor` signature |
| `src/components/game/CanvasOffice.tsx` | NO CHANGE |
| `src/components/game/office-layout.ts` | NO CHANGE |
| `src/components/game/engine/sprites.ts` | NO CHANGE |
| `src/components/game/engine/camera.ts` | NO CHANGE |
