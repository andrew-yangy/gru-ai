import { TileType, TILE_SIZE, CharacterState } from '../pixel-types'
import type { TileType as TileTypeVal, FurnitureInstance, Character, SpriteData, Seat, FloorColor } from '../pixel-types'
import { getCachedSprite, getOutlineSprite } from '../sprites/spriteCache'
import { getCharacterSprites, BUBBLE_PERMISSION_SPRITE, BUBBLE_WAITING_SPRITE, BUBBLE_CHAT_SPRITE } from '../sprites/spriteData'
import { STATUS_ICON_SPRITES } from '../sprites/statusIcons'
import { getCharacterSprite } from './characters'
import { renderMatrixEffect } from './matrixEffect'
import { getColorizedFloorSprite, hasFloorSprites, WALL_COLOR } from '../floorTiles'
import { hasWallSprites, getWallInstances, wallColorToHex } from '../wallTiles'
import { hasTilesetCache, getScaledTileCanvas } from '../tilesetCache'
import { renderBitmapText, measureBitmapText } from '../sprites/bitmapFont'
import type { AgentStatus } from '../types'
import {
  CHARACTER_SITTING_OFFSET_PX,
  CHARACTER_Z_SORT_OFFSET,
  OUTLINE_Z_SORT_OFFSET,
  SELECTED_OUTLINE_ALPHA,
  HOVERED_OUTLINE_ALPHA,
  GHOST_PREVIEW_SPRITE_ALPHA,
  GHOST_PREVIEW_TINT_ALPHA,
  SELECTION_DASH_PATTERN,
  BUTTON_MIN_RADIUS,
  BUTTON_RADIUS_ZOOM_FACTOR,
  BUTTON_ICON_SIZE_FACTOR,
  BUTTON_LINE_WIDTH_MIN,
  BUTTON_LINE_WIDTH_ZOOM_FACTOR,
  BUBBLE_FADE_DURATION_SEC,
  BUBBLE_SITTING_OFFSET_PX,
  BUBBLE_VERTICAL_OFFSET_PX,
  FALLBACK_FLOOR_COLOR,
  SEAT_OWN_COLOR,
  SEAT_AVAILABLE_COLOR,
  SEAT_BUSY_COLOR,
  GRID_LINE_COLOR,
  VOID_TILE_OUTLINE_COLOR,
  VOID_TILE_DASH_PATTERN,
  GHOST_BORDER_HOVER_FILL,
  GHOST_BORDER_HOVER_STROKE,
  GHOST_BORDER_STROKE,
  GHOST_VALID_TINT,
  GHOST_INVALID_TINT,
  SELECTION_HIGHLIGHT_COLOR,
  DELETE_BUTTON_BG,
  ROTATE_BUTTON_BG,
  NAME_LABEL_VERTICAL_OFFSET_PX,
  NAME_LABEL_SITTING_OFFSET_PX,
  IDENTITY_PLATE_PAD_X,
  IDENTITY_PLATE_PAD_Y,
  IDENTITY_PLATE_BG_ALPHA,
  IDENTITY_PLATE_HEIGHT,
  STATUS_ICON_GAP_PX,
  CEO_CROWN_COLOR,
  CEO_GLOW_ALPHA,
  COLLISION_FLASH_DURATION_SEC,
  COLLISION_FLASH_COLOR,
  PROXIMITY_HIGHLIGHT_BASE_ALPHA,
  PROXIMITY_HIGHLIGHT_PULSE_AMPLITUDE,
  PROXIMITY_HIGHLIGHT_PULSE_SPEED,
} from '../constants'

// ── CEO crown sprite (7x5 pixel art, gold tones) ───────────────
const CEO_CROWN_SPRITE: SpriteData = [
  ['',        '#FFD700', '',        '#FFD700', '',        '#FFD700', ''],
  ['',        '#FFD700', '#FFC000', '#FFD700', '#FFC000', '#FFD700', ''],
  ['#FFD700', '#FFD700', '#FFC000', '#FFD700', '#FFC000', '#FFD700', '#FFD700'],
  ['#FFD700', '#FFC000', '#FFD700', '#FFC000', '#FFD700', '#FFC000', '#FFD700'],
  ['#DAA520', '#DAA520', '#DAA520', '#DAA520', '#DAA520', '#DAA520', '#DAA520'],
]

// ── Gold outline sprite generation ─────────────────────────────
const goldOutlineCache = new WeakMap<SpriteData, SpriteData>()

/** Generate a 1px gold outline SpriteData (2px larger in each dimension) */
function getGoldOutlineSprite(sprite: SpriteData): SpriteData {
  const cached = goldOutlineCache.get(sprite)
  if (cached) return cached

  const rows = sprite.length
  const cols = sprite[0].length
  const outline: string[][] = []
  for (let r = 0; r < rows + 2; r++) {
    outline.push(new Array<string>(cols + 2).fill(''))
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] === '') continue
      const er = r + 1
      const ec = c + 1
      if (outline[er - 1][ec] === '') outline[er - 1][ec] = CEO_CROWN_COLOR
      if (outline[er + 1][ec] === '') outline[er + 1][ec] = CEO_CROWN_COLOR
      if (outline[er][ec - 1] === '') outline[er][ec - 1] = CEO_CROWN_COLOR
      if (outline[er][ec + 1] === '') outline[er][ec + 1] = CEO_CROWN_COLOR
    }
  }

  // Clear pixels that overlap with original opaque pixels
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] !== '') {
        outline[r + 1][c + 1] = ''
      }
    }
  }

  goldOutlineCache.set(sprite, outline)
  return outline
}

// ── Render functions ────────────────────────────────────────────

/** GID layer split:
 *  - Layers 0-2 (FLOORS, FURNITURE, TABLES): flat, always below characters
 *  - Layers 3+ (LAPTOP, DECO, TOP): overlay, always above characters */
const GID_BASE_LAYER_COUNT = 3

export function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  tileMap: TileTypeVal[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
  tileColors?: Array<FloorColor | null>,
  cols?: number,
  gidLayers?: number[][],
): void {
  const s = TILE_SIZE * zoom
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  const layoutCols = cols ?? tmCols

  // Direct TMX GID rendering — draw base layers (below characters)
  const useGids = gidLayers && gidLayers.length > 0 && hasTilesetCache()

  if (useGids) {
    const flatCount = Math.min(GID_BASE_LAYER_COUNT, gidLayers.length)
    for (let li = 0; li < flatCount; li++) {
      const layer = gidLayers[li]
      for (let r = 0; r < tmRows; r++) {
        for (let c = 0; c < tmCols; c++) {
          const gid = layer[r * layoutCols + c]
          if (!gid || gid === 0) continue
          const tileCanvas = getScaledTileCanvas(gid, zoom)
          if (tileCanvas) {
            ctx.drawImage(tileCanvas, offsetX + c * s, offsetY + r * s)
          }
        }
      }
    }
    return
  }

  // Fallback: abstract tile type rendering (auto-tile walls + colorized floors)
  const useSpriteFloors = hasFloorSprites()

  for (let r = 0; r < tmRows; r++) {
    for (let c = 0; c < tmCols; c++) {
      const tile = tileMap[r][c]

      // Skip VOID tiles entirely (transparent)
      if (tile === TileType.VOID) continue

      if (tile === TileType.WALL || !useSpriteFloors) {
        // Wall tiles or fallback: solid color
        if (tile === TileType.WALL) {
          const colorIdx = r * layoutCols + c
          const wallColor = tileColors?.[colorIdx]
          ctx.fillStyle = wallColor ? wallColorToHex(wallColor) : WALL_COLOR
        } else {
          ctx.fillStyle = FALLBACK_FLOOR_COLOR
        }
        ctx.fillRect(offsetX + c * s, offsetY + r * s, s, s)
        continue
      }

      // Floor tile: get colorized sprite
      const colorIdx = r * layoutCols + c
      const color = tileColors?.[colorIdx] ?? { h: 0, s: 0, b: 0, c: 0 }
      const sprite = getColorizedFloorSprite(tile, color)
      const cached = getCachedSprite(sprite, zoom)
      ctx.drawImage(cached, offsetX + c * s, offsetY + r * s)
    }
  }

}

interface ZDrawable {
  zY: number
  draw: (ctx: CanvasRenderingContext2D) => void
}

/** Render GID overlay layers (laptop, deco, top) — called after characters */
export function renderGidOverlayLayers(
  ctx: CanvasRenderingContext2D,
  tileMap: TileTypeVal[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
  cols?: number,
  gidLayers?: number[][],
): void {
  if (!gidLayers || gidLayers.length <= GID_BASE_LAYER_COUNT || !hasTilesetCache()) return
  const s = TILE_SIZE * zoom
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  const layoutCols = cols ?? tmCols

  for (let li = GID_BASE_LAYER_COUNT; li < gidLayers.length; li++) {
    const layer = gidLayers[li]
    for (let r = 0; r < tmRows; r++) {
      for (let c = 0; c < tmCols; c++) {
        const gid = layer[r * layoutCols + c]
        if (!gid || gid === 0) continue
        const tileCanvas = getScaledTileCanvas(gid, zoom)
        if (tileCanvas) {
          ctx.drawImage(tileCanvas, offsetX + c * s, offsetY + r * s)
        }
      }
    }
  }
}


export function renderScene(
  ctx: CanvasRenderingContext2D,
  furniture: FurnitureInstance[],
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
  selectedAgentId: number | null,
  hoveredAgentId: number | null,
  time?: number,
): void {
  const drawables: ZDrawable[] = []

  // Furniture
  for (const f of furniture) {
    const cached = getCachedSprite(f.sprite, zoom)
    const fx = offsetX + f.x * zoom
    const fy = offsetY + f.y * zoom
    drawables.push({
      zY: f.zY,
      draw: (c) => {
        c.drawImage(cached, fx, fy)
      },
    })
  }

  // Characters — skip if PNG assets haven't loaded yet
  for (const ch of characters) {
    const sprites = getCharacterSprites(ch.palette, ch.hueShift)
    if (!sprites) continue
    const spriteData = getCharacterSprite(ch, sprites)
    const cached = getCachedSprite(spriteData, zoom)
    // Sitting offset: shift character down when seated so they visually sit in the chair
    const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0
    // Anchor at bottom-center of character — round to integer device pixels
    const drawX = Math.round(offsetX + ch.x * zoom - cached.width / 2)
    const drawY = Math.round(offsetY + (ch.y + sittingOffset) * zoom - cached.height)

    // Sort characters by bottom of their tile (not center) so they render
    // in front of same-row furniture (e.g. chairs) but behind furniture
    // at lower rows (e.g. desks, bookshelves that occlude from below).
    const charZY = ch.y + TILE_SIZE / 2 + CHARACTER_Z_SORT_OFFSET

    // Matrix spawn/despawn effect — skip outline, use per-pixel rendering
    if (ch.matrixEffect) {
      const mDrawX = drawX
      const mDrawY = drawY
      const mSpriteData = spriteData
      const mCh = ch
      drawables.push({
        zY: charZY,
        draw: (c) => {
          renderMatrixEffect(c, mCh, mSpriteData, mDrawX, mDrawY, zoom)
        },
      })
      continue
    }

    // Outline priority: selected > hovered > CEO glow > proximity highlight
    const isSelected = selectedAgentId !== null && ch.id === selectedAgentId
    const isHovered = hoveredAgentId !== null && ch.id === hoveredAgentId
    if (isSelected || isHovered) {
      // White outline for selected/hovered
      const outlineAlpha = isSelected ? SELECTED_OUTLINE_ALPHA : HOVERED_OUTLINE_ALPHA
      const outlineData = getOutlineSprite(spriteData)
      const outlineCached = getCachedSprite(outlineData, zoom)
      const olDrawX = drawX - zoom  // 1 sprite-pixel offset, scaled
      const olDrawY = drawY - zoom  // outline follows sitting offset via drawY
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET, // sort just before character
        draw: (c) => {
          c.save()
          c.globalAlpha = outlineAlpha
          c.drawImage(outlineCached, olDrawX, olDrawY)
          c.restore()
        },
      })
    } else if (ch.isPlayerControlled) {
      // CEO gold glow outline (always-on when not selected/hovered)
      const goldOutlineData = getGoldOutlineSprite(spriteData)
      const goldOutlineCached = getCachedSprite(goldOutlineData, zoom)
      const olDrawX = drawX - zoom
      const olDrawY = drawY - zoom
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET,
        draw: (c) => {
          c.save()
          c.globalAlpha = CEO_GLOW_ALPHA
          c.drawImage(goldOutlineCached, olDrawX, olDrawY)
          c.restore()
        },
      })
    } else if (ch.isNearPlayer) {
      // Proximity highlight: soft gold pulse for nearby non-CEO agents
      const goldOutlineData = getGoldOutlineSprite(spriteData)
      const goldOutlineCached = getCachedSprite(goldOutlineData, zoom)
      const olDrawX = drawX - zoom
      const olDrawY = drawY - zoom
      const t = time ?? 0
      const pulseAlpha = PROXIMITY_HIGHLIGHT_BASE_ALPHA
        + PROXIMITY_HIGHLIGHT_PULSE_AMPLITUDE * Math.sin(t * PROXIMITY_HIGHLIGHT_PULSE_SPEED)
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET,
        draw: (c) => {
          c.save()
          c.globalAlpha = pulseAlpha
          c.drawImage(goldOutlineCached, olDrawX, olDrawY)
          c.restore()
        },
      })
    }

    drawables.push({
      zY: charZY,
      draw: (c) => {
        c.drawImage(cached, drawX, drawY)
      },
    })

    // CEO crown: draw above the character sprite
    if (ch.isPlayerControlled) {
      const crownCached = getCachedSprite(CEO_CROWN_SPRITE, zoom)
      const crownW = crownCached.width
      const crownH = crownCached.height
      // Center crown above character head
      const crownX = Math.round(drawX + cached.width / 2 - crownW / 2)
      const crownY = Math.round(drawY - crownH)
      drawables.push({
        zY: charZY + 0.001, // sort just after character so crown draws on top
        draw: (c) => {
          c.drawImage(crownCached, crownX, crownY)
        },
      })
    }
  }

  // Sort by Y (lower = in front = drawn later)
  drawables.sort((a, b) => a.zY - b.zY)

  for (const d of drawables) {
    d.draw(ctx)
  }
}

// ── Seat indicators ─────────────────────────────────────────────

export function renderSeatIndicators(
  ctx: CanvasRenderingContext2D,
  seats: Map<string, Seat>,
  characters: Map<number, Character>,
  selectedAgentId: number | null,
  hoveredTile: { col: number; row: number } | null,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  if (selectedAgentId === null || !hoveredTile) return
  const selectedChar = characters.get(selectedAgentId)
  if (!selectedChar) return

  // Only show indicator for the hovered seat tile
  for (const [uid, seat] of seats) {
    if (seat.seatCol !== hoveredTile.col || seat.seatRow !== hoveredTile.row) continue

    const s = TILE_SIZE * zoom
    const x = offsetX + seat.seatCol * s
    const y = offsetY + seat.seatRow * s

    if (selectedChar.seatId === uid) {
      // Selected agent's own seat — blue
      ctx.fillStyle = SEAT_OWN_COLOR
    } else if (!seat.assigned) {
      // Available seat — green
      ctx.fillStyle = SEAT_AVAILABLE_COLOR
    } else {
      // Busy (assigned to another agent) — red
      ctx.fillStyle = SEAT_BUSY_COLOR
    }
    ctx.fillRect(x, y, s, s)
    break
  }
}

// ── Edit mode overlays ──────────────────────────────────────────

export function renderGridOverlay(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  zoom: number,
  cols: number,
  rows: number,
  tileMap?: TileTypeVal[][],
): void {
  const s = TILE_SIZE * zoom
  ctx.strokeStyle = GRID_LINE_COLOR
  ctx.lineWidth = 1
  ctx.beginPath()
  // Vertical lines — offset by 0.5 for crisp 1px lines
  for (let c = 0; c <= cols; c++) {
    const x = offsetX + c * s + 0.5
    ctx.moveTo(x, offsetY)
    ctx.lineTo(x, offsetY + rows * s)
  }
  // Horizontal lines
  for (let r = 0; r <= rows; r++) {
    const y = offsetY + r * s + 0.5
    ctx.moveTo(offsetX, y)
    ctx.lineTo(offsetX + cols * s, y)
  }
  ctx.stroke()

  // Draw faint dashed outlines on VOID tiles
  if (tileMap) {
    ctx.save()
    ctx.strokeStyle = VOID_TILE_OUTLINE_COLOR
    ctx.lineWidth = 1
    ctx.setLineDash(VOID_TILE_DASH_PATTERN)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (tileMap[r]?.[c] === TileType.VOID) {
          ctx.strokeRect(offsetX + c * s + 0.5, offsetY + r * s + 0.5, s - 1, s - 1)
        }
      }
    }
    ctx.restore()
  }
}

/** Draw faint expansion placeholders 1 tile outside grid bounds (ghost border). */
export function renderGhostBorder(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  zoom: number,
  cols: number,
  rows: number,
  ghostHoverCol: number,
  ghostHoverRow: number,
): void {
  const s = TILE_SIZE * zoom
  ctx.save()

  // Collect ghost border tiles: one ring around the grid
  const ghostTiles: Array<{ c: number; r: number }> = []
  // Top and bottom rows
  for (let c = -1; c <= cols; c++) {
    ghostTiles.push({ c, r: -1 })
    ghostTiles.push({ c, r: rows })
  }
  // Left and right columns (excluding corners already added)
  for (let r = 0; r < rows; r++) {
    ghostTiles.push({ c: -1, r })
    ghostTiles.push({ c: cols, r })
  }

  for (const { c, r } of ghostTiles) {
    const x = offsetX + c * s
    const y = offsetY + r * s
    const isHovered = c === ghostHoverCol && r === ghostHoverRow
    if (isHovered) {
      ctx.fillStyle = GHOST_BORDER_HOVER_FILL
      ctx.fillRect(x, y, s, s)
    }
    ctx.strokeStyle = isHovered ? GHOST_BORDER_HOVER_STROKE : GHOST_BORDER_STROKE
    ctx.lineWidth = 1
    ctx.setLineDash(VOID_TILE_DASH_PATTERN)
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1)
  }

  ctx.restore()
}

export function renderGhostPreview(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteData,
  col: number,
  row: number,
  valid: boolean,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const cached = getCachedSprite(sprite, zoom)
  const x = offsetX + col * TILE_SIZE * zoom
  const y = offsetY + row * TILE_SIZE * zoom
  ctx.save()
  ctx.globalAlpha = GHOST_PREVIEW_SPRITE_ALPHA
  ctx.drawImage(cached, x, y)
  // Tint overlay
  ctx.globalAlpha = GHOST_PREVIEW_TINT_ALPHA
  ctx.fillStyle = valid ? GHOST_VALID_TINT : GHOST_INVALID_TINT
  ctx.fillRect(x, y, cached.width, cached.height)
  ctx.restore()
}

export function renderSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  w: number,
  h: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const s = TILE_SIZE * zoom
  const x = offsetX + col * s
  const y = offsetY + row * s
  ctx.save()
  ctx.strokeStyle = SELECTION_HIGHLIGHT_COLOR
  ctx.lineWidth = 2
  ctx.setLineDash(SELECTION_DASH_PATTERN)
  ctx.strokeRect(x + 1, y + 1, w * s - 2, h * s - 2)
  ctx.restore()
}

export function renderDeleteButton(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  w: number,
  _h: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): DeleteButtonBounds {
  const s = TILE_SIZE * zoom
  // Position at top-right corner of selected furniture
  const cx = offsetX + (col + w) * s + 1
  const cy = offsetY + row * s - 1
  const radius = Math.max(BUTTON_MIN_RADIUS, zoom * BUTTON_RADIUS_ZOOM_FACTOR)

  // Circle background
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = DELETE_BUTTON_BG
  ctx.fill()

  // X mark
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(BUTTON_LINE_WIDTH_MIN, zoom * BUTTON_LINE_WIDTH_ZOOM_FACTOR)
  ctx.lineCap = 'round'
  const xSize = radius * BUTTON_ICON_SIZE_FACTOR
  ctx.beginPath()
  ctx.moveTo(cx - xSize, cy - xSize)
  ctx.lineTo(cx + xSize, cy + xSize)
  ctx.moveTo(cx + xSize, cy - xSize)
  ctx.lineTo(cx - xSize, cy + xSize)
  ctx.stroke()
  ctx.restore()

  return { cx, cy, radius }
}

export function renderRotateButton(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  _w: number,
  _h: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): RotateButtonBounds {
  const s = TILE_SIZE * zoom
  // Position to the left of the delete button (which is at top-right corner)
  const radius = Math.max(BUTTON_MIN_RADIUS, zoom * BUTTON_RADIUS_ZOOM_FACTOR)
  const cx = offsetX + col * s - 1
  const cy = offsetY + row * s - 1

  // Circle background
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = ROTATE_BUTTON_BG
  ctx.fill()

  // Circular arrow icon
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(BUTTON_LINE_WIDTH_MIN, zoom * BUTTON_LINE_WIDTH_ZOOM_FACTOR)
  ctx.lineCap = 'round'
  const arcR = radius * BUTTON_ICON_SIZE_FACTOR
  ctx.beginPath()
  // Draw a 270-degree arc
  ctx.arc(cx, cy, arcR, -Math.PI * 0.8, Math.PI * 0.7)
  ctx.stroke()
  // Draw arrowhead at the end of the arc
  const endAngle = Math.PI * 0.7
  const endX = cx + arcR * Math.cos(endAngle)
  const endY = cy + arcR * Math.sin(endAngle)
  const arrowSize = radius * 0.35
  ctx.beginPath()
  ctx.moveTo(endX + arrowSize * 0.6, endY - arrowSize * 0.3)
  ctx.lineTo(endX, endY)
  ctx.lineTo(endX + arrowSize * 0.7, endY + arrowSize * 0.5)
  ctx.stroke()
  ctx.restore()

  return { cx, cy, radius }
}

// ── Name labels & status indicators ─────────────────────────────

/** Data needed to render agent identity overlays above characters */
export interface IdentityOverlay {
  /** Map from character id to display name */
  nameMap: Map<number, string>
  /** Map from character id to current agent status */
  statusMap: Map<number, AgentStatus>
  /** Map from character id to hex color (e.g. '#FFD700') */
  colorMap: Map<number, string>
  /** Map from character id to current task description (shown below nameplate) */
  taskTextMap: Map<number, string>
  /** Map from character id to id of agent they're interacting with (subagent relationship) */
  interactionMap: Map<number, number>
  /** Monotonically increasing time (seconds) for animation */
  time: number
}


/** Bounding rect for nameplate collision detection */
interface PlateRect {
  x: number
  y: number
  w: number
  h: number
}

/** Check if two rects overlap by more than 50% of the smaller rect's area */
function platesOverlap(a: PlateRect, b: PlateRect): boolean {
  const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const overlapArea = overlapX * overlapY
  const smallerArea = Math.min(a.w * a.h, b.w * b.h)
  return smallerArea > 0 && overlapArea > smallerArea * 0.5
}

export function renderIdentityPlates(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
  identity: IdentityOverlay,
  selectedId: number | null,
): void {
  // Hide entirely at low zoom (bitmap text is unreadable below zoom 2)
  if (zoom < 2) return

  // Pre-compute plate data and bounding rects for collision detection
  const plates: Array<{
    ch: Character
    name: string
    brandColor: string
    plateW: number
    screenX: number
    screenY: number
    rect: PlateRect
  }> = []

  for (const ch of characters) {
    if (ch.matrixEffect) continue

    const name = identity.nameMap.get(ch.id)
    if (!name) continue

    const brandColor = identity.colorMap.get(ch.id) ?? '#FFFFFF'

    // Measure text width (pre-zoom pixels)
    const nameSize = measureBitmapText(name)

    // Plate width: pad + name + pad
    const plateW = IDENTITY_PLATE_PAD_X + nameSize.width + IDENTITY_PLATE_PAD_X

    // Position: centered above character head
    const sittingOff = ch.state === CharacterState.TYPE ? NAME_LABEL_SITTING_OFFSET_PX : 0
    const centerX = offsetX + ch.x * zoom
    const bottomY = offsetY + (ch.y + sittingOff - NAME_LABEL_VERTICAL_OFFSET_PX) * zoom

    // Screen-space plate rect (pixel-aligned)
    const scaledW = Math.floor(plateW * zoom)
    const scaledH = Math.floor(IDENTITY_PLATE_HEIGHT * zoom)
    const screenX = Math.floor(centerX - scaledW / 2)
    const screenY = Math.floor(bottomY - scaledH)

    plates.push({
      ch,
      name,
      brandColor,
      plateW,
      screenX,
      screenY,
      rect: { x: screenX, y: screenY, w: scaledW, h: scaledH },
    })
  }

  // Collision detection: track placed rects, reduce alpha on overlap
  const placedRects: PlateRect[] = []

  for (const plate of plates) {
    const isSelected = plate.ch.id === selectedId

    // Check for overlap with already-placed plates
    let alpha = 1.0
    if (!isSelected) {
      for (const placed of placedRects) {
        if (platesOverlap(plate.rect, placed)) {
          alpha = 0.4
          break
        }
      }
    }
    placedRects.push(plate.rect)

    ctx.save()
    ctx.globalAlpha = alpha

    // Background: semi-transparent dark plate
    ctx.fillStyle = `rgba(0, 0, 0, ${IDENTITY_PLATE_BG_ALPHA})`
    ctx.fillRect(plate.screenX, plate.screenY, plate.rect.w, plate.rect.h)

    // Name in brand color, centered in plate
    const textX = plate.screenX + Math.floor(IDENTITY_PLATE_PAD_X * zoom)
    const textY = plate.screenY + Math.floor(IDENTITY_PLATE_PAD_Y * zoom)
    renderBitmapText(ctx, plate.name, plate.brandColor, textX, textY, zoom)

    // ── Task context line (below nameplate, no background) ──
    const status = identity.statusMap.get(plate.ch.id)
    if (status === 'working' || status === 'waiting') {
      const rawTask = identity.taskTextMap.get(plate.ch.id)
      if (rawTask && rawTask.length > 0) {
        const taskText = rawTask.length > 20 ? rawTask.slice(0, 18) + '..' : rawTask
        const taskSize = measureBitmapText(taskText)
        const taskGap = Math.floor(1 * zoom)
        const taskTextX = Math.floor(plate.screenX + plate.rect.w / 2 - Math.floor(taskSize.width * zoom) / 2)
        const taskTextY = plate.screenY + plate.rect.h + taskGap

        // Dimmed white text, no background plate
        const prevAlpha = ctx.globalAlpha
        ctx.globalAlpha = prevAlpha * 0.35
        renderBitmapText(ctx, taskText, '#FFFFFF', taskTextX, taskTextY, zoom)
        ctx.globalAlpha = prevAlpha
      }
    }

    ctx.restore()
  }
}

// ── Status dot fallback colors (zoom < 2) ─────────────────────
const STATUS_DOT_COLORS: Record<string, string> = {
  working: '#22c55e',
  idle: '#9ca3af',
  error: '#ef4444',
  waiting: '#eab308',
}

export function renderStatusIcons(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
  identity: IdentityOverlay,
): void {
  const plateH = Math.floor(IDENTITY_PLATE_HEIGHT * zoom)
  const gap = STATUS_ICON_GAP_PX * zoom

  for (const ch of characters) {
    if (ch.matrixEffect) continue

    const status = identity.statusMap.get(ch.id)
    if (!status || status === 'offline') continue

    const name = identity.nameMap.get(ch.id)
    if (!name) continue

    const sittingOff = ch.state === CharacterState.TYPE ? NAME_LABEL_SITTING_OFFSET_PX : 0
    const labelY = offsetY + (ch.y + sittingOff - NAME_LABEL_VERTICAL_OFFSET_PX) * zoom
    const plateTop = labelY - plateH

    // ── Zoom < 2: simple colored dot fallback ──
    if (zoom < 2) {
      const dotColor = STATUS_DOT_COLORS[status]
      if (!dotColor) continue
      const dotR = 2 * zoom
      const dotCX = offsetX + ch.x * zoom
      const dotCY = plateTop - gap - dotR

      ctx.save()
      // Error: aggressive alpha pulse at 6Hz
      if (status === 'error') {
        const t = identity.time * 6
        ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
      }
      ctx.beginPath()
      ctx.arc(dotCX, dotCY, dotR, 0, Math.PI * 2)
      ctx.fillStyle = dotColor
      ctx.fill()
      ctx.restore()
      continue
    }

    // ── Zoom >= 2: sprite-based status icon ──
    const frames = STATUS_ICON_SPRITES[status]
    if (!frames || frames.length === 0) continue

    // Determine animation frame from identity.time
    let frameIndex: number
    switch (status) {
      case 'working': frameIndex = Math.floor(identity.time * 3) % 4; break
      case 'idle':    frameIndex = Math.floor(identity.time * 1) % 2; break
      case 'error':   frameIndex = Math.floor(identity.time * 6) % 4; break
      case 'waiting': frameIndex = Math.floor(identity.time * 1) % 2; break
      default:        frameIndex = 0
    }
    const sprite = frames[frameIndex]

    // Cap effective zoom at 6 so icons don't dominate the character sprite
    const effectiveZoom = Math.min(zoom, 6)
    const iconCanvas = getCachedSprite(sprite, effectiveZoom)
    const iconW = iconCanvas.width
    const iconH = iconCanvas.height

    // Center horizontally above the plate
    const iconX = Math.floor(offsetX + ch.x * zoom - iconW / 2)
    const iconY = Math.floor(plateTop - gap - iconH)

    ctx.drawImage(iconCanvas, iconX, iconY)
  }
}

// ── Speech bubbles ──────────────────────────────────────────────

export function renderBubbles(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  for (const ch of characters) {
    if (!ch.bubbleType) continue

    const sprite = ch.bubbleType === 'permission'
      ? BUBBLE_PERMISSION_SPRITE
      : BUBBLE_WAITING_SPRITE

    // Compute opacity: permission = full, waiting = fade in last 0.5s
    let alpha = 1.0
    if (ch.bubbleType === 'waiting' && ch.bubbleTimer < BUBBLE_FADE_DURATION_SEC) {
      alpha = ch.bubbleTimer / BUBBLE_FADE_DURATION_SEC
    }

    const cached = getCachedSprite(sprite, zoom)
    // Position: centered above the character's head
    // Character is anchored bottom-center at (ch.x, ch.y), sprite is 16x24
    // Place bubble above head with a small gap; follow sitting offset
    const sittingOff = ch.state === CharacterState.TYPE ? BUBBLE_SITTING_OFFSET_PX : 0
    const bubbleX = Math.round(offsetX + ch.x * zoom - cached.width / 2)
    const bubbleY = Math.round(offsetY + (ch.y + sittingOff - BUBBLE_VERTICAL_OFFSET_PX) * zoom - cached.height - 1 * zoom)

    ctx.save()
    if (alpha < 1.0) ctx.globalAlpha = alpha
    ctx.drawImage(cached, bubbleX, bubbleY)
    ctx.restore()
  }
}

/** Render small chat bubbles above agents that are interacting with each other */
export function renderChatBubbles(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
  identity: IdentityOverlay,
): void {
  if (identity.interactionMap.size === 0) return

  const cached = getCachedSprite(BUBBLE_CHAT_SPRITE, zoom)
  // Track which pairs we've already rendered (avoid double-drawing)
  const rendered = new Set<number>()

  for (const ch of characters) {
    const partnerId = identity.interactionMap.get(ch.id)
    if (partnerId === undefined || rendered.has(ch.id)) continue
    rendered.add(ch.id)
    rendered.add(partnerId)

    // Draw chat bubble above this character
    const sittingOff = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0
    const bubbleX = Math.round(offsetX + ch.x * zoom - cached.width / 2)
    const bubbleY = Math.round(offsetY + (ch.y + sittingOff - BUBBLE_VERTICAL_OFFSET_PX) * zoom - cached.height - 1 * zoom)
    ctx.drawImage(cached, bubbleX, bubbleY)

    // Draw chat bubble above partner too
    const partner = characters.find(c => c.id === partnerId)
    if (partner) {
      const pSittingOff = partner.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0
      const pBubbleX = Math.round(offsetX + partner.x * zoom - cached.width / 2)
      const pBubbleY = Math.round(offsetY + (partner.y + pSittingOff - BUBBLE_VERTICAL_OFFSET_PX) * zoom - cached.height - 1 * zoom)
      ctx.drawImage(cached, pBubbleX, pBubbleY)
    }
  }
}

export interface ButtonBounds {
  /** Center X in device pixels */
  cx: number
  /** Center Y in device pixels */
  cy: number
  /** Radius in device pixels */
  radius: number
}

export type DeleteButtonBounds = ButtonBounds
export type RotateButtonBounds = ButtonBounds

export interface EditorRenderState {
  showGrid: boolean
  ghostSprite: SpriteData | null
  ghostCol: number
  ghostRow: number
  ghostValid: boolean
  selectedCol: number
  selectedRow: number
  selectedW: number
  selectedH: number
  hasSelection: boolean
  isRotatable: boolean
  /** Updated each frame by renderDeleteButton */
  deleteButtonBounds: DeleteButtonBounds | null
  /** Updated each frame by renderRotateButton */
  rotateButtonBounds: RotateButtonBounds | null
  /** Whether to show ghost border (expansion tiles outside grid) */
  showGhostBorder: boolean
  /** Hovered ghost border tile col (-1 to cols) */
  ghostBorderHoverCol: number
  /** Hovered ghost border tile row (-1 to rows) */
  ghostBorderHoverRow: number
}

export interface SelectionRenderState {
  selectedAgentId: number | null
  hoveredAgentId: number | null
  hoveredTile: { col: number; row: number } | null
  seats: Map<string, Seat>
  characters: Map<number, Character>
  /** Active collision flash overlay, or null */
  collisionFlash?: { col: number; row: number; timer: number } | null
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  tileMap: TileTypeVal[][],
  furniture: FurnitureInstance[],
  characters: Character[],
  zoom: number,
  panX: number,
  panY: number,
  selection?: SelectionRenderState,
  editor?: EditorRenderState,
  tileColors?: Array<FloorColor | null>,
  layoutCols?: number,
  layoutRows?: number,
  gidLayers?: number[][],
  identity?: IdentityOverlay,
): { offsetX: number; offsetY: number } {
  // Clear
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Use layout dimensions (fallback to tileMap size)
  const cols = layoutCols ?? (tileMap.length > 0 ? tileMap[0].length : 0)
  const rows = layoutRows ?? tileMap.length

  // Center map in viewport + pan offset (integer device pixels)
  const mapW = cols * TILE_SIZE * zoom
  const mapH = rows * TILE_SIZE * zoom
  const offsetX = Math.floor((canvasWidth - mapW) / 2) + Math.round(panX)
  const offsetY = Math.floor((canvasHeight - mapH) / 2) + Math.round(panY)

  // Draw tiles (floor + wall base color, or direct GID rendering)
  const useGidMode = gidLayers && gidLayers.length > 0 && hasTilesetCache()
  renderTileGrid(ctx, tileMap, offsetX, offsetY, zoom, tileColors, layoutCols, gidLayers)

  // Seat indicators (below furniture/characters, on top of floor)
  if (selection) {
    renderSeatIndicators(ctx, selection.seats, selection.characters, selection.selectedAgentId, selection.hoveredTile, offsetX, offsetY, zoom)
  }

  // Collision flash overlay (after floor, before characters)
  const collisionFlash = selection?.collisionFlash ?? null
  if (collisionFlash && collisionFlash.timer > 0) {
    const s = TILE_SIZE * zoom
    const flashX = offsetX + collisionFlash.col * s
    const flashY = offsetY + collisionFlash.row * s
    const flashAlpha = collisionFlash.timer / COLLISION_FLASH_DURATION_SEC
    ctx.save()
    ctx.globalAlpha = flashAlpha
    ctx.fillStyle = COLLISION_FLASH_COLOR
    ctx.fillRect(flashX, flashY, s, s)
    ctx.restore()
  }

  // Build wall instances for z-sorting with furniture and characters
  // Skip wall auto-tile sprites when using direct GID rendering (walls are already drawn as tiles)
  const wallInstances = (!useGidMode && hasWallSprites())
    ? getWallInstances(tileMap, tileColors, layoutCols)
    : []
  const allFurniture = wallInstances.length > 0
    ? [...wallInstances, ...furniture]
    : furniture

  // Draw walls + furniture + characters (z-sorted)
  const selectedId = selection?.selectedAgentId ?? null
  const hoveredId = selection?.hoveredAgentId ?? null
  const sceneTime = identity?.time
  renderScene(ctx, allFurniture, characters, offsetX, offsetY, zoom, selectedId, hoveredId, sceneTime)

  // GID overlay layers (laptop, deco, top) — drawn above characters so
  // surface items like laptops aren't covered by typing characters
  if (useGidMode) {
    renderGidOverlayLayers(ctx, tileMap, offsetX, offsetY, zoom, layoutCols, gidLayers)
  }

  // Identity plates + status indicators (above characters, below bubbles)
  if (identity) {
    renderIdentityPlates(ctx, characters, offsetX, offsetY, zoom, identity, selectedId)
    renderStatusIcons(ctx, characters, offsetX, offsetY, zoom, identity)
  }

  // Speech bubbles (always on top of characters)
  renderBubbles(ctx, characters, offsetX, offsetY, zoom)

  // Chat bubbles for agent interactions (subagent relationships)
  if (identity) {
    renderChatBubbles(ctx, characters, offsetX, offsetY, zoom, identity)
  }

  // Editor overlays
  if (editor) {
    if (editor.showGrid) {
      renderGridOverlay(ctx, offsetX, offsetY, zoom, cols, rows, tileMap)
    }
    if (editor.showGhostBorder) {
      renderGhostBorder(ctx, offsetX, offsetY, zoom, cols, rows, editor.ghostBorderHoverCol, editor.ghostBorderHoverRow)
    }
    if (editor.ghostSprite && editor.ghostCol >= 0) {
      renderGhostPreview(ctx, editor.ghostSprite, editor.ghostCol, editor.ghostRow, editor.ghostValid, offsetX, offsetY, zoom)
    }
    if (editor.hasSelection) {
      renderSelectionHighlight(ctx, editor.selectedCol, editor.selectedRow, editor.selectedW, editor.selectedH, offsetX, offsetY, zoom)
      editor.deleteButtonBounds = renderDeleteButton(ctx, editor.selectedCol, editor.selectedRow, editor.selectedW, editor.selectedH, offsetX, offsetY, zoom)
      if (editor.isRotatable) {
        editor.rotateButtonBounds = renderRotateButton(ctx, editor.selectedCol, editor.selectedRow, editor.selectedW, editor.selectedH, offsetX, offsetY, zoom)
      } else {
        editor.rotateButtonBounds = null
      }
    } else {
      editor.deleteButtonBounds = null
      editor.rotateButtonBounds = null
    }
  }

  return { offsetX, offsetY }
}
