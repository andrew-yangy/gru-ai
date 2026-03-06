import type { Direction, SpriteData, FloorColor } from '../pixel-types'
import { Direction as Dir } from '../pixel-types'
import { adjustSprite } from '../colorize'

// ── Color Palettes ──────────────────────────────────────────────
const _ = '' // transparent

// ── Furniture Sprite Placeholders ────────────────────────────────
// Minimal fallbacks shown until LimeZu sprites load. Replaced at runtime
// by applyTilesetToFurniture() from tileset-loader.ts.

const PLACEHOLDER_1x1: SpriteData = [['#808080']]
const PLACEHOLDER_2x1: SpriteData = [new Array(32).fill('#808080')]
const PLACEHOLDER_1x2: SpriteData = Array.from({ length: 32 }, () => ['#808080'])
const PLACEHOLDER_2x2: SpriteData = Array.from({ length: 32 }, () => new Array(32).fill('#808080'))

export const DESK_SQUARE_SPRITE: SpriteData = PLACEHOLDER_2x1
export const BOOKSHELF_SPRITE: SpriteData = PLACEHOLDER_1x2
export const PLANT_SPRITE: SpriteData = PLACEHOLDER_1x1
export const COOLER_SPRITE: SpriteData = PLACEHOLDER_1x1
export const WHITEBOARD_SPRITE: SpriteData = PLACEHOLDER_2x1
export const CHAIR_SPRITE: SpriteData = PLACEHOLDER_1x1
export const PC_SPRITE: SpriteData = PLACEHOLDER_1x1
export const LAMP_SPRITE: SpriteData = PLACEHOLDER_1x1
export const COUCH_SPRITE: SpriteData = PLACEHOLDER_2x1
export const SERVER_RACK_SPRITE: SpriteData = PLACEHOLDER_1x2
export const COFFEE_TABLE_SPRITE: SpriteData = PLACEHOLDER_2x1
export const FILING_CABINET_SPRITE: SpriteData = PLACEHOLDER_1x1

// ── Speech Bubble Sprites ───────────────────────────────────────

/** Permission bubble: white square with "..." in amber, and a tail pointer (11x13) */
export const BUBBLE_PERMISSION_SPRITE: SpriteData = (() => {
  const B = '#555566' // border
  const F = '#EEEEFF' // fill
  const A = '#CCA700' // amber dots
  return [
    [B, B, B, B, B, B, B, B, B, B, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, A, F, A, F, A, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, B, B, B, B, B, B, B, B, B, B],
    [_, _, _, _, B, B, B, _, _, _, _],
    [_, _, _, _, _, B, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
  ]
})()

/** Waiting bubble: white square with green checkmark, and a tail pointer (11x13) */
export const BUBBLE_WAITING_SPRITE: SpriteData = (() => {
  const B = '#555566' // border
  const F = '#EEEEFF' // fill
  const G = '#44BB66' // green check
  return [
    [_, B, B, B, B, B, B, B, B, B, _],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, G, F, B],
    [B, F, F, F, F, F, F, G, F, F, B],
    [B, F, F, G, F, F, G, F, F, F, B],
    [B, F, F, F, G, G, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [B, F, F, F, F, F, F, F, F, F, B],
    [_, B, B, B, B, B, B, B, B, B, _],
    [_, _, _, _, B, B, B, _, _, _, _],
    [_, _, _, _, _, B, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
  ]
})()

/** Chat bubble: small 7x7 speech bubble with dots for agent interactions */
export const BUBBLE_CHAT_SPRITE: SpriteData = (() => {
  const B = '#555566' // border
  const F = '#EEEEFF' // fill
  const D = '#6688CC' // dots
  return [
    [_, B, B, B, B, B, _],
    [B, F, F, F, F, F, B],
    [B, F, D, F, D, F, B],
    [B, F, F, F, F, F, B],
    [_, B, B, B, B, B, _],
    [_, _, B, B, _, _, _],
    [_, _, _, B, _, _, _],
  ]
})()

// ── Character Palettes ──────────────────────────────────────────

/** Palette colors for agent characters.
 *  0-5: match char_0..5.png loaded from assets (Sarah=1, Morgan=2, Marcus=3, Priya=4).
 *  6+: additional agents — Riley, Jordan, Casey, Taylor, Sam, Devon.
 */
export const CHARACTER_PALETTES = [
  // ── Palettes 0-5: match char_0..5.png ──
  { skin: '#FFCC99', shirt: '#4488CC', pants: '#334466', hair: '#553322', shoes: '#222222' }, // 0: blue (spare)
  { skin: '#FFCC99', shirt: '#CC4444', pants: '#333333', hair: '#FFD700', shoes: '#222222' }, // 1: Sarah (red shirt, gold hair)
  { skin: '#DEB887', shirt: '#44AA66', pants: '#334444', hair: '#222222', shoes: '#333333' }, // 2: Morgan (green shirt)
  { skin: '#FFCC99', shirt: '#AA55CC', pants: '#443355', hair: '#AA4422', shoes: '#222222' }, // 3: Marcus (purple shirt)
  { skin: '#DEB887', shirt: '#CCAA33', pants: '#444433', hair: '#553322', shoes: '#333333' }, // 4: Priya (gold shirt)
  { skin: '#FFCC99', shirt: '#FF8844', pants: '#443322', hair: '#111111', shoes: '#222222' }, // 5: spare (orange shirt)
  // ── Palettes 6+: additional agents ──
  { skin: '#FFCC99', shirt: '#E05599', pants: '#553344', hair: '#331111', shoes: '#222222' }, // 6: Riley (pink shirt, dark red hair)
  { skin: '#C4956A', shirt: '#3399AA', pants: '#2A4455', hair: '#1A1A1A', shoes: '#333333' }, // 7: Jordan (teal shirt)
  { skin: '#DEB887', shirt: '#55BBDD', pants: '#334455', hair: '#443322', shoes: '#222222' }, // 8: Casey (sky blue shirt)
  { skin: '#FFCC99', shirt: '#DD7733', pants: '#443322', hair: '#994411', shoes: '#333333' }, // 9: Taylor (burnt orange shirt)
  { skin: '#C4956A', shirt: '#66CC55', pants: '#334433', hair: '#222222', shoes: '#222222' }, // 10: Sam (lime green shirt)
  { skin: '#FFCC99', shirt: '#7766DD', pants: '#333355', hair: '#553322', shoes: '#333333' }, // 11: Devon (indigo shirt)
] as const

// ════════════════════════════════════════════════════════════════
// Loaded character sprites (from PNG assets)
// ════════════════════════════════════════════════════════════════

export interface LoadedCharacterData {
  down: SpriteData[]
  up: SpriteData[]
  right: SpriteData[]
  /** Dedicated left frames. If missing, left is generated by flipping right. */
  left?: SpriteData[]
}

let loadedCharacters: LoadedCharacterData[] | null = null

/** Returns true once PNG character assets have been loaded */
export function areCharacterSpritesLoaded(): boolean {
  return loadedCharacters !== null
}

/** Set pre-colored character sprites loaded from PNG assets. Call this when characterSpritesLoaded message arrives. */
export function setCharacterTemplates(data: LoadedCharacterData[]): void {
  loadedCharacters = data
  // Clear cache so sprites are rebuilt from loaded data
  spriteCache.clear()
}

/** Append additional character sprites (e.g. LimeZu colorized) after the initial set. */
export function appendCharacterTemplates(data: LoadedCharacterData[]): void {
  if (loadedCharacters) {
    loadedCharacters = [...loadedCharacters, ...data]
  } else {
    loadedCharacters = data
  }
  spriteCache.clear()
}

/** Flip a SpriteData horizontally (for generating left sprites from right) */
function flipSpriteHorizontal(sprite: SpriteData): SpriteData {
  return sprite.map((row) => [...row].reverse())
}

// ════════════════════════════════════════════════════════════════
// Sprite resolution + caching
// ════════════════════════════════════════════════════════════════

export interface CharacterSprites {
  walk: Record<Direction, [SpriteData, SpriteData, SpriteData, SpriteData]>
  typing: Record<Direction, [SpriteData, SpriteData]>
  reading: Record<Direction, [SpriteData, SpriteData]>
  /** Optional personality-specific idle animation frames (front-facing only). */
  personality_idle?: SpriteData[]
}

const spriteCache = new Map<string, CharacterSprites>()

/** Apply hue shift to every sprite in a CharacterSprites set */
function hueShiftSprites(sprites: CharacterSprites, hueShift: number): CharacterSprites {
  const color: FloorColor = { h: hueShift, s: 0, b: 0, c: 0 }
  const shift = (s: SpriteData) => adjustSprite(s, color)
  const shiftWalk = (arr: [SpriteData, SpriteData, SpriteData, SpriteData]): [SpriteData, SpriteData, SpriteData, SpriteData] =>
    [shift(arr[0]), shift(arr[1]), shift(arr[2]), shift(arr[3])]
  const shiftPair = (arr: [SpriteData, SpriteData]): [SpriteData, SpriteData] =>
    [shift(arr[0]), shift(arr[1])]
  return {
    walk: {
      [Dir.DOWN]: shiftWalk(sprites.walk[Dir.DOWN]),
      [Dir.UP]: shiftWalk(sprites.walk[Dir.UP]),
      [Dir.RIGHT]: shiftWalk(sprites.walk[Dir.RIGHT]),
      [Dir.LEFT]: shiftWalk(sprites.walk[Dir.LEFT]),
    } as Record<Direction, [SpriteData, SpriteData, SpriteData, SpriteData]>,
    typing: {
      [Dir.DOWN]: shiftPair(sprites.typing[Dir.DOWN]),
      [Dir.UP]: shiftPair(sprites.typing[Dir.UP]),
      [Dir.RIGHT]: shiftPair(sprites.typing[Dir.RIGHT]),
      [Dir.LEFT]: shiftPair(sprites.typing[Dir.LEFT]),
    } as Record<Direction, [SpriteData, SpriteData]>,
    reading: {
      [Dir.DOWN]: shiftPair(sprites.reading[Dir.DOWN]),
      [Dir.UP]: shiftPair(sprites.reading[Dir.UP]),
      [Dir.RIGHT]: shiftPair(sprites.reading[Dir.RIGHT]),
      [Dir.LEFT]: shiftPair(sprites.reading[Dir.LEFT]),
    } as Record<Direction, [SpriteData, SpriteData]>,
  }
}

/** Returns character sprites from loaded PNG assets, or null if assets haven't loaded yet. */
export function getCharacterSprites(paletteIndex: number, hueShift = 0): CharacterSprites | null {
  if (!loadedCharacters) return null

  const cacheKey = `${paletteIndex}:${hueShift}`
  const cached = spriteCache.get(cacheKey)
  if (cached) return cached

  const char = loadedCharacters[paletteIndex < loadedCharacters.length ? paletteIndex : paletteIndex % loadedCharacters.length]
  const d = char.down
  const u = char.up
  const rt = char.right
  const flip = flipSpriteHorizontal
  // Use dedicated left frames if available, otherwise flip right
  const lt = char.left
  const leftFrame = (idx: number) => lt ? lt[idx] : flip(rt[idx])

  let sprites: CharacterSprites = {
    walk: {
      [Dir.DOWN]: [d[0], d[1], d[2], d[1]],
      [Dir.UP]: [u[0], u[1], u[2], u[1]],
      [Dir.RIGHT]: [rt[0], rt[1], rt[2], rt[1]],
      [Dir.LEFT]: [leftFrame(0), leftFrame(1), leftFrame(2), leftFrame(1)],
    },
    typing: {
      [Dir.DOWN]: [d[3], d[4]],
      [Dir.UP]: [u[3], u[4]],
      [Dir.RIGHT]: [rt[3], rt[4]],
      [Dir.LEFT]: [leftFrame(3), leftFrame(4)],
    },
    reading: {
      [Dir.DOWN]: [d[5], d[6]],
      [Dir.UP]: [u[5], u[6]],
      [Dir.RIGHT]: [rt[5], rt[6]],
      [Dir.LEFT]: [leftFrame(5), leftFrame(6)],
    },
  }

  // Apply hue shift if non-zero
  if (hueShift !== 0) {
    sprites = hueShiftSprites(sprites, hueShift)
  }

  spriteCache.set(cacheKey, sprites)
  return sprites
}
