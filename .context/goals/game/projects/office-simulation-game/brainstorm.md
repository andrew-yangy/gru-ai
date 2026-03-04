# Office Simulation Game — Brainstorm Synthesis

> Directive: office-simulation-game
> Weight: strategic
> Participants: Sarah (CTO), Marcus (CPO), Priya (CMO)
> Date: 2026-03-04
> Research: Web research conducted 2026-03-04 (real findings, not training data)

---

## The Idea

Replace the current dashboard UI with an office simulation game as the PRIMARY CEO interface. The CEO "plays" the game — walking around an office, assigning agents to desks, reviewing work on whiteboards, making decisions at a conference table — and behind the scenes, the agents do REAL work. The game IS the management interface. Dashboard becomes power-user fallback (like Finder vs Terminal).

---

## Research Findings (Web Research — 2026-03-04)

### Google Genie — Verdict: Not Relevant

- **Genie 2** (Dec 2024): Generates interactive 3D environments from a single image. 720p, 10-20 second worlds, keyboard-controlled characters.
- **Genie 3** (2025): Text-to-interactive-3D-world. 720p at 24fps, worlds last "a few minutes." Better consistency than Genie 2.
- **Availability**: NOT publicly available. Limited research preview for academics only. No API, no developer tools.
- **Limitations**: Poor text rendering, limited action space, poor multi-agent interaction, can't sustain extended sessions.
- **Verdict**: Genie generates ephemeral AI worlds — we need a persistent, hand-crafted office that maps to real operations. Completely orthogonal. Not a building block for this project.

Sources:
- https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/
- https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/

### Existing Projects — Someone Already Built This (3x)

#### 1. Claw-Empire (Most Feature-Complete)
**"Command Your AI Agent Empire from the CEO Desk"**
- GitHub: https://github.com/GreenSheep01201/claw-empire
- **Tech**: React 19 + Vite 7 + PixiJS 8 (pixel-art engine) + Express 5 + SQLite + WebSocket
- **What it does**: Pixel-art office where you're the CEO. Agents connect to REAL AI tools (Claude Code, Codex CLI, Gemini CLI, OpenCode). 6 departments (Planning, Dev, Design, QA, DevSecOps, Ops). Kanban board, meetings, task assignment, PowerPoint export.
- **Game features**: Agents walk between desks, attend meetings, earn XP, ranking boards, 600+ categorized skills, skill training with classroom animations.
- **CEO actions**: Create/assign/monitor tasks (drag-and-drop Kanban), chat with team leaders, "$" directives for meetings/routing, schedule meetings with AI-generated minutes, generate PowerPoint from reports.
- **Integrations**: Telegram, Discord, Slack, WhatsApp, Google Chat, Signal, iMessage.
- **Architecture**: Local-first, OAuth tokens AES-256-GCM encrypted, git branch isolation per agent.
- **Maturity**: v2.0.1, actively maintained.
- **Key insight**: Proves the concept works at scale. But it's a general-purpose multi-agent orchestrator, NOT a CEO workflow tool. No directive pipeline, no strategic planning, no C-suite roles.

#### 2. AgentOffice (Self-Growing Teams)
- Blog: https://dev.to/harishkotra/how-i-built-agentoffice-self-growing-ai-teams-in-a-pixel-art-virtual-office-4o0p
- **Tech**: Phaser.js + React + Vite + Colyseus (real-time multiplayer) + SQLite + Ollama (local LLM)
- **What it does**: Pixel-art office where AI agents walk around, think (15-second cycles), talk to each other, execute code, search the web, assign tasks, and HIRE NEW TEAM MEMBERS autonomously.
- **Agent loop**: Perceive (gather context) -> Think (LLM returns JSON decision) -> Act (move, talk, use tools, hire) -> Remember (semantic memory with importance scoring).
- **State management**: Colyseus delta-compression sync. React components listen via `agent.onChange()`.
- **Memory**: SQLite + Ollama embeddings + JS cosine similarity. Practical for "a few hundred memories per agent."
- **Key lesson**: Phaser steals keyboard input. Fix: `input.keyboard.capture: []` and disable keyboard when React inputs focused.
- **Key lesson**: LLM outputs unpredictable. Fix: Wrap JSON parsing in try-catch with idle-action defaults.
- **Key insight**: Colyseus eliminated custom WebSocket boilerplate. But Phaser/React hybrid creates friction.

#### 3. Pixel Agents (VS Code Extension — 2.7k stars, 378 forks)
- GitHub: https://github.com/pablodelucca/pixel-agents
- **Tech**: React 19 + Canvas 2D (NO game engine!) + TypeScript + VS Code Webview API + esbuild
- **What it does**: Turns Claude Code terminals into animated pixel characters in a virtual office. Characters walk, type, read based on REAL agent activity.
- **Activity detection**: Monitors Claude Code JSONL transcript files. Detects tool usage patterns (file writes, command execution, searches). No modification to Claude Code needed.
- **Animation states**: Idle, Walking (BFS pathfinding), Typing (writing code), Reading (searching files), Waiting (needs user input).
- **Art**: Uses "Office Interior Tileset (16x16)" by Donarg from itch.io ($2). Import pipeline not straightforward. Works without purchased assets using defaults.
- **Features**: Office layout editor (up to 64x64 grid), sub-agent support (task tool sub-agents spawn as separate characters), sound notifications, drag-to-reassign agents.
- **Limitations**: Agent-terminal sync unreliable during rapid operations. Status detection is heuristic-based (timeout-based, frequently misfires). Only validated on Windows 11.
- **Key insight**: PROVES React + Canvas 2D works for this exact use case without a game engine. Sarah was right.

### Gamification Market Landscape

- **Habitica**: RPG wrapper on real-life habits/todos. 4M+ users. Proves gamification of real work increases engagement. But thin — no spatial simulation.
- **Screeps**: MMO where you program units in JavaScript. Code runs 24/7. Proves real code execution inside a game loop works.
- **Gather.town / Teamflow**: 2D virtual offices. Spatial metaphor for team coordination. People "see" who's available.
- **ChatDev**: Simulates a software company with AI agents (CEO, CTO, programmer, tester). Chat room metaphor, no game interface.
- **Game Dev Tycoon / Software Inc / Kairosoft**: Management sims. Exactly the UX metaphor we want — assign employees to projects, make decisions, review releases.

Sources:
- https://dev.to/harishkotra/how-i-built-agentoffice-self-growing-ai-teams-in-a-pixel-art-virtual-office-4o0p
- https://github.com/GreenSheep01201/claw-empire
- https://github.com/pablodelucca/pixel-agents

### AI Pixel Art Tools — Production-Ready in 2026

| Tool | Specialty | Pricing | Key Feature |
|------|-----------|---------|-------------|
| **PixelLab** (pixellab.ai) | Game pixel art | Free tier + paid | One-click animations, 4/8 directional sprite rotation, isometric support, tileset generation, API available |
| **Sprite-AI** (sprite-ai.art) | Game sprites | Pay-per-generation | Specific pixel sizes (16x16-128x128), built-in editor, game-engine-ready export |
| **Pixa** (pixa.com) | Character sprites | Free tier | Text-prompt sprites, 8-bit/16-bit/modern styles |
| **Dzine** (dzine.ai) | Sprite sheets | - | Formatted sprite sheets, transparent PNG, Unity/Godot compatible |
| **PixelVibe** (Rosebud AI) | Production 2D assets | - | Tiles, portraits, full-body sprites, 360-degree skyboxes |

**2026 consensus**: AI pixel art tools have gone from "interesting demo" to genuinely useful production tools. Most shipped indie games combine multiple tools. Good for prototyping and solo dev. Won't replace skilled pixel artists on big projects, but consistency is now achievable.

Sources:
- https://www.pixellab.ai/
- https://www.sprite-ai.art/blog/best-pixel-art-generators-2026
- https://www.sprite-ai.art/features/sprite-generator

### Technology Decision Matrix (Updated with Real-World Evidence)

| Option | Who Uses It | Evidence | React Integration | Keyboard Issues |
|--------|------------|----------|-------------------|-----------------|
| **React + Canvas 2D** | Pixel Agents (2.7k stars) | Proven for this exact use case | Native (same app) | None |
| **PixiJS 8** | Claw-Empire (v2.0.1) | Proven at scale, actively maintained | Good (pixi-react) | Unknown |
| **Phaser.js** | AgentOffice | Works but causes keyboard input theft | Embed via ref, friction | YES — documented issue |
| **Colyseus** | AgentOffice | Good for multiplayer sync | N/A (server-side) | N/A |

**Verdict**: The real-world evidence supports Sarah's recommendation. React + Canvas 2D is proven (Pixel Agents), avoids Phaser's keyboard issues (AgentOffice learned this the hard way), and keeps everything in one React app. PixiJS (Claw-Empire) is also proven but adds a dependency.

---

## Our Unique Angle

None of the existing projects have:
1. **The directive pipeline** — strategic planning, C-suite brainstorms, phased execution
2. **CEO-driven workflow** — approve plans, give feedback, make strategic decisions
3. **C-suite agent roles** — named characters with distinct personalities and specialties
4. **Progressive disclosure** — game actions map to real multi-step pipelines (not just "assign task")
5. **Game as PRIMARY interface** — existing projects are monitoring/visualization tools, not THE interface

We're not building "an agent visualizer." We're building "Game Dev Tycoon but it runs your real AI company."

---

## CEO Decisions (Approved 2026-03-04)

1. **Primary interface (Option A)**: Game IS the default CEO view. Dashboard is power-user fallback.
2. **Functional tool (Option A)**: All core CEO actions work in-game for V1. Full workflow coverage.
3. **AI-generated art (Option B)**: AI-generate all assets. Not fully decided — open to hybrid.

---

## Brainstorm Proposals

### Sarah (CTO) — Proposal

**Approach**: Build it as a React Canvas component inside the existing Vite app — not a separate game engine. The office is an HTML5 Canvas rendered by a custom hook that reads from the same Zustand store the dashboard uses. Keep the game layer THIN.

**Tradeoffs**:
- Simpler tech = less impressive visuals, but ships faster and maintains easier
- Same React app = no iframe boundary issues, but Canvas rendering inside React needs careful performance management
- No game engine = we own the whole stack, but we build more from scratch

**Avoid**: Full game engines (Godot, Unity, Phaser). Integration cost with React + WebSocket is enormous. Two apps communicating via postMessage = double state management complexity.

**Confidence**: High

**Validated by research**: Pixel Agents (2.7k stars) proves React + Canvas 2D works. AgentOffice documents Phaser keyboard issues.

### Marcus (CPO) — Proposal

**Approach**: Start with USER EXPERIENCE, not tech. Map every dashboard action to a game action. Build interaction design FIRST as a clickable prototype. Validate that the game metaphor actually improves the CEO experience, THEN choose tech.

**Tradeoffs**:
- Prototype-first delays code but avoids building the wrong thing
- Game metaphor might be charming for 5 minutes but annoying for daily use
- Some dashboard actions (search, filter, bulk operations) don't map naturally to game mechanics

**Avoid**: Building the game as the ONLY interface. Some tasks are genuinely faster in traditional UI.

**Confidence**: Medium

**Validated by research**: Claw-Empire built the full thing first and it works — but there's no evidence their users prefer it over a dashboard for daily work.

### Priya (CMO) — Proposal

**Approach**: This is a POSITIONING opportunity. "Manage your AI company by playing a game" is a viral concept. Build for public demo from day one. 30-second GIF of pixel-art CEO walking around while AI agents code in real-time = better than any landing page.

**Tradeoffs**:
- Optimizing for virality might conflict with daily usability
- Pixel art might not feel "professional" for serious tool
- Public demo + private use = two modes

**Avoid**: Building as internal-only tool. Wastes biggest marketing opportunity.

**Confidence**: Medium

**Validated by research**: Pixel Agents got 2.7k GitHub stars — the concept generates organic interest.

---

## Phase 2: Deliberation (Rebuttals)

### Sarah rebuts Priya

> Push back on Phaser/PixiJS. Adding a game engine creates split architecture. The viral GIF looks the same whether rendered by Phaser or Canvas. **Research confirms this**: AgentOffice documents Phaser keyboard issues; Pixel Agents proves Canvas works fine.

### Marcus rebuts Sarah

> Sarah's phased approach (static -> click -> drag) is backwards. Phase 1 (static layout) is just a screensaver. The value is in Phase 3 (drag-to-assign). Prototype interaction design for all phases FIRST, build Phase 3 from day one.

### Priya rebuts Marcus

> "Alternative view" framing kills investment. Game should be PRIMARY interface for core CEO loop. Dashboard = power user fallback. Like Finder vs Terminal. **Research shows**: Claw-Empire commits to game-as-primary and it works at v2.0.1.

---

## Synthesis

### Convergence Points

1. **Visualization layer on existing data** — not a separate system. WebSocket + Zustand already provides everything.
2. **Pixel art / retro aesthetic** — achievable, charming, distinct. AI tools make this production-ready in 2026.
3. **CEO experience must be better, not just different** — game needs to make work more enjoyable AND efficient.
4. **Art assets are the real bottleneck** — code is the easy part. PixelLab + Sprite-AI can help.

### Recommended Approach (Updated with Research)

- **Sarah's tech choice**: React + Canvas 2D (proven by Pixel Agents, avoids Phaser issues from AgentOffice)
- **Marcus's build order**: Interaction design first, not static layout
- **Priya's positioning**: Build for public demo from day one (validated by Pixel Agents' 2.7k stars)
- **CEO's decision**: Game as PRIMARY interface, dashboard as fallback

### Game Mechanics Mapping

| CEO Action (Current Dashboard) | Game Mechanic | Real Backend Effect |
|-------------------------------|---------------|-------------------|
| Read directive brief | Walk to CEO desk, see document | None (read-only) |
| Approve directive plan | Sign document at desk | Triggers execution pipeline |
| Check agent status | Walk to agent's desk, see their screen | None (read-only) |
| Review agent output | Walk to whiteboard, see results | None (read-only) |
| Assign work to agent | Drag agent to project room | Spawns directive/agent |
| Check goal progress | Look at office wall chart | None (read-only) |
| Start /scout | Ring the office bell | Triggers scout skill |
| Read report | Walk to mailbox | None (read-only) |
| Give feedback on work | Speech bubble interaction | Writes to directive/feedback |

### Art Style Direction

Pixel art, 32x32 base tile size. Top-down or 3/4 view (Stardew Valley / Kairosoft style). AI-generated using PixelLab + Sprite-AI.

**Office layout**:
- Open floor plan with desks for each C-suite member (nameplated)
- Conference room for directive planning
- Whiteboard area for current sprint/directive status
- CEO's corner office
- Server room door that glows when agents are actively processing
- Ephemeral engineer desks that appear/disappear as agents spawn/complete

**Agent visual identity**:
- Alex: suits, clipboard
- Sarah: hoodie, laptop
- Morgan: blazer, checklist
- Marcus: casual, whiteboard marker
- Priya: business casual, megaphone
- Ephemeral engineers: identical sprites with numbered badges

### Estimated Effort

| Phase | Effort | Description |
|-------|--------|-------------|
| Interaction design prototype | 1-2 days | Clickable mockup of core game mechanics |
| Art asset generation (AI) | 2-3 days | PixelLab/Sprite-AI for tileset + sprites + animations |
| Canvas rendering engine | 2-3 days | Grid system, sprite rendering, camera, click detection |
| State integration | 1 day | Connect to existing Zustand store + WebSocket |
| Core interactions | 2-3 days | Click agent to see work, click whiteboard for status |
| Action interactions | 2-3 days | Drag-to-assign, sign-to-approve, ring bell for scout |
| Public demo mode | 1 day | Mock data source for showcase |
| Polish + sound | 1-2 days | Ambient office sounds, notifications |
| **Total** | **12-18 days** | Spread across multiple directives |
