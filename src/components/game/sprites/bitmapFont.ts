import type { SpriteData } from '../pixel-types'
import { getCachedSprite } from './spriteCache'

// ── 5x7 Bitmap Font Glyph Atlas ────────────────────────────────
//
// Each glyph is defined as a 7-line string template where:
//   'X' = filled pixel (expanded to FILL color)
//   '.' = transparent pixel (expanded to '')
//
// All glyphs are exactly 5 wide x 7 tall.
// Lowercase descenders (g, j, p, q, y) use full height with body shifted up.
// Uppercase and non-descender lowercase leave row 6 empty.

const FILL = '#FFFFFF'
const _ = ''

// ── Glyph Templates ────────────────────────────────────────────

/** Compact glyph definition: 7 rows of 5 chars each */
type GlyphTemplate = [string, string, string, string, string, string, string]

function expand(t: GlyphTemplate): SpriteData {
  return t.map((row) =>
    row.split('').map((ch) => (ch === 'X' ? FILL : _)),
  )
}

// ── UPPERCASE A-Z ──────────────────────────────────────────────

const GLYPHS_UPPER: Record<string, GlyphTemplate> = {
  A: [
    '.XXX.',
    'X...X',
    'X...X',
    'XXXXX',
    'X...X',
    'X...X',
    '.....',
  ],
  B: [
    'XXXX.',
    'X...X',
    'XXXX.',
    'X...X',
    'X...X',
    'XXXX.',
    '.....',
  ],
  C: [
    '.XXX.',
    'X...X',
    'X....',
    'X....',
    'X...X',
    '.XXX.',
    '.....',
  ],
  D: [
    'XXXX.',
    'X...X',
    'X...X',
    'X...X',
    'X...X',
    'XXXX.',
    '.....',
  ],
  E: [
    'XXXXX',
    'X....',
    'XXXX.',
    'X....',
    'X....',
    'XXXXX',
    '.....',
  ],
  F: [
    'XXXXX',
    'X....',
    'XXXX.',
    'X....',
    'X....',
    'X....',
    '.....',
  ],
  G: [
    '.XXX.',
    'X...X',
    'X....',
    'X.XXX',
    'X...X',
    '.XXX.',
    '.....',
  ],
  H: [
    'X...X',
    'X...X',
    'XXXXX',
    'X...X',
    'X...X',
    'X...X',
    '.....',
  ],
  I: [
    '.XXX.',
    '..X..',
    '..X..',
    '..X..',
    '..X..',
    '.XXX.',
    '.....',
  ],
  J: [
    '..XXX',
    '...X.',
    '...X.',
    '...X.',
    'X..X.',
    '.XX..',
    '.....',
  ],
  K: [
    'X...X',
    'X..X.',
    'XXX..',
    'X..X.',
    'X...X',
    'X...X',
    '.....',
  ],
  L: [
    'X....',
    'X....',
    'X....',
    'X....',
    'X....',
    'XXXXX',
    '.....',
  ],
  M: [
    'X...X',
    'XX.XX',
    'X.X.X',
    'X...X',
    'X...X',
    'X...X',
    '.....',
  ],
  N: [
    'X...X',
    'XX..X',
    'X.X.X',
    'X..XX',
    'X...X',
    'X...X',
    '.....',
  ],
  O: [
    '.XXX.',
    'X...X',
    'X...X',
    'X...X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  P: [
    'XXXX.',
    'X...X',
    'XXXX.',
    'X....',
    'X....',
    'X....',
    '.....',
  ],
  Q: [
    '.XXX.',
    'X...X',
    'X...X',
    'X.X.X',
    'X..X.',
    '.XX.X',
    '.....',
  ],
  R: [
    'XXXX.',
    'X...X',
    'XXXX.',
    'X..X.',
    'X...X',
    'X...X',
    '.....',
  ],
  S: [
    '.XXX.',
    'X....',
    '.XXX.',
    '....X',
    '....X',
    'XXXX.',
    '.....',
  ],
  T: [
    'XXXXX',
    '..X..',
    '..X..',
    '..X..',
    '..X..',
    '..X..',
    '.....',
  ],
  U: [
    'X...X',
    'X...X',
    'X...X',
    'X...X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  V: [
    'X...X',
    'X...X',
    'X...X',
    '.X.X.',
    '.X.X.',
    '..X..',
    '.....',
  ],
  W: [
    'X...X',
    'X...X',
    'X.X.X',
    'X.X.X',
    'XX.XX',
    'X...X',
    '.....',
  ],
  X: [
    'X...X',
    '.X.X.',
    '..X..',
    '..X..',
    '.X.X.',
    'X...X',
    '.....',
  ],
  Y: [
    'X...X',
    '.X.X.',
    '..X..',
    '..X..',
    '..X..',
    '..X..',
    '.....',
  ],
  Z: [
    'XXXXX',
    '...X.',
    '..X..',
    '.X...',
    'X....',
    'XXXXX',
    '.....',
  ],
}

// ── LOWERCASE a-z ──────────────────────────────────────────────
// Body occupies rows 2-5 for non-ascender/descender letters (rows 0-1 empty, row 6 empty).
// Ascenders (b,d,f,h,k,l,t) use rows 0-5, row 6 empty.
// Descenders (g,j,p,q,y) use rows 1-6, row 0 empty.

const GLYPHS_LOWER: Record<string, GlyphTemplate> = {
  a: [
    '.....',
    '.....',
    '.XXX.',
    '...X.',
    '.XXXX',
    'X...X',
    '.XXXX',
  ],
  b: [
    'X....',
    'X....',
    'XXXX.',
    'X...X',
    'X...X',
    'XXXX.',
    '.....',
  ],
  c: [
    '.....',
    '.....',
    '.XXX.',
    'X....',
    'X....',
    '.XXX.',
    '.....',
  ],
  d: [
    '....X',
    '....X',
    '.XXXX',
    'X...X',
    'X...X',
    '.XXXX',
    '.....',
  ],
  e: [
    '.....',
    '.....',
    '.XXX.',
    'X.XXX',
    'X....',
    '.XXX.',
    '.....',
  ],
  f: [
    '..XX.',
    '.X...',
    'XXXX.',
    '.X...',
    '.X...',
    '.X...',
    '.....',
  ],
  g: [
    '.....',
    '.XXXX',
    'X...X',
    'X...X',
    '.XXXX',
    '....X',
    '.XXX.',
  ],
  h: [
    'X....',
    'X....',
    'XXXX.',
    'X...X',
    'X...X',
    'X...X',
    '.....',
  ],
  i: [
    '..X..',
    '.....',
    '.XX..',
    '..X..',
    '..X..',
    '.XXX.',
    '.....',
  ],
  j: [
    '...X.',
    '.....',
    '..XX.',
    '...X.',
    '...X.',
    'X..X.',
    '.XX..',
  ],
  k: [
    'X....',
    'X....',
    'X..X.',
    'XXX..',
    'X..X.',
    'X...X',
    '.....',
  ],
  l: [
    '.XX..',
    '..X..',
    '..X..',
    '..X..',
    '..X..',
    '.XXX.',
    '.....',
  ],
  m: [
    '.....',
    '.....',
    'XX.X.',
    'X.X.X',
    'X.X.X',
    'X...X',
    '.....',
  ],
  n: [
    '.....',
    '.....',
    'XXXX.',
    'X...X',
    'X...X',
    'X...X',
    '.....',
  ],
  o: [
    '.....',
    '.....',
    '.XXX.',
    'X...X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  p: [
    '.....',
    'XXXX.',
    'X...X',
    'X...X',
    'XXXX.',
    'X....',
    'X....',
  ],
  q: [
    '.....',
    '.XXXX',
    'X...X',
    'X...X',
    '.XXXX',
    '....X',
    '....X',
  ],
  r: [
    '.....',
    '.....',
    'X.XX.',
    'XX...',
    'X....',
    'X....',
    '.....',
  ],
  s: [
    '.....',
    '.....',
    '.XXXX',
    '.XX..',
    '...XX',
    'XXXX.',
    '.....',
  ],
  t: [
    '.X...',
    '.X...',
    'XXXX.',
    '.X...',
    '.X...',
    '..XX.',
    '.....',
  ],
  u: [
    '.....',
    '.....',
    'X...X',
    'X...X',
    'X...X',
    '.XXXX',
    '.....',
  ],
  v: [
    '.....',
    '.....',
    'X...X',
    'X...X',
    '.X.X.',
    '..X..',
    '.....',
  ],
  w: [
    '.....',
    '.....',
    'X...X',
    'X.X.X',
    'X.X.X',
    '.X.X.',
    '.....',
  ],
  x: [
    '.....',
    '.....',
    'X...X',
    '.X.X.',
    '.X.X.',
    'X...X',
    '.....',
  ],
  y: [
    '.....',
    'X...X',
    'X...X',
    'X...X',
    '.XXXX',
    '....X',
    '.XXX.',
  ],
  z: [
    '.....',
    '.....',
    'XXXXX',
    '..X..',
    '.X...',
    'XXXXX',
    '.....',
  ],
}

// ── DIGITS 0-9 ─────────────────────────────────────────────────

const GLYPHS_DIGIT: Record<string, GlyphTemplate> = {
  '0': [
    '.XXX.',
    'X..XX',
    'X.X.X',
    'XX..X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  '1': [
    '..X..',
    '.XX..',
    '..X..',
    '..X..',
    '..X..',
    '.XXX.',
    '.....',
  ],
  '2': [
    '.XXX.',
    'X...X',
    '...X.',
    '..X..',
    '.X...',
    'XXXXX',
    '.....',
  ],
  '3': [
    '.XXX.',
    'X...X',
    '..XX.',
    '....X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  '4': [
    '...X.',
    '..XX.',
    '.X.X.',
    'XXXXX',
    '...X.',
    '...X.',
    '.....',
  ],
  '5': [
    'XXXXX',
    'X....',
    'XXXX.',
    '....X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  '6': [
    '.XXX.',
    'X....',
    'XXXX.',
    'X...X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  '7': [
    'XXXXX',
    '....X',
    '...X.',
    '..X..',
    '..X..',
    '..X..',
    '.....',
  ],
  '8': [
    '.XXX.',
    'X...X',
    '.XXX.',
    'X...X',
    'X...X',
    '.XXX.',
    '.....',
  ],
  '9': [
    '.XXX.',
    'X...X',
    'X...X',
    '.XXXX',
    '....X',
    '.XXX.',
    '.....',
  ],
}

// ── PUNCTUATION ────────────────────────────────────────────────

const GLYPHS_PUNCT: Record<string, GlyphTemplate> = {
  '.': [
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
    '..X..',
    '.....',
  ],
  ':': [
    '.....',
    '..X..',
    '.....',
    '.....',
    '..X..',
    '.....',
    '.....',
  ],
  ',': [
    '.....',
    '.....',
    '.....',
    '.....',
    '..X..',
    '..X..',
    '.X...',
  ],
  '-': [
    '.....',
    '.....',
    '.....',
    'XXXXX',
    '.....',
    '.....',
    '.....',
  ],
  '_': [
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
    'XXXXX',
  ],
  '!': [
    '..X..',
    '..X..',
    '..X..',
    '..X..',
    '.....',
    '..X..',
    '.....',
  ],
  '?': [
    '.XXX.',
    'X...X',
    '...X.',
    '..X..',
    '.....',
    '..X..',
    '.....',
  ],
  '(': [
    '..X..',
    '.X...',
    '.X...',
    '.X...',
    '.X...',
    '..X..',
    '.....',
  ],
  ')': [
    '..X..',
    '...X.',
    '...X.',
    '...X.',
    '...X.',
    '..X..',
    '.....',
  ],
  '/': [
    '....X',
    '...X.',
    '...X.',
    '..X..',
    '.X...',
    '.X...',
    '.....',
  ],
  "'": [
    '..X..',
    '..X..',
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
  ],
  ' ': [
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
    '.....',
  ],
}

// ── Build GLYPH_MAP ────────────────────────────────────────────

export const GLYPH_MAP: Map<string, SpriteData> = new Map()

for (const [ch, tpl] of Object.entries(GLYPHS_UPPER)) {
  GLYPH_MAP.set(ch, expand(tpl))
}
for (const [ch, tpl] of Object.entries(GLYPHS_LOWER)) {
  GLYPH_MAP.set(ch, expand(tpl))
}
for (const [ch, tpl] of Object.entries(GLYPHS_DIGIT)) {
  GLYPH_MAP.set(ch, expand(tpl))
}
for (const [ch, tpl] of Object.entries(GLYPHS_PUNCT)) {
  GLYPH_MAP.set(ch, expand(tpl))
}

// ── Bitmap Text Rendering ─────────────────────────────────────

const GLYPH_WIDTH = 5
const GLYPH_HEIGHT = 7
const GLYPH_SPACING = 1

/** Tier 1 cache: text+color -> composed SpriteData (stable reference for WeakMap) */
const textSpriteCache = new Map<string, SpriteData>()

function composeTextSprite(text: string, color: string): SpriteData {
  const key = text + '\0' + color
  const cached = textSpriteCache.get(key)
  if (cached) return cached

  // Collect glyphs for valid characters
  const glyphs: SpriteData[] = []
  for (const ch of text) {
    const glyph = GLYPH_MAP.get(ch)
    if (glyph) glyphs.push(glyph)
  }

  if (glyphs.length === 0) {
    // Return a minimal empty sprite so we have a stable ref
    const empty: SpriteData = [[]]
    textSpriteCache.set(key, empty)
    return empty
  }

  const totalWidth =
    GLYPH_WIDTH * glyphs.length + GLYPH_SPACING * (glyphs.length - 1)

  // Build composed sprite: 7 rows x totalWidth cols
  const composed: string[][] = []
  for (let r = 0; r < GLYPH_HEIGHT; r++) {
    const row = new Array<string>(totalWidth).fill('')
    let xOffset = 0
    for (const glyph of glyphs) {
      for (let c = 0; c < GLYPH_WIDTH; c++) {
        const pixel = glyph[r][c]
        if (pixel !== '') {
          row[xOffset + c] = color
        }
      }
      xOffset += GLYPH_WIDTH + GLYPH_SPACING
    }
    composed.push(row)
  }

  textSpriteCache.set(key, composed)
  return composed
}

/**
 * Measure the pixel dimensions of a bitmap text string (before zoom).
 * Only characters present in GLYPH_MAP are counted.
 */
export function measureBitmapText(text: string): {
  width: number
  height: number
} {
  let charCount = 0
  for (const ch of text) {
    if (GLYPH_MAP.has(ch)) charCount++
  }
  if (charCount === 0) return { width: 0, height: 0 }
  return {
    width: GLYPH_WIDTH * charCount + GLYPH_SPACING * (charCount - 1),
    height: GLYPH_HEIGHT,
  }
}

/**
 * Render bitmap text to a canvas context with two-tier caching.
 *
 * Tier 1: Map<string, SpriteData> keyed by text+color for stable references.
 * Tier 2: WeakMap in getCachedSprite() for zoom-level canvas caching.
 *
 * Text is hidden at zoom < 2 (too small to read).
 */
export function renderBitmapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  x: number,
  y: number,
  zoom: number,
): void {
  if (zoom < 2) return

  const sprite = composeTextSprite(text, color)
  if (sprite.length === 0 || sprite[0].length === 0) return

  const canvas = getCachedSprite(sprite, zoom)
  ctx.drawImage(canvas, x, y)
}
