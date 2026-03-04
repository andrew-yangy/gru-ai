// ---------------------------------------------------------------------------
// Tileset Cache — pre-renders tiles from room-builder.png + furniture.png
// for direct TMX GID rendering (bypasses auto-tile + colorize systems)
// ---------------------------------------------------------------------------

import { TILE_SIZE } from './pixel-types'

/** Pre-rendered tile canvases indexed by GID (1-based, matching TMX convention) */
const tileCanvases: Map<number, HTMLCanvasElement> = new Map()
let loaded = false

/** Check if tileset is loaded */
export function hasTilesetCache(): boolean {
  return loaded
}

/** Get a pre-rendered tile canvas by TMX GID (1-based) */
export function getTileCanvas(gid: number): HTMLCanvasElement | null {
  return tileCanvases.get(gid) ?? null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Extract all tiles from a tileset image and store with GID offset */
function extractTiles(img: HTMLImageElement, firstGid: number): number {
  const cols = Math.floor(img.width / TILE_SIZE)
  const rows = Math.floor(img.height / TILE_SIZE)

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = img.width
  srcCanvas.height = img.height
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.drawImage(img, 0, 0)

  let count = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gid = firstGid + r * cols + c
      const tile = document.createElement('canvas')
      tile.width = TILE_SIZE
      tile.height = TILE_SIZE
      const ctx = tile.getContext('2d')!
      ctx.drawImage(srcCanvas, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE)
      tileCanvases.set(gid, tile)
      count++
    }
  }
  return count
}

/**
 * Load room-builder.png (firstgid=1) and furniture.png (firstgid=225).
 * GIDs match the TMX convention used by Tiled.
 */
export async function loadTilesetCache(): Promise<void> {
  if (loaded) return
  try {
    const [rbImg, furnImg] = await Promise.all([
      loadImage('/assets/office/room-builder.png'),
      loadImage('/assets/office/furniture.png'),
    ])

    const rbCount = extractTiles(rbImg, 1)      // room-builder: GIDs 1-224
    const fnCount = extractTiles(furnImg, 225)   // furniture: GIDs 225-1072

    loaded = true
    console.log(`✓ Tileset cache: ${rbCount} room-builder + ${fnCount} furniture = ${tileCanvases.size} tiles`)
  } catch (e) {
    console.warn('Failed to load tileset cache:', e)
  }
}

/** Scaled tile cache: zoom level → (gid → scaled canvas) */
const scaledCache = new Map<number, Map<number, HTMLCanvasElement>>()

/** Get a tile canvas scaled to the current zoom level */
export function getScaledTileCanvas(gid: number, zoom: number): HTMLCanvasElement | null {
  const base = tileCanvases.get(gid)
  if (!base) return null

  if (zoom === 1) return base

  const zoomKey = Math.round(zoom * 100)

  let zoomMap = scaledCache.get(zoomKey)
  if (!zoomMap) {
    zoomMap = new Map()
    scaledCache.set(zoomKey, zoomMap)
  }

  let scaled = zoomMap.get(gid)
  if (scaled) return scaled

  const size = Math.round(TILE_SIZE * zoom)
  scaled = document.createElement('canvas')
  scaled.width = size
  scaled.height = size
  const ctx = scaled.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(base, 0, 0, size, size)
  zoomMap.set(gid, scaled)

  return scaled
}
