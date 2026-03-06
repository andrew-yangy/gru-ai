# Character Identity & Status — Brainstorm Synthesis

**Directive:** Extract character-identity-status from Phase 3 Living Office into a separate project with proper design.
**Classification:** Strategic
**Participants:** Marcus (CPO), Sarah (CTO), Riley (FE/auditor)

## Phase 1 Proposals

### Marcus (CPO) — Product-First, Phased by User Value
Three phases sequenced by user value, not technical layer:
1. **Core identity:** Brand-colored nameplates + role badge icons (wrench for CTO, gear for COO, etc.) + animated status vignettes (spinning cog, coffee cup, sparking monitor)
2. **Contextual richness:** One-line task description below name showing what agent is working on
3. **Personality/delight:** Character-specific idle animations (Sarah adjusts glasses, Morgan checks clipboard)

Key insight: "Identity info must be visible at rest, always, without interaction. Tooltips are a dashboard pattern, not a game pattern."

Confidence: high

### Sarah (CTO) — Architecture-First, Sprites All the Way Down
Three layers executed in order:
1. **Bitmap font name plates** rendered via pixel font atlas (5x7), cached as sprites through existing spriteCache/getCachedSprite pipeline
2. **Multi-frame status badge sprites** (8x8 or 10x10) animated via frameTimer pattern
3. **Contextual detail popover** on hover/select showing role, current tool, session duration

Key insight: "Identity elements should become first-class sprites in the rendering pipeline rather than post-hoc Canvas text draws."

Confidence: high

### Riley (auditor) — Pragmatic Unified Renderer
Single `renderIdentityPlate()` replacing both existing render functions:
1. Colored left-edge accent bar (agent brand color)
2. Name in proportional font with accent color tint
3. Role abbreviation badge (CTO, FE, QA)
4. Animated status icons replacing plain dots

Key insight: "Extend IdentityOverlay with colorMap and roleMap — the existing interface is the single correct choke point."

Confidence: high

## Phase 2 Rebuttals

### Marcus targets Sarah
**Critique:** Over-indexes on technical elegance. Bitmap font atlas is significant engineering for a game with 5-7 visible characters. Front-loads the hardest layer before validating that nameplates are the right visual language. "Contextual detail popover on hover" contradicts ambient awareness — it's a tooltip scavenger hunt.

**Alternative:** Ship system-font nameplates with brand colors first, learn from playtesting, then optimize rendering if needed.

### Sarah targets Riley
**Critique:** system-ui sans-serif will produce anti-aliased, blurry text that clashes with pixel-art sprites. Canvas 2D renders system fonts with sub-pixel anti-aliasing that cannot be disabled — gray fringe pixels next to crisp 1-pixel sprite edges. The CEO mandate demands "best pixel art in the market."

**Alternative:** Bitmap font sprites through existing spriteCache. Pixel-perfect at every zoom level.

### Riley targets Sarah
**Critique:** The spriteCache (WeakMap on SpriteData) would blow up with one entry per name-per-zoom-level. Compositing glyph sprites at render time defeats caching. The existing ctx.fillText already scales cleanly with zoom. A 5x7 atlas will look blocky at low zoom. Multi-frame status badges break WeakMap reference stability. Popover is scope creep.

**Alternative:** Keep Canvas text rendering, extend IdentityOverlay, write a unified renderIdentityPlate() using native Canvas 2D drawing.

## Convergence Points

1. **All agree:** Identity must be canvas-rendered, NOT HTML/DOM overlays
2. **All agree:** Status dots should become richer animated icons (gear, coffee, warning)
3. **All agree:** Brand colors must be more prominent in identity display
4. **All agree:** Role should be visually communicated (icons vs abbreviations debated)
5. **All agree:** IdentityOverlay interface needs extension with color + role data
6. **Marcus + Riley agree:** Sequence by user value, not technical layer
7. **Marcus + Riley agree:** System fonts are fine for v1, optimize later if needed

## Key Disagreements

### 1. Font rendering: Bitmap sprites vs Canvas text
- **Sarah:** Bitmap font atlas through spriteCache — pixel-perfect, matches art style
- **Riley:** Canvas fillText already works, bitmap atlas is massive effort for worse results
- **Marcus:** Ship system fonts first, validate the feature, optimize rendering later
- **Who's right?** Sarah's aesthetic argument is valid (anti-aliased text on pixel art looks wrong), but Marcus and Riley's pragmatic argument is also valid (ship and learn first). The resolution depends on how much the CEO cares about text pixel-perfection vs. shipping speed.

### 2. Hover popover vs. always-visible info
- **Sarah:** Contextual detail popover on hover for extended info
- **Marcus:** Everything must be ambient — no hover required for status understanding
- **Riley:** Popover is scope creep for this project
- **Who's right?** Marcus's product insight is strongest here. The game IS the glanceable interface.

### 3. Task text below name
- **Marcus:** Phase 2 adds one-line task description (what agent is working on)
- **Sarah/Riley:** Not mentioned in their proposals
- **Unresolved:** Is the name plate the right place for task context, or does that belong elsewhere?
