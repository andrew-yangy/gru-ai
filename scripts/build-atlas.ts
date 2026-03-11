#!/usr/bin/env npx tsx
// ---------------------------------------------------------------------------
// build-atlas.ts — Extract only used tiles into a single atlas PNG
//
// Reads the generated TMX data to find all GIDs used in layers + animations,
// extracts those 48x48 tiles from the source tileset PNGs, packs them into
// a single atlas PNG, and generates a TypeScript mapping file.
//
// Usage: npx tsx scripts/build-atlas.ts
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { PNG } from 'pngjs'

const ROOT = resolve(process.cwd())
const ASSETS_DIR = resolve(ROOT, 'public/assets/office')
const OUT_MAP = resolve(ROOT, 'src/components/game/generated/atlas-map.ts')
const OUT_ATLAS = resolve(ASSETS_DIR, 'atlas.png')
const TILE = 48

// ---------------------------------------------------------------------------
// 1. Import TMX data (via dynamic import of the generated TS)
// ---------------------------------------------------------------------------

async function main() {
  const tmxData = await import(resolve(ROOT, 'src/components/game/generated/office-tmx-data.ts'))

  const {
    FLOOR, FURNITURE_BASE, FURNITURE_TOP, DECO,
    TILESET_REGISTRY, INLINE_TILESETS, ANIMATED_TILE_DEFS,
  } = tmxData

  // ---------------------------------------------------------------------------
  // 2. Collect all used GIDs
  // ---------------------------------------------------------------------------

  const usedGids = new Set<number>()

  // From tile layers
  for (const layer of [FLOOR, FURNITURE_BASE, FURNITURE_TOP, DECO]) {
    for (const gid of layer) {
      if (gid !== 0) usedGids.add(gid)
    }
  }

  // From animation frames (so animated tiles cycle correctly)
  for (const anim of ANIMATED_TILE_DEFS) {
    for (const gid of anim.frames) {
      usedGids.add(gid)
    }
  }

  // Floor pattern tiles (used by loadFloorAssets for grayscale extraction)
  // room-builder.png has firstgid=1249, 76 columns
  const ROOM_BUILDER_FIRSTGID = 1249
  const ROOM_BUILDER_COLS = 76
  const FLOOR_TILE_POSITIONS: [number, number][] = [
    [11, 10], [11, 6], [1, 5], [14, 6], [14, 7], [11, 8], [1, 9],
  ]
  const floorPatternGids: number[] = []
  for (const [col, row] of FLOOR_TILE_POSITIONS) {
    const gid = ROOM_BUILDER_FIRSTGID + row * ROOM_BUILDER_COLS + col
    floorPatternGids.push(gid)
    usedGids.add(gid)
  }

  console.log(`Total unique GIDs to extract: ${usedGids.size}`)

  // ---------------------------------------------------------------------------
  // 3. Build tileset lookup: GID → { filename, localCol, localRow }
  // ---------------------------------------------------------------------------

  interface TilesetInfo {
    filename: string
    firstgid: number
    cols: number
    rows: number
  }

  // Merge registry + inline, deduplicate by firstgid
  const allTilesets: TilesetInfo[] = []
  const seenFirstgids = new Set<number>()

  for (const ts of TILESET_REGISTRY) {
    if (seenFirstgids.has(ts.firstgid)) continue
    seenFirstgids.add(ts.firstgid)
    // We'll determine cols/rows from the actual image
    allTilesets.push({ filename: ts.filename, firstgid: ts.firstgid, cols: 0, rows: 0 })
  }
  for (const ts of INLINE_TILESETS) {
    if (seenFirstgids.has(ts.firstgid)) continue
    seenFirstgids.add(ts.firstgid)
    allTilesets.push({ filename: ts.filename, firstgid: ts.firstgid, cols: ts.cols, rows: ts.rows })
  }

  allTilesets.sort((a, b) => a.firstgid - b.firstgid)

  // ---------------------------------------------------------------------------
  // 4. Load tileset PNGs
  // ---------------------------------------------------------------------------

  interface LoadedTileset {
    png: PNG
    firstgid: number
    cols: number
    rows: number
    tileCount: number
  }

  const loadedTilesets = new Map<string, LoadedTileset>()

  for (const ts of allTilesets) {
    if (loadedTilesets.has(ts.filename)) {
      // Already loaded (same PNG used by multiple firstgids, e.g. bathroom cabinet)
      continue
    }

    const path = resolve(ASSETS_DIR, ts.filename)
    try {
      const data = readFileSync(path)
      const png = PNG.sync.read(data)
      const cols = Math.floor(png.width / TILE)
      const rows = Math.floor(png.height / TILE)
      loadedTilesets.set(ts.filename, {
        png, firstgid: ts.firstgid, cols, rows, tileCount: cols * rows,
      })
      console.log(`  Loaded ${ts.filename}: ${cols}x${rows} tiles (${png.width}x${png.height}px)`)
    } catch {
      console.warn(`  SKIP ${ts.filename}: file not found`)
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Resolve each GID to source tileset + local position
  // ---------------------------------------------------------------------------

  interface TileRef {
    gid: number
    filename: string
    localCol: number
    localRow: number
  }

  const tileRefs: TileRef[] = []
  const sortedGids = [...usedGids].sort((a, b) => a - b)

  for (const gid of sortedGids) {
    // Find which tileset this GID belongs to (last tileset where firstgid <= gid)
    let bestTs: TilesetInfo | null = null
    for (const ts of allTilesets) {
      if (ts.firstgid <= gid) bestTs = ts
      else break
    }
    if (!bestTs) {
      console.warn(`  No tileset for GID ${gid}`)
      continue
    }

    const loaded = loadedTilesets.get(bestTs.filename)
    if (!loaded) continue

    const localId = gid - bestTs.firstgid
    if (localId < 0 || localId >= loaded.tileCount) continue

    const localCol = localId % loaded.cols
    const localRow = Math.floor(localId / loaded.cols)
    tileRefs.push({ gid, filename: bestTs.filename, localCol, localRow })
  }

  console.log(`Resolved ${tileRefs.length} tile references`)

  // ---------------------------------------------------------------------------
  // 6. Pack into atlas
  // ---------------------------------------------------------------------------

  const ATLAS_COLS = 20
  const atlasRows = Math.ceil(tileRefs.length / ATLAS_COLS)
  const atlasWidth = ATLAS_COLS * TILE
  const atlasHeight = atlasRows * TILE

  console.log(`Atlas: ${ATLAS_COLS}x${atlasRows} tiles (${atlasWidth}x${atlasHeight}px)`)

  const atlas = new PNG({ width: atlasWidth, height: atlasHeight })
  // Initialize to transparent
  atlas.data.fill(0)

  const gidToAtlas = new Map<number, [number, number]>()

  for (let i = 0; i < tileRefs.length; i++) {
    const ref = tileRefs[i]
    const loaded = loadedTilesets.get(ref.filename)!
    const src = loaded.png

    const atlasCol = i % ATLAS_COLS
    const atlasRow = Math.floor(i / ATLAS_COLS)
    gidToAtlas.set(ref.gid, [atlasCol, atlasRow])

    // Copy tile pixels
    const srcX = ref.localCol * TILE
    const srcY = ref.localRow * TILE
    const dstX = atlasCol * TILE
    const dstY = atlasRow * TILE

    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const srcIdx = ((srcY + y) * src.width + (srcX + x)) * 4
        const dstIdx = ((dstY + y) * atlasWidth + (dstX + x)) * 4
        atlas.data[dstIdx] = src.data[srcIdx]
        atlas.data[dstIdx + 1] = src.data[srcIdx + 1]
        atlas.data[dstIdx + 2] = src.data[srcIdx + 2]
        atlas.data[dstIdx + 3] = src.data[srcIdx + 3]
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Write atlas PNG
  // ---------------------------------------------------------------------------

  const atlasBuf = PNG.sync.write(atlas, { colorType: 6, deflateLevel: 9 })
  writeFileSync(OUT_ATLAS, atlasBuf)
  console.log(`Written: ${OUT_ATLAS} (${(atlasBuf.length / 1024).toFixed(1)}KB)`)

  // ---------------------------------------------------------------------------
  // 8. Generate atlas-map.ts
  // ---------------------------------------------------------------------------

  // Floor pattern GID array for loadFloorAssets
  const floorPatternEntries = floorPatternGids.map((gid) => {
    const pos = gidToAtlas.get(gid)
    return pos ? `  ${gid},  // atlas [${pos[0]}, ${pos[1]}]` : `  ${gid},`
  }).join('\n')

  const entries = [...gidToAtlas.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gid, [col, row]]) => `  ${gid}: [${col}, ${row}],`)
    .join('\n')

  const mapOutput = `// ---------------------------------------------------------------------------
// AUTO-GENERATED by scripts/build-atlas.ts — DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}
// ---------------------------------------------------------------------------

/** Number of tile columns in atlas.png */
export const ATLAS_COLS = ${ATLAS_COLS}

/** Number of tile rows in atlas.png */
export const ATLAS_ROWS = ${atlasRows}

/** Tile size in pixels */
export const ATLAS_TILE_SIZE = ${TILE}

/** GID → [atlasCol, atlasRow] mapping for all used tiles */
export const ATLAS_MAP: Record<number, [col: number, row: number]> = {
${entries}
}

/**
 * Floor pattern GIDs (for loadFloorAssets grayscale extraction).
 * These correspond to the 7 floor tile patterns from room-builder,
 * now packed into the atlas.
 */
export const FLOOR_PATTERN_GIDS: number[] = [
${floorPatternEntries}
]
`

  mkdirSync(dirname(OUT_MAP), { recursive: true })
  writeFileSync(OUT_MAP, mapOutput, 'utf-8')
  console.log(`Written: ${OUT_MAP}`)
  console.log(`  ${gidToAtlas.size} GID mappings`)
  console.log(`  ${floorPatternGids.length} floor pattern GIDs`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
