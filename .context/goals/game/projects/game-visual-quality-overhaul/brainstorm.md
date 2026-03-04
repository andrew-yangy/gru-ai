# Brainstorm Synthesis: Game Visual Quality Overhaul

## Directive
game-visual-quality-overhaul (strategic)

## Participants
- Sarah (CTO) — Architecture
- Marcus (CPO) — Product/UX
- Auditor — Codebase feasibility

---

## Phase 1: Proposals

### Sarah (Architecture)
**Approach:** Layer rendering into four explicit passes (floor, back walls, entities sorted by Y, front wall occlusion). Introduce RoomGrid data model as the data structure that unlocks everything. Upgrade furniture to claw-empire-style 20-40 lines procedural. Keep 16x24 programmatic characters with walk cycle. WeakMap sprite cache. Strict dependency order: z-sort -> room model -> floor/wall -> furniture -> characters -> animation.

**Key insight:** The rendering pipeline has a strict dependency graph. Z-sort must exist before entities render correctly. Floor/wall depth must exist before characters appear grounded. Doing things out of order means doing them twice.

**Avoid:** PixiJS migration or PNG assets before exhausting procedural approaches. Start procedural everywhere, only reach for PNGs if characters genuinely cannot hit quality bar in code.

### Marcus (Product)
**Approach:** Prioritize character quality FIRST since CEO interacts with agents daily. Room design second (color themes, floor patterns). Furniture third (top 3-5 pieces only). Z-sorting and animation last as multipliers. North star: CEO should feel like watching a real team work.

**Key insight:** Depth over breadth. 3 beautifully crafted character types beats 10 mediocre ones. Do NOT spread effort evenly. Ship something exceptional, not everything at 20% better.

**Avoid:** Boiling the ocean. Spreading effort across all six systems simultaneously means nothing ships feeling right.

### Auditor (Codebase)
**Approach:** Preserve TILE_RENDERERS dispatch table. Four targeted passes: (1) per-room-zone tinted floor patterns via parallel ROOM_ZONES array, (2) 4-bit bitmask wall auto-tiling via TileRenderOpts, (3) inflate furniture renderers to 20-40 lines, (4) painter's algorithm z-sort by collecting characters during tile pass and drawing in post-pass.

**Key insight:** The existing architecture (dispatch table, sprite cache, TileRenderOpts) is sound and extensible. Specific line references to every integration point. Animation needs dirtyRef to go always-dirty while agents active. Sprite cache keys must expand from name to name-frameIndex.

**Avoid:** PNG sprite sheets or external image assets. The entire pipeline is procedural with no asset loading infrastructure. Also avoid isometric projection — camera math is orthographic and isometric would break four functions simultaneously.

---

## Phase 2: Rebuttals

### Sarah rebuts Marcus
**Critique:** Characters-first is architecturally backwards. A character drawn on a flat unshaded floor with no z-sort looks like a sprite floating on cardboard no matter how many pixels you hand-craft. Visual quality is multiplicative, not additive. Beautiful characters rendered without painter's algorithm clip through furniture and appear in front of walls. That regression destroys the "real team" illusion faster than mediocre pixel art.

**Alternative:** Agree with Marcus's depth-over-breadth instinct, but apply it within the correct dependency order. Hand-craft 2-3 agent types with extreme care, but do so AFTER z-sort and room rendering are in place so the work lands on a substrate that makes it look good.

### Marcus rebuts Sarah
**Critique:** Sarah's dependency order puts characters penultimate and animation last. If we run out of time or hit complexity, we get a beautifully z-sorted room full of mediocre stick figures. RoomGrid data model is invisible engineering. WeakMap sprite cache is invisible to users.

**Alternative:** Build one stunning character first. CEO sees it, validates it, gets excited. Architecture should emerge from shipping value, not gate it.

### Auditor rebuts Marcus
**Critique:** Z-sorting is not a "multiplier" — it is a prerequisite. Without painter's algorithm, characters clip through desks. Beautiful character art rendered in wrong z-order looks MORE broken than mediocre art rendered correctly, because the quality mismatch amplifies the visual error. Additionally, TILE_RENDERERS already dispatches on character role keys. Narrowing to 3 types requires either removing dispatch cases or leaving stubs.

**Alternative:** Z-sort and character upgrades ship in the same pass. They are the same rendering loop. Character quality and z-sort are not separable priorities.

---

## Synthesis

### Convergence (all three agree)
1. **100% procedural approach** — no PNG assets, no asset loading pipeline. Canvas 2D is sufficient.
2. **Furniture needs 20-40 lines per piece** with highlights, shadows, grain, detail objects.
3. **Depth over breadth** for characters — quality over quantity.
4. **Preserve TILE_RENDERERS dispatch table** — it is sound architecture.
5. **No PixiJS migration, no isometric projection** — hard constraints.
6. **Room zones with color themes** — department areas need visual identity.

### Key Disagreement: Execution Order
The central debate: Sarah and the Auditor say z-sort and room rendering must come before characters (dependency graph). Marcus says characters should come first (user value).

**Which critique landed:** Sarah and the Auditor's critique of Marcus is technically correct — without z-sort, characters clip through furniture and the quality actually looks WORSE. The auditor specifically noted that "beautiful character art rendered in wrong z-order looks MORE broken than mediocre art rendered correctly." This is a real rendering constraint, not an architectural preference.

**Marcus's valid point:** The depth-over-breadth philosophy is correct and should be applied WITHIN the correct execution order. Pour maximum effort into 2-3 character types, but do so on a correct rendering substrate.

### Resolved Approach
**Technical order with product-focused depth:**
1. **Z-sort + Room data model** — prerequisite infrastructure (small, focused)
2. **Floor/wall rendering** — textured patterns, auto-tiling, room atmosphere
3. **Furniture overhaul** — top 3-5 pieces to claw-empire quality, not all at once
4. **Character sprites** — 2-3 stunning types with walk cycle, applied depth-over-breadth
5. **Animation system** — ticker, dirtyRef changes, frame management

### Unresolved Questions for CEO

1. **Character art approach:** All three agents agree to keep programmatic sprites, but the directive brief asks whether to use PNG sprite sheets (pixel-agents style) or hand-craft programmatic pixel arrays. The auditor says no PNGs (no asset loading infrastructure exists), Sarah says start procedural but reach for PNGs if quality demands it. **Does the CEO want to try procedural-first and evaluate, or commit to one approach now?**

2. **Scope of furniture overhaul:** Marcus says focus on top 3-5 furniture pieces. Sarah says upgrade all furniture. The auditor says desk, conference, and server-room are the weakest at ~15-20 lines each. **Should we target 3-5 priority pieces or all furniture types?**

3. **Room system complexity:** Sarah proposes a full RoomGrid data model with room types and department themes. The auditor proposes a simpler parallel ROOM_ZONES array. **Simple zone coloring (auditor) or full room data model with typed rooms (Sarah)?**
