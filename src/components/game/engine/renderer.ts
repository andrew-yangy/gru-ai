import { TileType, TILE_SIZE, CharacterState, FurnitureActivityType, Direction } from '../pixel-types'
import type { TileType as TileTypeVal, FurnitureInstance, Character, SpriteData, Seat, FloorColor } from '../pixel-types'
import { getCachedSprite, getOutlineSprite } from '../sprites/spriteCache'
import { getCharacterSprites, BUBBLE_PERMISSION_SPRITE, BUBBLE_WAITING_SPRITE, BUBBLE_CHAT_SPRITE } from '../sprites/spriteData'
import { getCharacterSprite } from './characters'
import { renderMatrixEffect } from './matrixEffect'
import { getColorizedFloorSprite, hasFloorSprites, WALL_COLOR } from '../floorTiles'
import { wallColorToHex } from '../wallTiles'
import { hasTilesetCache, getScaledTileCanvas } from '../tilesetCache'
import { getAnimatedGid } from '../furnitureAnimations'
// bitmapFont removed — using native canvas text rendering instead
import type { AgentStatus, InteractionType } from '../types'
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
  IDENTITY_PLATE_CORNER_RADIUS,
  STATUS_DOT_RADIUS,
  STATUS_DOT_GAP,
  CEO_CROWN_COLOR,
  CEO_GLOW_ALPHA,
  COLLISION_FLASH_DURATION_SEC,
  COLLISION_FLASH_COLOR,
  PROXIMITY_HIGHLIGHT_BASE_ALPHA,
  PROXIMITY_HIGHLIGHT_PULSE_AMPLITUDE,
  PROXIMITY_HIGHLIGHT_PULSE_SPEED,
  CHARACTER_SPRITE_SCALE,
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

/** GID layer split (gruai.tmx 4-layer map):
 *  - Layers 0-1 (FLOOR, FURNITURE_BASE): below characters
 *  - Layers 2-3 (FURNITURE_TOP, DECO): above characters */
const GID_BASE_LAYER_COUNT = 2

export function renderTileGrid(
  ctx: CanvasRenderingContext2D,
  tileMap: TileTypeVal[][],
  offsetX: number,
  offsetY: number,
  zoom: number,
  tileColors?: Array<FloorColor | null>,
  cols?: number,
  gidLayers?: number[][],
  timeSec?: number,
): void {
  const s = TILE_SIZE * zoom
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  const layoutCols = cols ?? tmCols

  // Direct TMX GID rendering — draw base layers (below characters)
  const useGids = gidLayers && gidLayers.length > 0 && hasTilesetCache()

  if (useGids) {
    const flatCount = Math.min(GID_BASE_LAYER_COUNT, gidLayers.length)
    const t = timeSec ?? 0
    for (let li = 0; li < flatCount; li++) {
      const layer = gidLayers[li]
      for (let r = 0; r < tmRows; r++) {
        for (let c = 0; c < tmCols; c++) {
          const gid = layer[r * layoutCols + c]
          if (!gid || gid === 0) continue
          const animGid = getAnimatedGid(gid, t)
          const tileCanvas = getScaledTileCanvas(animGid, zoom)
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
  timeSec?: number,
): void {
  if (!gidLayers || gidLayers.length <= GID_BASE_LAYER_COUNT || !hasTilesetCache()) return
  const s = TILE_SIZE * zoom
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  const layoutCols = cols ?? tmCols
  const t = timeSec ?? 0

  for (let li = GID_BASE_LAYER_COUNT; li < gidLayers.length; li++) {
    const layer = gidLayers[li]
    for (let r = 0; r < tmRows; r++) {
      for (let c = 0; c < tmCols; c++) {
        const gid = layer[r * layoutCols + c]
        if (!gid || gid === 0) continue
        const animGid = getAnimatedGid(gid, t)
        const tileCanvas = getScaledTileCanvas(animGid, zoom)
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
  overlayGidLayers?: number[][],
  overlayLayoutCols?: number,
  overlayRows?: number,
  overlayCols?: number,
  overlayTimeSec?: number,
): void {
  const drawables: ZDrawable[] = []

  // GID overlay tiles (layers 2+ = furniture_top, deco) — z-sorted with characters.
  // Overlay tiles sort AFTER characters at the same row so surface items (chairs,
  // desk tops, laptops) render on top of sitting/walking characters.  Characters
  // at a higher row (below the furniture) still render in front.
  if (overlayGidLayers && overlayLayoutCols && overlayRows && overlayCols && hasTilesetCache()) {
    const s = TILE_SIZE * zoom
    const t = overlayTimeSec ?? 0
    for (let li = GID_BASE_LAYER_COUNT; li < overlayGidLayers.length; li++) {
      const layer = overlayGidLayers[li]
      if (!layer) continue
      for (let r = 0; r < overlayRows; r++) {
        for (let c = 0; c < overlayCols; c++) {
          const gid = layer[r * overlayLayoutCols + c]
          if (!gid || gid === 0) continue
          const tileRow = r
          const tileCol = c
          // Sort slightly after characters at the same row (CHARACTER_Z_SORT_OFFSET=0.5)
          // so furniture surfaces always render on top of characters at the same tile row.
          const tileZY = (tileRow + 1) * TILE_SIZE + CHARACTER_Z_SORT_OFFSET + 0.5
          drawables.push({
            zY: tileZY,
            draw: (ctx2) => {
              const animGid = getAnimatedGid(gid, t)
              const tileCanvas = getScaledTileCanvas(animGid, zoom)
              if (tileCanvas) {
                ctx2.drawImage(tileCanvas, offsetX + tileCol * s, offsetY + tileRow * s)
              }
            },
          })
        }
      }
    }
  }

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
    const charZoom = zoom * CHARACTER_SPRITE_SCALE
    const cached = getCachedSprite(spriteData, charZoom)
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
          renderMatrixEffect(c, mCh, mSpriteData, mDrawX, mDrawY, charZoom)
        },
      })
      continue
    }

    // Outline priority: selected > hovered > CEO glow > proximity highlight
    const isSelected = selectedAgentId !== null && ch.id === selectedAgentId
    const isHovered = hoveredAgentId !== null && ch.id === hoveredAgentId
    // Up-facing seated characters at desks: clip above the seat row so the
    // torso/legs are hidden behind the desk surface. Only clip when there's
    // a desk tile in the rows above (FURNITURE_BASE or FURNITURE_TOP).
    // Conference room chairs have no desk surface — skip clipping for those.
    let isUpSitting = false
    let clipScreenY = 0
    if (ch.isSeated && ch.dir === Direction.UP && overlayGidLayers && overlayLayoutCols) {
      const seatTileY = Math.floor(ch.y / TILE_SIZE)
      const col = ch.tileCol
      const fbLayer = overlayGidLayers[1] // FURNITURE_BASE
      const ftLayer = overlayGidLayers[2] // FURNITURE_TOP
      // Scan 1-2 rows above seat for desk tiles in either furniture layer
      let hasDeskAbove = false
      for (let delta = 1; delta <= 2 && !hasDeskAbove; delta++) {
        const checkRow = seatTileY - delta
        if (checkRow < 0) continue
        const idx = checkRow * overlayLayoutCols + col
        if ((fbLayer && (fbLayer[idx] ?? 0) !== 0) ||
            (ftLayer && (ftLayer[idx] ?? 0) !== 0)) {
          hasDeskAbove = true
        }
      }
      if (hasDeskAbove) {
        isUpSitting = true
        // If FURNITURE_TOP has a covering tile at the seat row (e.g. workspace
        // chair backs), allow a 1/3-tile offset for smoother look. Otherwise
        // clip at exact tile boundary to avoid a gap.
        const hasCoveringTile = ftLayer
          ? (ftLayer[seatTileY * overlayLayoutCols + col] ?? 0) !== 0
          : false
        const offset = hasCoveringTile ? TILE_SIZE / 3 : 0
        clipScreenY = Math.round(offsetY + (seatTileY * TILE_SIZE - offset) * zoom)
      }
    }

    if (isSelected || isHovered) {
      // White outline for selected/hovered
      const outlineAlpha = isSelected ? SELECTED_OUTLINE_ALPHA : HOVERED_OUTLINE_ALPHA
      const outlineData = getOutlineSprite(spriteData)
      const outlineCached = getCachedSprite(outlineData, charZoom)
      const olDrawX = drawX - charZoom  // 1 sprite-pixel offset, scaled
      const olDrawY = drawY - charZoom  // outline follows sitting offset via drawY
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET, // sort just before character
        draw: (c) => {
          c.save()
          if (isUpSitting) {
            c.beginPath()
            c.rect(0, 0, c.canvas.width, clipScreenY)
            c.clip()
          }
          c.globalAlpha = outlineAlpha
          c.drawImage(outlineCached, olDrawX, olDrawY)
          c.restore()
        },
      })
    } else if (ch.isPlayerControlled) {
      // CEO gold glow outline (always-on when not selected/hovered)
      const goldOutlineData = getGoldOutlineSprite(spriteData)
      const goldOutlineCached = getCachedSprite(goldOutlineData, charZoom)
      const olDrawX = drawX - charZoom
      const olDrawY = drawY - charZoom
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET,
        draw: (c) => {
          c.save()
          if (isUpSitting) {
            c.beginPath()
            c.rect(0, 0, c.canvas.width, clipScreenY)
            c.clip()
          }
          c.globalAlpha = CEO_GLOW_ALPHA
          c.drawImage(goldOutlineCached, olDrawX, olDrawY)
          c.restore()
        },
      })
    } else if (ch.isNearPlayer) {
      // Proximity highlight: soft gold pulse for nearby non-CEO agents
      const goldOutlineData = getGoldOutlineSprite(spriteData)
      const goldOutlineCached = getCachedSprite(goldOutlineData, charZoom)
      const olDrawX = drawX - charZoom
      const olDrawY = drawY - charZoom
      const t = time ?? 0
      const pulseAlpha = PROXIMITY_HIGHLIGHT_BASE_ALPHA
        + PROXIMITY_HIGHLIGHT_PULSE_AMPLITUDE * Math.sin(t * PROXIMITY_HIGHLIGHT_PULSE_SPEED)
      drawables.push({
        zY: charZY - OUTLINE_Z_SORT_OFFSET,
        draw: (c) => {
          c.save()
          if (isUpSitting) {
            c.beginPath()
            c.rect(0, 0, c.canvas.width, clipScreenY)
            c.clip()
          }
          c.globalAlpha = pulseAlpha
          c.drawImage(goldOutlineCached, olDrawX, olDrawY)
          c.restore()
        },
      })
    }

    // No alpha dimming — all agents render at full opacity
    const charAlpha = 1.0

    drawables.push({
      zY: charZY,
      draw: (c) => {
        const needsAlpha = charAlpha < 1.0
        if (isUpSitting || needsAlpha) {
          c.save()
          if (needsAlpha) c.globalAlpha = charAlpha
          if (isUpSitting) {
            c.beginPath()
            c.rect(0, 0, c.canvas.width, clipScreenY)
            c.clip()
          }
        }
        c.drawImage(cached, drawX, drawY)
        if (isUpSitting || needsAlpha) {
          c.restore()
        }
      },
    })

    // CEO crown: draw above the character sprite
    if (ch.isPlayerControlled) {
      const crownCached = getCachedSprite(CEO_CROWN_SPRITE, zoom * CHARACTER_SPRITE_SCALE)
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
  /** Map from character id to interaction partner + type */
  interactionMap: Map<number, {partnerId: number, type: InteractionType}>
  /** Map from character id to idle tier (only set for idle agents) */
  idleTierMap: Map<number, import('../pixel-types').IdleTier>
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

/** Check if two rects overlap by more than threshold of the smaller rect's area */
function platesOverlap(a: PlateRect, b: PlateRect, threshold: number): boolean {
  const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const overlapArea = overlapX * overlapY
  const smallerArea = Math.min(a.w * a.h, b.w * b.h)
  return smallerArea > 0 && overlapArea > smallerArea * threshold
}

/** Status dot color for inline rendering inside pills.
 *  Idle status uses composite keys: 'idle-recent', 'idle-moderate', 'idle-long'. */
const PILL_DOT_COLORS: Record<string, string> = {
  working: '#22c55e',
  'idle-recent': '#6b9e76',
  'idle-moderate': '#f59e0b',
  'idle-long': '#9ca3af',
  idle: '#9ca3af',         // fallback for idle with unknown tier
  offline: '#4b5563',
}

/** Single plate entry before grouping */
interface PlateEntry {
  ch: Character
  name: string
  status: AgentStatus | undefined
  color: string
  textWidth: number
  screenX: number
  screenY: number
  centerX: number
  rect: PlateRect
}

/** Merged group of plates for co-located agents */
interface PlateGroup {
  entries: PlateEntry[]
  displayText: string
  anyWorking: boolean
  hasStatus: boolean
  nameColor: string
  avgCenterX: number
  avgScreenY: number
}

// ── Emoji icon maps for identity plate rendering ─────────────────

/** Status icons (default fallback when no interaction/activity).
 *  Idle tiers use composite keys: 'idle-recent' (no emoji), 'idle-moderate', 'idle-long'. */
const STATUS_EMOJI: Record<string, string> = {
  working: '\uD83D\uDCBB',         // laptop computer
  'idle-recent': '\uD83D\uDCF1',   // mobile phone (checking phone)
  'idle-moderate': '\uD83E\uDD71', // yawning face
  // idle-long: deliberately absent — wandering agents show ACTIVITY emoji instead
  idle: '\uD83D\uDCF1',             // fallback (phone)
  offline: '\uD83D\uDCA4',          // zzz (sleeping)
}

/** Interaction icons (pipeline activities) */
const INTERACTION_EMOJI: Record<string, string> = {
  planning: '\uD83D\uDCCB',     // clipboard
  brainstorming: '\uD83D\uDCA1', // lightbulb
  building: '\uD83D\uDD28',      // hammer
  reviewing: '\uD83D\uDD0D',     // magnifying glass
  auditing: '\uD83D\uDEE1\uFE0F', // shield
}

/** Activity icons (furniture interactions) */
const ACTIVITY_EMOJI: Record<string, string> = {
  [FurnitureActivityType.WATCHING_TV]: '\uD83D\uDCFA',      // TV
  [FurnitureActivityType.READING]: '\uD83D\uDCD6',           // book
  [FurnitureActivityType.LOUNGING]: '\uD83D\uDECB\uFE0F',   // couch and lamp
  [FurnitureActivityType.VENDING]: '\u2615',                  // coffee
  [FurnitureActivityType.ARCADE]: '\uD83C\uDFAE',            // gamepad
  [FurnitureActivityType.EXERCISING]: '\uD83D\uDCAA',        // flexed biceps
  [FurnitureActivityType.PLAYING_POOL]: '\uD83C\uDFB1',      // pool ball
  [FurnitureActivityType.PLAYING_PINGPONG]: '\uD83C\uDFD3',  // table tennis
}

/** Resolve a status + idle-tier into a composite key for PILL_DOT_COLORS / STATUS_EMOJI lookups.
 *  'working' -> 'working', 'idle' + 'recent' -> 'idle-recent', 'offline' -> 'offline'. */
function statusDotKey(status: AgentStatus, idleTier?: import('../pixel-types').IdleTier): string {
  if (status === 'idle' && idleTier) return `idle-${idleTier}`
  return status
}

/** Determine the best emoji icon for a character.
 *  Priority: interaction > activity > chat emoji > status > none */
function getCharacterEmoji(
  chId: number,
  ch: Character,
  identity: IdentityOverlay,
): string | null {
  // 1. Interaction (pipeline activity)
  const interaction = identity.interactionMap.get(chId)
  if (interaction) {
    return INTERACTION_EMOJI[interaction.type] ?? null
  }
  // 2. Furniture activity
  if (ch.state === CharacterState.ACTIVITY && ch.activityType) {
    return ACTIVITY_EMOJI[ch.activityType] ?? null
  }
  // 3. Social chat emoji (visible phase only)
  if (ch.chatEmoji && ch.chatEmojiVisible) {
    return ch.chatEmoji
  }
  // 4. Status (with idle tier)
  const status = identity.statusMap.get(chId)
  if (status) {
    const tier = identity.idleTierMap.get(chId)
    const key = statusDotKey(status, tier)
    return STATUS_EMOJI[key] ?? STATUS_EMOJI[status] ?? null
  }
  return null
}

/** Determine the best emoji icon for a merged group.
 *  Priority: interaction > activity > chat emoji > status > none.
 *  Returns the icon of the highest-priority member. */
function getGroupEmoji(
  entries: PlateEntry[],
  identity: IdentityOverlay,
): string | null {
  // Check for any interaction first
  for (const e of entries) {
    const interaction = identity.interactionMap.get(e.ch.id)
    if (interaction) {
      return INTERACTION_EMOJI[interaction.type] ?? null
    }
  }
  // Check for any activity
  for (const e of entries) {
    if (e.ch.state === CharacterState.ACTIVITY && e.ch.activityType) {
      return ACTIVITY_EMOJI[e.ch.activityType] ?? null
    }
  }
  // Check for any chat emoji
  for (const e of entries) {
    if (e.ch.chatEmoji && e.ch.chatEmojiVisible) {
      return e.ch.chatEmoji
    }
  }
  // Fall back to status
  for (const e of entries) {
    if (e.status) {
      return STATUS_EMOJI[e.status] ?? null
    }
  }
  return null
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
  // On mobile (low zoom), use a minimum pill scale so text stays readable.
  // Pills scale with zoom on desktop but never shrink below pillZoom on mobile.
  const PILL_MIN_ZOOM = 0.7
  const pillZoom = Math.max(zoom, PILL_MIN_ZOOM)

  // Set up font for measurement (consistent across all plates)
  const fontSize = Math.round(11 * pillZoom)
  const fontStr = `bold ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`
  ctx.font = fontStr

  // Pre-zoom constants (use pillZoom for sizing, zoom for positioning)
  const padX = Math.floor(IDENTITY_PLATE_PAD_X * pillZoom)
  const padY = Math.floor(IDENTITY_PLATE_PAD_Y * pillZoom)
  const scaledH = Math.floor(IDENTITY_PLATE_HEIGHT * pillZoom)
  const dotRadius = Math.floor(STATUS_DOT_RADIUS * pillZoom)
  const dotGap = Math.floor(STATUS_DOT_GAP * pillZoom)
  const cornerRadius = Math.floor(IDENTITY_PLATE_CORNER_RADIUS * pillZoom)

  // Emoji icon sizing: slightly smaller than name font so it fits inside the pill
  const emojiFontSize = Math.round(10 * pillZoom)
  const emojiFont = `${emojiFontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  const iconGap = Math.floor(3 * pillZoom)  // gap between icon and name text

  // ── Phase 1: Compute plate entries ──
  const plates: PlateEntry[] = []

  for (const ch of characters) {
    if (ch.matrixEffect) continue

    const name = identity.nameMap.get(ch.id)
    if (!name) continue

    const status = identity.statusMap.get(ch.id)

    // Measure text width
    const metrics = ctx.measureText(name)
    const textWidth = Math.ceil(metrics.width)

    // Determine emoji icon for this character
    const emoji = getCharacterEmoji(ch.id, ch, identity)

    // Measure emoji width if present
    let emojiWidth = 0
    if (emoji) {
      ctx.font = emojiFont
      emojiWidth = Math.ceil(ctx.measureText(emoji).width)
      ctx.font = fontStr  // restore
    }

    // Pill width: padX + [icon + iconGap] + text + [dotGap + dotDiameter] + padX
    const iconSpace = emoji ? (emojiWidth + iconGap) : 0
    const dotSpace = status ? (dotGap + dotRadius * 2) : 0
    const plateW = padX + iconSpace + textWidth + dotSpace + padX

    // Position: centered above character head
    const sittingOff = ch.state === CharacterState.TYPE ? NAME_LABEL_SITTING_OFFSET_PX : 0
    const centerX = offsetX + ch.x * zoom
    const bottomY = offsetY + (ch.y + sittingOff - NAME_LABEL_VERTICAL_OFFSET_PX) * zoom

    const screenX = Math.floor(centerX - plateW / 2)
    const screenY = Math.floor(bottomY - scaledH)

    plates.push({
      ch,
      name,
      status,
      color: identity.colorMap.get(ch.id) ?? '#FFFFFF',
      textWidth,
      screenX,
      screenY,
      centerX,
      rect: { x: screenX, y: screenY, w: plateW, h: scaledH },
    })
  }

  // ── Phase 2: Greedy clustering for co-located agents ──
  // Group plates that overlap >70% of the smaller plate's area.
  const grouped = new Set<number>()
  const groups: PlateGroup[] = []

  for (let i = 0; i < plates.length; i++) {
    if (grouped.has(i)) continue

    const cluster: number[] = [i]
    grouped.add(i)

    // Greedily absorb overlapping plates
    for (let j = i + 1; j < plates.length; j++) {
      if (grouped.has(j)) continue
      // Check overlap against any member of the current cluster
      let overlaps = false
      for (const ci of cluster) {
        if (platesOverlap(plates[ci].rect, plates[j].rect, 0.7)) {
          overlaps = true
          break
        }
      }
      if (overlaps) {
        cluster.push(j)
        grouped.add(j)
      }
    }

    const entries = cluster.map(idx => plates[idx])
    const anyWorking = entries.some(e => e.status === 'working')
    const hasStatus = entries.some(e => e.status !== undefined)

    // Build display text
    let displayText: string
    if (entries.length === 1) {
      displayText = entries[0].name
    } else if (entries.length <= 3) {
      displayText = entries.map(e => e.name).join(', ')
    } else {
      // 4+ agents: show first 2 + "+N more"
      displayText = entries.slice(0, 2).map(e => e.name).join(', ') + ` +${entries.length - 2} more`
    }

    // Average position for merged pill
    const avgCenterX = entries.reduce((sum, e) => sum + e.centerX, 0) / entries.length
    const avgScreenY = entries.reduce((sum, e) => sum + e.screenY, 0) / entries.length

    // Use first entry's color for single agents, white for merged groups
    const nameColor = entries.length === 1 ? entries[0].color : '#FFFFFF'

    groups.push({ entries, displayText, anyWorking, hasStatus, nameColor, avgCenterX, avgScreenY })
  }

  // ── Phase 3: Render grouped pills ──
  for (const group of groups) {
    const isMerged = group.entries.length > 1
    const isSelected = !isMerged && group.entries[0].ch.id === selectedId

    // Determine emoji icon for this group
    const groupEmoji = isMerged
      ? getGroupEmoji(group.entries, identity)
      : getCharacterEmoji(group.entries[0].ch.id, group.entries[0].ch, identity)

    // Measure emoji width if present
    let groupEmojiWidth = 0
    if (groupEmoji) {
      ctx.font = emojiFont
      groupEmojiWidth = Math.ceil(ctx.measureText(groupEmoji).width)
    }

    // Measure merged display text
    ctx.font = fontStr
    const displayMetrics = ctx.measureText(group.displayText)
    const displayTextW = Math.ceil(displayMetrics.width)

    // Compute pill dimensions: padX + [icon + iconGap] + text + [dotGap + dot] + padX
    const iconSpace = groupEmoji ? (groupEmojiWidth + iconGap) : 0
    const dotSpace = group.hasStatus ? (dotGap + dotRadius * 2) : 0
    const pillW = padX + iconSpace + displayTextW + dotSpace + padX
    const pillH = scaledH

    // Position: centered at average X, at average Y
    const pillX = Math.floor(group.avgCenterX - pillW / 2)
    const pillY = Math.floor(group.avgScreenY)

    ctx.save()

    // ── Rounded pill background ──
    ctx.fillStyle = `rgba(0, 0, 0, ${IDENTITY_PLATE_BG_ALPHA})`
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, cornerRadius)
    ctx.fill()

    // Track cursor position for left-to-right layout
    let cursorX = pillX + padX
    const centerY = pillY + Math.floor(pillH / 2)

    // ── Emoji icon (LEFT of name) ──
    if (groupEmoji) {
      ctx.font = emojiFont
      ctx.fillStyle = '#FFFFFF'
      ctx.textBaseline = 'middle'
      ctx.fillText(groupEmoji, cursorX, centerY)
      cursorX += groupEmojiWidth + iconGap
    }

    // ── Name text (agent brand color, vertically centered) ──
    ctx.font = fontStr
    ctx.fillStyle = group.nameColor
    ctx.textBaseline = 'middle'
    ctx.fillText(group.displayText, cursorX, centerY)

    // ── Inline status dot (RIGHT of text) ──
    if (group.hasStatus) {
      let dotColor: string | null
      if (isMerged) {
        dotColor = group.anyWorking ? PILL_DOT_COLORS.working : PILL_DOT_COLORS.idle
      } else {
        const e0 = group.entries[0]
        const s = e0.status ?? ''
        const tier = identity.idleTierMap.get(e0.ch.id)
        const key = s === 'idle' && tier ? `idle-${tier}` : s
        dotColor = PILL_DOT_COLORS[key] ?? PILL_DOT_COLORS[s] ?? null
      }

      if (dotColor) {
        const dotCenterX = cursorX + displayTextW + dotGap + dotRadius
        const dotCenterY = centerY
        ctx.beginPath()
        ctx.arc(dotCenterX, dotCenterY, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }
    }

    ctx.restore()

    // ── Task info card (single-agent working only, suppress for merged groups and mobile) ──
    const isMobileZoom = zoom < 0.8
    if (!isMerged && !isMobileZoom) {
      const entry = group.entries[0]
      const status = entry.status
      if (status === 'working' || isSelected) {
        const rawTask = identity.taskTextMap.get(entry.ch.id)
        if (rawTask && rawTask.length > 0) {
          const taskText = rawTask.length > 30 ? rawTask.slice(0, 28) + '..' : rawTask
          const taskFontSize = Math.max(9, Math.round(pillZoom * 3.5))
          ctx.font = `${taskFontSize}px monospace`
          const taskMetrics = ctx.measureText(taskText)
          const tPadX = Math.round(pillZoom * 6)
          const tPadY = Math.round(pillZoom * 3)
          const cardW = Math.ceil(taskMetrics.width) + tPadX * 2
          const cardH = taskFontSize + tPadY * 2
          const gap = Math.floor(1 * zoom)
          const cardX = Math.floor(pillX + pillW / 2 - cardW / 2)
          const cardY = pillY + pillH + gap

          // Dark card background with rounded corners
          ctx.fillStyle = 'rgba(61, 43, 31, 0.9)'
          ctx.beginPath()
          ctx.roundRect(cardX, cardY, cardW, cardH, Math.floor(cornerRadius * 0.5))
          ctx.fill()

          // Gold text
          ctx.fillStyle = '#C4A265'
          ctx.textBaseline = 'top'
          ctx.fillText(taskText, cardX + tPadX, cardY + tPadY)
        }
      }
    }
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

    const cached = getCachedSprite(sprite, zoom * CHARACTER_SPRITE_SCALE)
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
  const animTimeSec = identity?.time ?? 0
  renderTileGrid(ctx, tileMap, offsetX, offsetY, zoom, tileColors, layoutCols, gidLayers, animTimeSec)

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

  // Draw furniture + characters + GID overlay tiles (all z-sorted together)
  const selectedId = selection?.selectedAgentId ?? null
  const hoveredId = selection?.hoveredAgentId ?? null
  const sceneTime = identity?.time
  const tmRows = tileMap.length
  const tmCols = tmRows > 0 ? tileMap[0].length : 0
  renderScene(
    ctx, furniture, characters, offsetX, offsetY, zoom, selectedId, hoveredId, sceneTime,
    useGidMode ? gidLayers : undefined,
    layoutCols ?? tmCols,
    tmRows,
    tmCols,
    animTimeSec,
  )

  // Identity plates (above characters, below bubbles)
  if (identity) {
    renderIdentityPlates(ctx, characters, offsetX, offsetY, zoom, identity, selectedId)
  }

  // Speech bubbles (always on top of characters)
  renderBubbles(ctx, characters, offsetX, offsetY, zoom)

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
