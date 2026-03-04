// ---------------------------------------------------------------------------
// Tileset Loader — loads LimeZu Modern Office singles into SpriteData format
// Singles: individual 32×48 PNG files, auto-trimmed to actual content bounds
// ---------------------------------------------------------------------------

import type { SpriteData } from './pixel-types'

const SINGLES_PATH = '/assets/Modern_Office_Revamped_v1.2/4_Modern_Office_singles/16x16/Modern_Office_Singles_'

// ── Which singles to load ───────────────────────────────────────────
export const SINGLES_MAP = {
  // Dark gray office chairs (worker)
  chair_front: 101,
  chair_back: 102,
  chair_left: 103,
  chair_right: 104,
  // Orange executive chairs
  exec_chair_front: 107,
  exec_chair_back: 108,
  exec_chair_left: 109,
  exec_chair_right: 110,
  // Desktop monitors
  monitor_front: 130,
  monitor_left: 131,
  monitor_right: 132,
  // Laptops
  laptop: 129,
  laptop_small: 134,
  // Plants
  plant_small: 99,
  plant_medium: 98,
  plant_tall: 100,
  // Desk lamps
  desk_lamp: 141,
  desk_lamp_alt: 145,
  // Printer
  printer: 149,
  // Whiteboard / screens
  whiteboard: 170,
  tv_screen: 172,
  // Water cooler
  water_cooler: 173,
  // Vending machine
  vending_machine: 175,
  // Server rack
  server_rack: 176,
  // Bookshelves
  bookshelf: 182,
  bookshelf_wide: 195,
  bookshelf_short: 181,
  // Wall art
  wall_art: 164,
  wall_art_small: 96,
  // AC unit
  ac_unit: 196,
  // Filing cabinet
  filing_cabinet: 174,
  // Desk surfaces
  desk_wood: 7,
  desk_wide: 23,
  desk_drawer: 21,
  // Copier / printer station
  copier: 177,
} as const

export type SingleKey = keyof typeof SINGLES_MAP
export type LimeZuSprites = Record<SingleKey, SpriteData>

// ── Helpers ─────────────────────────────────────────────────────────

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

/** Load a single PNG, convert to SpriteData, auto-trim transparent padding */
async function loadSingle(num: number): Promise<SpriteData> {
  const img = await loadImage(SINGLES_PATH + num + '.png')
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const { data } = ctx.getImageData(0, 0, img.width, img.height)
  const w = img.width
  const h = img.height

  // Convert full image to SpriteData
  const sprite: SpriteData = []
  for (let y = 0; y < h; y++) {
    const row: string[] = []
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      row.push(rgbaToHex(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]))
    }
    sprite.push(row)
  }

  // Find bounds of non-transparent pixels
  let top = h, bottom = 0, left = w, right = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (sprite[y][x] !== '') {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  // All transparent — return 1x1 empty
  if (top > bottom) return [['']]

  // Extract trimmed region
  const trimmed: SpriteData = []
  for (let y = top; y <= bottom; y++) {
    trimmed.push(sprite[y].slice(left, right + 1))
  }
  return trimmed
}

// ── Public API ──────────────────────────────────────────────────────

let cached: LimeZuSprites | null = null

/** Load all needed LimeZu singles in parallel */
export async function loadLimeZuSprites(): Promise<LimeZuSprites | null> {
  if (cached) return cached

  try {
    const entries = Object.entries(SINGLES_MAP) as [SingleKey, number][]
    const results = {} as Record<string, SpriteData>

    await Promise.all(
      entries.map(async ([key, num]) => {
        results[key] = await loadSingle(num)
      }),
    )

    cached = results as LimeZuSprites
    console.log(`✓ Loaded ${entries.length} LimeZu furniture sprites`)
    return cached
  } catch (e) {
    console.warn('Failed to load LimeZu sprites:', e)
    return null
  }
}

export function getLimeZuSprites(): LimeZuSprites | null {
  return cached
}

