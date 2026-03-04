# Office Simulation Game — Plan for CEO Approval

> Directive: office-simulation-game
> Weight: strategic
> Date: 2026-03-04
> Status: AWAITING CEO DECISION

---

## Executive Summary

The team brainstormed three approaches for building an office simulation game as the CEO interface for agent-conductor. All three agents converge on the core insight: **this is a visualization layer on existing data, not a new system**. The WebSocket + Zustand architecture already provides everything the game needs. The real bottleneck is art assets, not code.

## Recommended Approach (Synthesized)

**React Canvas game layer inside the existing Vite app.** No game engine. Same Zustand store, same WebSocket, same Hono server. The game is a new "mode" that renders the office as an HTML5 Canvas, with agents as sprites whose state is driven by real session data. Pixel art aesthetic (32x32 tiles, top-down/3/4 view).

### Build Phases (if approved)

1. **Interaction Design** (1-2 days) — Clickable prototype of core game mechanics. Validates that game metaphors improve the CEO experience before writing game code.

2. **Art + Engine** (4-6 days) — Source/create pixel art assets (office tileset, agent sprites, animations). Build Canvas rendering engine (grid, sprites, camera, click detection). This is the heaviest phase.

3. **State Integration** (3-4 days) — Connect game rendering to Zustand store. Agent sprites move/animate based on real WebSocket data. Click agent to see their work. Click whiteboard to see directive status.

4. **Action Layer** (2-3 days) — Game actions that trigger real effects: drag agent to project room = spawn directive, sign document at desk = approve plan, ring bell = start /scout.

5. **Demo Mode + Polish** (2-3 days) — Public demo with mock data for showcase. Sound effects. Ambient office atmosphere.

**Total: 12-18 days across multiple directives.**

## What the CEO Needs to Decide

### Question 1: Primary or Alternative?

- **Option A (Bold):** Game is the default CEO interface. Dashboard is power-user fallback (like Finder vs Terminal). Higher investment, stronger positioning.
- **Option B (Safe):** Game is an alternative view toggled from dashboard. Lower risk, but may never get enough investment to be great.
- **Team leaning:** Priya says A, Marcus says B, Sarah is neutral (tech works either way).

### Question 2: V1 Scope

- **Option A (Functional tool):** All core CEO actions work in-game. Full workflow coverage. Higher effort.
- **Option B (Compelling demo):** Core actions work, edge cases fall back to dashboard. Optimized for "wow" factor and shareability. Lower effort.
- **Team leaning:** Marcus says B (validate first), Priya says B-but-impressive (demo quality = marketing value).

### Question 3: Art Assets

- **Option A:** Purchase pixel art asset packs from itch.io ($20-50). Higher quality, faster.
- **Option B:** AI-generate all assets. Free, but consistency may suffer.
- **Option C:** Hybrid — buy base tileset, AI-generate character sprites.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Game is fun for a day, then CEO switches back to dashboard | Medium | High | Validate interaction design first (Phase 1) before heavy investment |
| Art assets look inconsistent/amateur | Medium | Medium | Buy a professional tileset as the base |
| Canvas performance with many sprites | Low | Medium | Agent count is small (5-10 sprites) — not a real concern |
| Game actions accidentally trigger real work | Low | High | Confirmation dialogs for all action-triggering interactions |
| Scope creep into full game engine | Medium | High | Sarah's constraint: React Canvas only, no Phaser/Godot |

## Next Steps (Pending CEO Decision)

If approved, the first directive would be: **"Build office simulation game interaction prototype"** — a clickable HTML/CSS mockup showing all game mechanics, before any Canvas/sprite code is written.

---

*Full brainstorm synthesis with all proposals, rebuttals, and research is in `brainstorm.md` in this directory.*
