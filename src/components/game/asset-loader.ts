// ---------------------------------------------------------------------------
// Asset Loader — loads floor tiles and composites character sprites at runtime
// ---------------------------------------------------------------------------

import type { SpriteData } from './pixel-types'
import type { LoadedCharacterData } from './sprites/spriteData'
import type { CharacterAppearance } from '@/stores/agent-registry-store'
import { setFloorSprites } from './floorTiles'
import { setCharacterTemplates } from './sprites/spriteData'
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

// ── Floor Tiles (extracted from atlas via pre-computed GIDs) ──

import { ATLAS_MAP, ATLAS_TILE_SIZE, FLOOR_PATTERN_GIDS } from './generated/atlas-map'

export async function loadFloorAssets(src = '/assets/office/atlas.png'): Promise<void> {
  try {
    const img = await loadImage(src)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    const data = imageData.data

    const sprites: SpriteData[] = []

    for (const gid of FLOOR_PATTERN_GIDS) {
      const pos = ATLAS_MAP[gid]
      if (!pos) continue
      const [col, row] = pos
      const sprite = extractSprite(data, img.width, col * ATLAS_TILE_SIZE, row * ATLAS_TILE_SIZE, ATLAS_TILE_SIZE, ATLAS_TILE_SIZE)
      sprites.push(toGrayscale(sprite))
    }

    setFloorSprites(sprites)
    console.log(`✓ Loaded ${sprites.length} floor tile patterns from atlas`)
  } catch (e) {
    console.warn('Floor atlas not found. Using fallback rendering.')
  }
}

// ── Character Sprites (runtime compositing from MetroCity source sheets) ──

/** MetroCity direction layout: Down(0-5), Right(6-11), Up(12-17), Left(18-23) */
const DIR_COL_OFFSET = { down: 0, right: 6, up: 12 } as const
/** Output row order: Row 0 = down, Row 1 = up, Row 2 = right */
const OUTPUT_DIRS: Array<keyof typeof DIR_COL_OFFSET> = ['down', 'up', 'right']
/** 7-frame output: walk1, walk2, walk3, type1, type2, read1, read2 */
const FRAME_MAP = [1, 0, 4, 0, 0, 0, 0]
const TILE = 32

/**
 * Composite character sprites at runtime from MetroCity source sheets.
 * Each appearance config (bodyRow, hairRow, outfitIndex) produces one
 * LoadedCharacterData with 3 directions × 7 frames.
 *
 * Appearances are indexed by palette number — appearances[0] = palette 0, etc.
 */
export async function loadCharacterAssets(appearances: CharacterAppearance[]): Promise<void> {
  try {
    // Load MetroCity source sheets
    const [bodySheet, hairSheet, ...outfitSheets] = await Promise.all([
      loadImage('/assets/metrocity/Character Model.png'),
      loadImage('/assets/metrocity/Hairs.png'),
      loadImage('/assets/metrocity/Outfit1.png'),
      loadImage('/assets/metrocity/Outfit2.png'),
      loadImage('/assets/metrocity/Outfit3.png'),
      loadImage('/assets/metrocity/Outfit4.png'),
      loadImage('/assets/metrocity/Outfit5.png'),
      loadImage('/assets/metrocity/Outfit6.png'),
    ])

    // Shared compositing canvas
    const comp = document.createElement('canvas')
    comp.width = TILE
    comp.height = TILE
    const compCtx = comp.getContext('2d')!

    const characters: LoadedCharacterData[] = []

    for (const appearance of appearances) {
      const outfitSheet = outfitSheets[appearance.outfitIndex - 1]
      const dirs: Record<string, SpriteData[]> = { down: [], up: [], right: [] }

      for (const dir of OUTPUT_DIRS) {
        const dirColBase = DIR_COL_OFFSET[dir]

        for (const srcFrame of FRAME_MAP) {
          const col = dirColBase + srcFrame

          // Composite: body → outfit → hair (canvas alpha blending)
          compCtx.clearRect(0, 0, TILE, TILE)
          compCtx.drawImage(bodySheet, col * TILE, appearance.bodyRow * TILE, TILE, TILE, 0, 0, TILE, TILE)
          compCtx.drawImage(outfitSheet, col * TILE, 0, TILE, TILE, 0, 0, TILE, TILE)
          compCtx.drawImage(hairSheet, col * TILE, appearance.hairRow * TILE, TILE, TILE, 0, 0, TILE, TILE)

          // Extract SpriteData from composited result
          const imageData = compCtx.getImageData(0, 0, TILE, TILE)
          dirs[dir].push(extractSprite(imageData.data, TILE, 0, 0, TILE, TILE))
        }
      }

      characters.push({ down: dirs.down, up: dirs.up, right: dirs.right })
    }

    setCharacterTemplates(characters)
    console.log(`✓ Composited ${characters.length} character sprites from MetroCity sheets`)
  } catch (e) {
    console.warn('Failed to load MetroCity character sheets:', e)
  }
}

// ── Load all assets ─────────────────────────────────────────────

let loaded = false
let tilesetReady = false

/** Callbacks to fire when tileset sprites are applied to catalog */
const onTilesetReadyCallbacks: Array<() => void> = []

export function onTilesetReady(cb: () => void): void {
  if (tilesetReady) {
    // Assets already loaded (e.g. HMR re-render) — fire immediately
    cb()
    return
  }
  onTilesetReadyCallbacks.push(cb)
}

export function loadAllAssets(appearances: CharacterAppearance[]): void {
  if (loaded) return
  loaded = true
  loadFloorAssets()
  if (appearances.length > 0) {
    loadCharacterAssets(appearances)
  }
  loadTilesetCache().then(() => {
    tilesetReady = true
    for (const cb of onTilesetReadyCallbacks) cb()
  })
}
