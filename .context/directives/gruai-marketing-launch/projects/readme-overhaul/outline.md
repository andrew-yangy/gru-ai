# README Overhaul -- Outline

## demo.gif Status

- **Path:** `docs/assets/demo.gif`
- **Size:** 4.7 MB (under GitHub's 10 MB raw display limit)
- **Last modified:** 2026-03-07
- **Status:** CURRENT -- no update needed
- **Content:** Pixel-art office simulation with agent characters

---

## Section-by-Section Plan

### Above the Fold (no scrolling required)

| # | Section | Purpose |
|---|---------|---------|
| 1 | Hero | Centered demo.gif (720px), bold tagline, badge row |
| 2 | One-liner | 2-sentence pitch -- what it does, why it matters |
| 3 | Quickstart | 3 commands: clone, install, dev. Copy-paste ready. |
| 4 | What Makes This Different | 3-4 visual feature blocks with clear headers |
| 5 | Comparison Table | gruai vs Devin vs CrewAI vs AutoGen -- 6 dimensions |
| 6 | How It Works | ASCII architecture diagram |
| 7 | Two Ways to Use | Clone (recommended) vs npm install |

### Below the Fold (collapsible `<details>` sections)

| # | Section | Purpose |
|---|---------|---------|
| 8 | Terminal Support | Compatibility matrix (iTerm2, Warp, tmux) |
| 9 | Claude Code Hooks | Optional hooks config for instant status |
| 10 | Scripts | npm run dev, build, lint, etc. |
| 11 | Claude Code Skills | /gruai-agents, /directive, /report, etc. |
| 12 | Tech Stack | Server, frontend, game, terminal, data layers |

### Footer

| # | Section |
|---|---------|
| 13 | License (MIT) |

---

## Comparison Table Design

6 dimensions, 4 tools:

| Dimension | gruai | Devin | CrewAI | AutoGen |
|-----------|-------|-------|--------|---------|
| Price | Free / open source | $500/mo | Free / open source | Free / open source |
| Visualization | Pixel-art office simulation | Headless (terminal logs) | None (YAML config) | None (notebook logs) |
| Autonomy Level | Full pipeline (plan/build/review/ship) | Full (cloud-based) | Script-defined agent chains | Conversational agent loops |
| Setup Time | 3 commands, < 2 min | Cloud signup + onboarding | Python env + YAML config | Python env + notebook setup |
| Open Source | Yes (MIT) | No (proprietary) | Yes (Apache 2.0) | Yes (CC-BY-4.0) |
| Platform | macOS (Linux/Windows coming) | Cloud (browser) | Any (Python) | Any (Python) |

**Positioning angle:** visibility -- "see your AI team think." Not price (CrewAI
and AutoGen are also free). Not raw autonomy (Devin matches). The pixel-art office
is the only feature none of the competitors have.

---

## Badges

| Badge | URL | Status |
|-------|-----|--------|
| MIT License | `https://img.shields.io/badge/license-MIT-green` | Valid |
| TypeScript | `https://img.shields.io/badge/TypeScript-5.9-blue` | Valid (matches package.json) |
| npm version | `https://img.shields.io/npm/v/gru-ai` | Valid (live npm badge) |
| Status | `https://img.shields.io/badge/status-alpha-orange` | Valid |

---

## Current Content Mapping

| Current Section | Decision | Rationale |
|-----------------|----------|-----------|
| Tagline ("Your AI dev team, visualized.") | KEEP | Strong, concise value prop |
| `# gruai` heading | KEEP | Matches npm package |
| Badge row | MOVE UP | Badges should be under tagline, above GIF |
| demo.gif | KEEP, MOVE UP | Lead with the GIF -- first thing visible |
| Intro paragraph (3 lines) | REWRITE | Good content, needs to be 2 sentences max |
| Competitive jab paragraph | REWRITE | Move data into comparison table |
| Quickstart | KEEP | Already 3 commands. Add post-setup instruction. |
| "What You Get" section | REWRITE as "What Makes This Different" | Rename, tighten copy, keep 4 subsections |
| -- Pixel-Art Office | KEEP | Lead feature, tighten prose |
| -- Autonomous Agent Teams | KEEP | Core feature |
| -- Directive Pipeline | KEEP | Core feature |
| -- Custom Teams | DELETE | Merge into "Autonomous Agent Teams" |
| -- Live Dashboard | KEEP | Strong feature |
| "Two Ways to Use" | KEEP | Move below comparison table |
| "How It Works" diagram | KEEP | Good ASCII diagram, minor polish |
| Terminal Support table | MOVE to collapsible | Technical detail, not above fold |
| Hooks config | MOVE to collapsible | Optional feature, not above fold |
| Tech Stack table | MOVE to collapsible | Reference info, not above fold |
| Scripts section | MOVE to collapsible | Reference info, not above fold |
| Skills list | MOVE to collapsible | Reference info, not above fold |
| License | KEEP at bottom | Standard placement |

---

## Key Writing Decisions

1. **GIF first, not heading first.** The pixel-art office is the hook.
   Heading + tagline + badges come under the GIF.
2. **Kill the competitive jab paragraph.** The comparison table does this
   better with data instead of assertions.
3. **Merge "Custom Teams" into "Autonomous Agent Teams."** One sentence
   about custom roles is enough.
4. **Collapsible sections** for everything a developer reads after deciding
   to try the tool: hooks, terminal support, scripts, skills, tech stack.
5. **npm version badge** added -- proves the package is published and real.
6. **Quickstart stays at 3 commands** but adds the `/gruai-agents` follow-up
   instruction inline (not as a separate section).
