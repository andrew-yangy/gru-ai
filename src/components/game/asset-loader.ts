// ---------------------------------------------------------------------------
// Asset Loader — loads walls.png, characters, LimeZu singles, and floor tiles
// ---------------------------------------------------------------------------

import type { SpriteData } from './pixel-types'
import type { LoadedCharacterData } from './sprites/spriteData'
import { setWallSprites } from './wallTiles'
import { setFloorSprites } from './floorTiles'
import { setCharacterTemplates } from './sprites/spriteData'
import { loadLimeZuSprites } from './tileset-loader'
import { applyTilesetToFurniture } from './layout/furnitureCatalog'
import { loadTilesetCache } from './tilesetCache'

// ── Helpers ─────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < 128) return '' // transparent
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

function extractSprite(
  data: Uint8ClampedArray,
  imgWidth: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): SpriteData {
  const sprite: SpriteData = []
  for (let y = 0; y < sh; y++) {
    const row: string[] = []
    for (let x = 0; x < sw; x++) {
      const idx = ((sy + y) * imgWidth + (sx + x)) * 4
      row.push(rgbaToHex(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]))
    }
    sprite.push(row)
  }
  return sprite
}

/** Convert a sprite to grayscale (for floor tiles that will be colorized) */
function toGrayscale(sprite: SpriteData): SpriteData {
  return sprite.map((row) =>
    row.map((hex) => {
      if (!hex) return ''
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      const h = gray.toString(16).padStart(2, '0')
      return `#${h}${h}${h}`
    }),
  )
}

// ── Wall Sprites (walls.png: 64x128, 16 tiles at 16x32) ────────

export async function loadWallAssets(src = '/assets/walls.png'): Promise<void> {
  try {
    const img = await loadImage(src)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    const data = imageData.data

    const TILE_W = 16
    const TILE_H = 32
    const cols = img.width / TILE_W   // 4
    const rows = img.height / TILE_H  // 4

    const sprites: SpriteData[] = []
    // Bitmask order: row-major (top-to-bottom, left-to-right) = indices 0..15
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        sprites.push(extractSprite(data, img.width, c * TILE_W, r * TILE_H, TILE_W, TILE_H))
      }
    }

    setWallSprites(sprites)
  } catch (e) {
    console.warn('Failed to load wall sprites:', e)
  }
}

// ── Floor Tiles (room-builder.png: 256x224, 16x14 grid of 16px tiles) ──

/**
 * Extract floor tile patterns from the LimeZu room-builder.png.
 * The room-builder is a 16x14 grid of 16px tiles. Rows 5-12 contain
 * floor/carpet patterns in groups. We pick center tiles from 7 distinct
 * pattern groups and convert to grayscale for colorization.
 *
 * Floor tile positions (col, row) — center tiles from each pattern group:
 *  1. (5, 5)  — smooth blue/purple carpet
 *  2. (1, 7)  — textured gray stone
 *  3. (5, 7)  — smooth concrete
 *  4. (11,7)  — dark gray tile
 *  5. (14,7)  — warm brown/wood
 *  6. (11,8)  — medium dark tile
 *  7. (1, 9)  — brick/stone warm
 */
const FLOOR_TILE_POSITIONS: Array<[col: number, row: number]> = [
  [11, 10], // FLOOR_1: left room (warm brown, rb cols 10-12 center)
  [11, 6],  // FLOOR_2: right room / open area (gray stone)
  [1, 5],   // FLOOR_3: bottom transition (purple/cool)
  [14, 6],  // FLOOR_4: bottom corridor (brick/red)
  [14, 7],  // FLOOR_5: (spare)
  [11, 8],  // FLOOR_6: (spare)
  [1, 9],   // FLOOR_7: (spare)
]

export async function loadFloorAssets(src = '/assets/office/room-builder.png'): Promise<void> {
  try {
    const img = await loadImage(src)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    const data = imageData.data

    const TILE = 16
    const sprites: SpriteData[] = []

    for (const [col, row] of FLOOR_TILE_POSITIONS) {
      const sprite = extractSprite(data, img.width, col * TILE, row * TILE, TILE, TILE)
      sprites.push(toGrayscale(sprite))
    }

    setFloorSprites(sprites)
    console.log(`✓ Loaded ${sprites.length} floor tile patterns from room-builder.png`)
  } catch (e) {
    console.warn('Failed to load floor tiles:', e)
  }
}

// ── Character Sprites (old: char_0..5.png, new: LimeZu Modern Interiors) ──

export async function loadCharacterAssets(basePath = '/assets/characters'): Promise<void> {
  try {
    const characters: LoadedCharacterData[] = []

    for (let i = 0; i < 12; i++) {
      const img = await loadImage(`${basePath}/char_${i}.png`)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const data = imageData.data

      const FRAME_W = 16
      const FRAME_H = 32
      const FRAMES = 7 // 0-2=walk, 3-4=type, 5-6=read

      const dirs: SpriteData[][] = [[], [], []] // down, up, right
      for (let dir = 0; dir < 3; dir++) {
        for (let frame = 0; frame < FRAMES; frame++) {
          dirs[dir].push(
            extractSprite(data, img.width, frame * FRAME_W, dir * FRAME_H, FRAME_W, FRAME_H),
          )
        }
      }

      characters.push({ down: dirs[0], up: dirs[1], right: dirs[2] })
    }

    setCharacterTemplates(characters)
  } catch (e) {
    console.warn('Failed to load character sprites:', e)
  }
}

// ── Load all assets ─────────────────────────────────────────────

let loaded = false

/** Callbacks to fire when tileset sprites are applied to catalog */
const onTilesetReadyCallbacks: Array<() => void> = []

export function onTilesetReady(cb: () => void): void {
  onTilesetReadyCallbacks.push(cb)
}

export function loadAllAssets(): void {
  if (loaded) return
  loaded = true
  loadWallAssets()
  loadFloorAssets()
  loadCharacterAssets() // char_0..11.png for all agents
  loadTilesetCache() // Load room-builder.png tiles for direct TMX rendering
  loadLimeZuSprites().then((sprites) => {
    if (sprites) {
      applyTilesetToFurniture(sprites)
      for (const cb of onTilesetReadyCallbacks) cb()
    }
  })
}
