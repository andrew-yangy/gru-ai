/**
 * Export pre-colored character sprites to PNG files via palette-swapping.
 *
 * Instead of rendering flat templates, this takes an existing high-quality
 * character PNG (char_0.png) and re-colors it by swapping palette colors
 * while preserving all shading, highlights, and detail.
 *
 * Each PNG is 112×96: 7 frames × 16px wide, 3 direction rows × 32px tall.
 *   Row 0 = down, Row 1 = up, Row 2 = right
 *   Frame order: walk1, walk2, walk3, type1, type2, read1, read2
 *
 * Usage:
 *   npx tsx scripts/export-characters.ts          # generate char_6..11.png (new agents only)
 *   npx tsx scripts/export-characters.ts --all     # regenerate all char_0..11.png
 *
 * Colors are baked in — no palette swapping at runtime.
 */

import * as fs from 'fs'
import * as path from 'path'
import { PNG } from 'pngjs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Palettes ──

interface Palette {
  skin: string
  shirt: string
  pants: string
  hair: string
  shoes: string
}

const CHARACTER_PALETTES: Palette[] = [
  // ── Palette 0: source character (char_0.png from pixel-agents) ──
  { skin: '#FFCC99', shirt: '#4488CC', pants: '#334466', hair: '#553322', shoes: '#222222' },
  // ── Palettes 1-5: match original pixel-agents char_1..5.png ──
  { skin: '#FFCC99', shirt: '#CC4444', pants: '#333333', hair: '#FFD700', shoes: '#222222' }, // 1: Sarah
  { skin: '#DEB887', shirt: '#44AA66', pants: '#334444', hair: '#222222', shoes: '#333333' }, // 2: Morgan
  { skin: '#FFCC99', shirt: '#AA55CC', pants: '#443355', hair: '#AA4422', shoes: '#222222' }, // 3: Marcus
  { skin: '#DEB887', shirt: '#CCAA33', pants: '#444433', hair: '#553322', shoes: '#333333' }, // 4: Priya
  { skin: '#FFCC99', shirt: '#FF8844', pants: '#443322', hair: '#111111', shoes: '#222222' }, // 5: spare
  // ── Palettes 6+: new agents ──
  { skin: '#FFCC99', shirt: '#E05599', pants: '#553344', hair: '#331111', shoes: '#222222' }, // 6: Riley (pink)
  { skin: '#C4956A', shirt: '#3399AA', pants: '#2A4455', hair: '#1A1A1A', shoes: '#333333' }, // 7: Jordan (teal)
  { skin: '#DEB887', shirt: '#55BBDD', pants: '#334455', hair: '#443322', shoes: '#222222' }, // 8: Casey (sky blue)
  { skin: '#FFCC99', shirt: '#DD7733', pants: '#443322', hair: '#994411', shoes: '#333333' }, // 9: Taylor (burnt orange)
  { skin: '#C4956A', shirt: '#66CC55', pants: '#334433', hair: '#222222', shoes: '#222222' }, // 10: Sam (lime green)
  { skin: '#FFCC99', shirt: '#7766DD', pants: '#333355', hair: '#553322', shoes: '#333333' }, // 11: Devon (indigo)
]

// ── Color utilities ──

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ]
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

// ── Palette slot classification ──

type PaletteSlot = 'skin' | 'shirt' | 'pants' | 'hair' | 'shoes'
const PALETTE_SLOTS: PaletteSlot[] = ['skin', 'shirt', 'pants', 'hair', 'shoes']

/**
 * Classify a pixel's color to the nearest palette slot.
 * Returns null for white (eyes) or colors too far from any slot.
 */
function classifyPixel(
  r: number, g: number, b: number,
  sourcePalette: Palette,
): PaletteSlot | null {
  // White/near-white = eyes, don't remap
  if (r > 240 && g > 240 && b > 240) return null

  let bestSlot: PaletteSlot | null = null
  let bestDist = Infinity

  for (const slot of PALETTE_SLOTS) {
    const [sr, sg, sb] = hexToRgb(sourcePalette[slot])
    const dist = colorDistance(r, g, b, sr, sg, sb)
    if (dist < bestDist) {
      bestDist = dist
      bestSlot = slot
    }
  }

  // If too far from any palette color, don't remap (safety threshold)
  if (bestDist > 180) return null

  return bestSlot
}

/**
 * Remap a pixel from source palette to target palette.
 * Preserves relative brightness/saturation differences (shading detail).
 */
function remapPixel(
  r: number, g: number, b: number,
  slot: PaletteSlot,
  sourcePalette: Palette,
  targetPalette: Palette,
): [number, number, number] {
  const [srcR, srcG, srcB] = hexToRgb(sourcePalette[slot])
  const [tgtR, tgtG, tgtB] = hexToRgb(targetPalette[slot])

  const [srcH, srcS, srcL] = rgbToHsl(srcR, srcG, srcB)
  const [pixH, pixS, pixL] = rgbToHsl(r, g, b)
  const [tgtH, tgtS, tgtL] = rgbToHsl(tgtR, tgtG, tgtB)

  // Compute deltas from source base in HSL space
  const dH = pixH - srcH
  const dS = pixS - srcS
  const dL = pixL - srcL

  // Apply deltas to target base
  let newH = (tgtH + dH + 1) % 1
  let newS = Math.max(0, Math.min(1, tgtS + dS))
  let newL = Math.max(0, Math.min(1, tgtL + dL))

  return hslToRgb(newH, newS, newL)
}

// ── Palette swap a PNG ──

function paletteSwapPng(
  sourcePng: PNG,
  sourcePalette: Palette,
  targetPalette: Palette,
): PNG {
  const result = new PNG({ width: sourcePng.width, height: sourcePng.height })

  for (let i = 0; i < sourcePng.data.length; i += 4) {
    const r = sourcePng.data[i]
    const g = sourcePng.data[i + 1]
    const b = sourcePng.data[i + 2]
    const a = sourcePng.data[i + 3]

    if (a === 0) {
      // Transparent — copy as-is
      result.data[i] = 0
      result.data[i + 1] = 0
      result.data[i + 2] = 0
      result.data[i + 3] = 0
      continue
    }

    const slot = classifyPixel(r, g, b, sourcePalette)
    if (slot === null) {
      // Not a palette color (eyes, etc.) — copy as-is
      result.data[i] = r
      result.data[i + 1] = g
      result.data[i + 2] = b
      result.data[i + 3] = a
    } else {
      const [nr, ng, nb] = remapPixel(r, g, b, slot, sourcePalette, targetPalette)
      result.data[i] = nr
      result.data[i + 1] = ng
      result.data[i + 2] = nb
      result.data[i + 3] = a
    }
  }

  return result
}

// ── Main ──

const outDir = path.join(__dirname, '..', 'public', 'assets', 'characters')
fs.mkdirSync(outDir, { recursive: true })

// Load source character (char_0.png) for palette swapping
const sourcePath = path.join(outDir, 'char_0.png')
if (!fs.existsSync(sourcePath)) {
  console.error('Error: char_0.png not found. Need the original pixel-agents source character.')
  process.exit(1)
}
const sourcePng = PNG.sync.read(fs.readFileSync(sourcePath))
const sourcePalette = CHARACTER_PALETTES[0]

console.log(`Source: char_0.png (${sourcePng.width}×${sourcePng.height})`)

const genAll = process.argv.includes('--all')
const startIdx = genAll ? 1 : 6  // Skip 0 (it's the source)
const endIdx = CHARACTER_PALETTES.length

for (let i = startIdx; i < endIdx; i++) {
  const targetPalette = CHARACTER_PALETTES[i]
  const result = paletteSwapPng(sourcePng, sourcePalette, targetPalette)
  const buffer = PNG.sync.write(result)
  const outPath = path.join(outDir, `char_${i}.png`)
  fs.writeFileSync(outPath, buffer)
  console.log(`✓ char_${i}.png (${buffer.length} bytes) — shirt: ${targetPalette.shirt}, hair: ${targetPalette.hair}`)
}

console.log(`\nGenerated ${endIdx - startIdx} character PNGs via palette-swap from char_0.png`)
console.log('All shading, highlights, and detail preserved from source.')
