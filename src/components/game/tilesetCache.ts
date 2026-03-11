// ---------------------------------------------------------------------------
// Tileset Cache — extracts tiles from a single pre-built atlas PNG
// The atlas contains only the tiles actually used in the layout.
// ---------------------------------------------------------------------------

import { TILE_SIZE } from './pixel-types'
import { ATLAS_MAP, ATLAS_TILE_SIZE } from './generated/atlas-map'

/** Pre-rendered tile canvases indexed by GID (1-based, matching TMX convention) */
const tileCanvases: Map<number, HTMLCanvasElement> = new Map()
let loaded = false

/** Atlas source for lazy extraction */
let atlasCanvas: HTMLCanvasElement | null = null
let atlasCtx: CanvasRenderingContext2D | null = null

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

/** Extract a single tile from the atlas */
function extractTile(gid: number): HTMLCanvasElement | null {
  if (!atlasCanvas || !atlasCtx) return null
  const pos = ATLAS_MAP[gid]
  if (!pos) return null

  const [col, row] = pos
  const tile = document.createElement('canvas')
  tile.width = TILE_SIZE
  tile.height = TILE_SIZE
  const ctx = tile.getContext('2d')!
  ctx.drawImage(
    atlasCanvas,
    col * ATLAS_TILE_SIZE, row * ATLAS_TILE_SIZE,
    ATLAS_TILE_SIZE, ATLAS_TILE_SIZE,
    0, 0, TILE_SIZE, TILE_SIZE,
  )
  tileCanvases.set(gid, tile)
  return tile
}

/** Load the atlas PNG and pre-extract all mapped tiles. */
export async function loadTilesetCache(): Promise<void> {
  if (loaded) return
  try {
    const img = await loadImage('/assets/office/atlas.png')

    atlasCanvas = document.createElement('canvas')
    atlasCanvas.width = img.width
    atlasCanvas.height = img.height
    atlasCtx = atlasCanvas.getContext('2d')!
    atlasCtx.drawImage(img, 0, 0)

    // Pre-extract all mapped tiles
    for (const gidStr of Object.keys(ATLAS_MAP)) {
      const gid = Number(gidStr)
      extractTile(gid)
    }

    loaded = true
    console.log(`✓ Atlas cache: ${tileCanvases.size} tiles extracted from atlas.png`)
  } catch (e) {
    console.warn('Atlas not available. Using fallback rendering.', e)
  }
}

/** Scaled tile cache: zoom level → (gid → scaled canvas) */
const scaledCache = new Map<number, Map<number, HTMLCanvasElement>>()

/** Get a tile canvas scaled to the current zoom level */
export function getScaledTileCanvas(gid: number, zoom: number): HTMLCanvasElement | null {
  let base = tileCanvases.get(gid)
  if (!base) {
    // Lazy extract if not pre-cached
    base = extractTile(gid) ?? undefined
    if (!base) return null
  }

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
