import type { SpriteData } from '../pixel-types'

// ── Status Icon Sprites (8x8) ─────────────────────────────────
// Each status has an array of animation frames.
// '' = transparent pixel.

const _ = '' // transparent

// ── Helper: expand row strings to SpriteData ───────────────────
// Each char in the row string maps to a color via the palette.
function expand(
  rows: string[],
  palette: Record<string, string>,
): SpriteData {
  return rows.map((row) =>
    [...row].map((ch) => (ch === '.' ? '' : (palette[ch] ?? ''))),
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKING — Spinning gear (green cog, 4 rotation frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const gearPalette = {
  G: '#22c55e', // green teeth/body
  D: '#16a34a', // darker green (center hole outline)
  H: '#15803d', // dark hole
}

// Frame 0: teeth at N, E, S, W (cardinal positions)
const gearFrame0 = expand([
  '..GG....',
  '.GGGGG..',
  'GGDHGG..',
  'GGHHGGG.',
  '.GGGGGG.',
  '..GGGG..',
  '.GGGGG..',
  '..GG....',
], gearPalette)

// Frame 1: teeth rotated ~22deg (diagonal emphasis)
const gearFrame1 = expand([
  '...GG...',
  '..GGGG..',
  '.GGDHGG.',
  'GGGHHGG.',
  '.GGGGGG.',
  '.GGGGGG.',
  '..GGGG..',
  '...GG...',
], gearPalette)

// Frame 2: teeth at NE, SE, SW, NW (diagonal positions)
const gearFrame2 = expand([
  '....GG..',
  '..GGGGG.',
  '.GGDHGG.',
  '.GGHHGG.',
  'GGGGGG..',
  '.GGGGGG.',
  '..GGGG..',
  '..GG....',
], gearPalette)

// Frame 3: teeth transitioning back
const gearFrame3 = expand([
  '..GGG...',
  '.GGGGG..',
  '.GGDHG..',
  'GGGHHGG.',
  'GGGGGG..',
  '.GGGGG..',
  '..GGGG..',
  '...GG...',
], gearPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IDLE — Coffee cup with steam (2 steam frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const coffeePalette = {
  W: '#FFFFFF', // steam / white
  C: '#9ca3af', // cup body (warm gray)
  D: '#6b7280', // cup dark rim / base
  B: '#78716c', // brown coffee surface
  H: '#d4d4d8', // handle highlight
}

// Frame 0: steam wisp left
const coffeeFrame0 = expand([
  '.W......',
  '..W.....',
  '.W......',
  '..DDDD..',
  '..CBBB..',
  '..CCCC.H',
  '..CCCC.H',
  '..DDDD..',
], coffeePalette)

// Frame 1: steam wisp right
const coffeeFrame1 = expand([
  '..W.....',
  '.W......',
  '..W.....',
  '..DDDD..',
  '..CBBB..',
  '..CCCC.H',
  '..CCCC.H',
  '..DDDD..',
], coffeePalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR — Warning triangle (4 aggressive flash frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const errorPaletteBright = {
  R: '#ef4444', // bright red outline
  Y: '#eab308', // yellow fill
  B: '#111111', // black exclamation
  W: '#fef08a', // warm interior highlight
}

const errorPaletteFlash = {
  R: '#fecaca', // near-white red (washed)
  Y: '#fef9c3', // near-white yellow
  B: '#7f1d1d', // dark red exclamation (still visible)
  W: '#FFFFFF', // white
}

const errorPaletteDim = {
  R: '#b91c1c', // dim red
  Y: '#a16207', // dim yellow
  B: '#111111', // black exclamation
  W: '#ca8a04', // dim interior
}

const errorTemplate = [
  '...RR...',
  '...RR...',
  '..RBBR..',
  '..RWBR..',
  '.RWWBWR.',
  '.RWWWWR.',
  'RRWBWRRR',
  'RRRRRRRR',
]

// Frame 0: BRIGHT — full red + yellow (attention!)
const errorFrame0 = expand(errorTemplate, errorPaletteBright)

// Frame 1: FLASH — near-white overexposure (strobe effect)
const errorFrame1 = expand(errorTemplate, errorPaletteFlash)

// Frame 2: BRIGHT — back to full red (rapid cycle)
const errorFrame2 = expand(errorTemplate, errorPaletteBright)

// Frame 3: DIM — darker pass before restarting (makes the brights pop more)
const errorFrame3 = expand(errorTemplate, errorPaletteDim)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WAITING — Hourglass (2 tip frames, sand flowing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const hourglassPalette = {
  Y: '#eab308', // frame (yellow/gold)
  S: '#fde68a', // sand (light yellow)
  G: '#d4d4d8', // glass (light gray, transparent feel)
  D: '#a16207', // dark accent
}

// Frame 0: sand in top half, narrow stream through center
const hourglassFrame0 = expand([
  '.YYYYYY.',
  '.YGSSGY.',
  '..GSSG..',
  '...YY...',
  '...YY...',
  '..GGGG..',
  '.YGSSPY.',
  '.YYYYYY.',
], { ...hourglassPalette, P: '#fde68a' }) // P = sand pile at bottom

// Frame 1: sand shifted to bottom, top emptier
const hourglassFrame1 = expand([
  '.YYYYYY.',
  '.YGGPGY.',
  '..GGGG..',
  '...YY...',
  '...YY...',
  '..GSSG..',
  '.YGSSGY.',
  '.YYYYYY.',
], { ...hourglassPalette, P: '#fde68a' }) // P = single falling grain

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OFFLINE — Grey X (1 static frame)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const offlinePalette = {
  X: '#4b5563', // dark gray
  D: '#374151', // darker outline
}

const offlineFrame0 = expand([
  'D......D',
  'XD....DX',
  '.XD..DX.',
  '..XDDX..',
  '..XDDX..',
  '.XD..DX.',
  'XD....DX',
  'D......D',
], offlinePalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STATUS_ICON_SPRITES: Record<string, SpriteData[]> = {
  working: [gearFrame0, gearFrame1, gearFrame2, gearFrame3],
  idle: [coffeeFrame0, coffeeFrame1],
  error: [errorFrame0, errorFrame1, errorFrame2, errorFrame3],
  waiting: [hourglassFrame0, hourglassFrame1],
  offline: [offlineFrame0],
}
