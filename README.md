<p align="center">
  <img src="docs/assets/demo.gif" alt="gruai pixel-art office simulation" width="720" />
</p>

<h1 align="center">gruai</h1>

<p align="center">
  <strong>Your AI dev team, visualized.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9-blue" alt="TypeScript" /></a>
  <a href="https://www.npmjs.com/package/gru-ai"><img src="https://img.shields.io/npm/v/gru-ai" alt="npm version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/status-alpha-orange" alt="Status: Alpha" /></a>
</p>

---

gruai turns Claude Code sessions into a living pixel-art office. Autonomous agents
sit at desks, write code, review PRs, and ship features -- and you watch it happen
in real time.

---

## Quickstart

```bash
git clone https://github.com/andrew-yangy/gruai.git
cd gruai && npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the office. In Claude Code,
run `/gruai-agents` to scaffold your AI team with personalities, a team registry, and
a starter directive.

---

## What Makes This Different

### Pixel-Art Office Simulation

Your agents are not abstract boxes on a kanban board. They are characters in an
isometric office -- walking to their desks, typing at keyboards, gathering at a
whiteboard to brainstorm. Every animation is tied to real session state. When an agent
starts a code review, you see them walk over to the reviewer's desk.

### Autonomous Agent Teams

Define roles -- planner, builder, reviewer, scout -- and gruai handles the rest.
Agents pick up directives, decompose them into projects and tasks, build code, and
review each other's work. Create custom roles with markdown templates in
`.claude/agents/` and the office renders them as unique characters.

### Directive Pipeline

Every piece of work flows through a structured pipeline: triage, planning, audit,
build, review, completion. Lightweight tasks skip the heavy steps automatically.
No ceremony for small fixes, full rigor for big features.

### Live Dashboard

Session kanban, activity tracking, one-click terminal focus, approval actions,
prompt history, and usage insights. Everything you need to manage 10+ concurrent
Claude Code sessions without losing track.

---

## gruai vs The Alternatives

| | gruai | Devin | CrewAI | AutoGen |
|---|---|---|---|---|
| **Price** | Free (MIT) | $500/mo | Free (Apache 2.0) | Free (CC-BY-4.0) |
| **Visualization** | Pixel-art office | None (headless) | None (YAML config) | None (notebook logs) |
| **Autonomy** | Full pipeline: plan, build, review, ship | Full (cloud) | Script-defined chains | Conversational loops |
| **Setup Time** | 3 commands, < 2 min | Cloud signup | Python + YAML config | Python + notebooks |
| **Open Source** | Yes | No | Yes | Yes |
| **Platform** | macOS (Linux/Win coming) | Browser (cloud) | Any (Python) | Any (Python) |

---

## How It Works

```
Your repo                              gruai
+---------------------+               +------------------------------+
| .context/           |               |                              |
|   directives/       |  file watch   |  Directive    Agent          |
|     {id}/           +-------------->|  Pipeline --> Casting         |
|       directive.json |               |                              |
|       projects/      |               |  Session      Pixel-Art     |
|                      |               |  Scanner  --> Office UI      |
| .claude/             |               |                              |
|   agents/            |  session      |  Process      Live           |
|     {role}.md        |  discovery    |  Discovery -> Dashboard      |
|                      +-------------->|                              |
| ~/.claude/           |               |  WebSocket    React          |
|   projects/          |               |  Server   --> Frontend       |
|     *.jsonl          |               |                              |
+---------------------+               +------------------------------+
```

1. **Directive Pipeline** reads `.context/directives/` and orchestrates work
   through triage, planning, build, and review phases
2. **Session Scanner** watches `~/.claude/projects/` for live Claude Code
   sessions and extracts metadata (model, branch, tools in use)
3. **Process Discovery** maps running Claude processes to terminal panes
   via `ps` and `lsof` -- supports tmux, iTerm2, Warp, and Terminal.app
4. **Pixel-Art Office** renders agents as characters in an isometric office
   with real-time animations tied to actual session state

---

## Two Ways to Use

### Clone and run (recommended)

```bash
git clone https://github.com/andrew-yangy/gruai.git
cd gruai && npm install
npm run dev
```

The dashboard discovers all Claude Code sessions from `~/.claude/`
automatically -- no config needed.

### Install as npm package

```bash
npm install gru-ai
npx gru-ai
```

Then run `/gruai-agents` in Claude Code to scaffold agents into your project.

---

<details>
<summary><strong>Terminal Support</strong></summary>

Session discovery works on any OS. Terminal focus requires OS integration:

| Environment | Focus | Send Input | Notes |
|-------------|:-----:|:----------:|-------|
| iTerm2 + tmux | Yes | Yes | AppleScript + tmux pane switching |
| iTerm2 native | Yes | Yes | AppleScript with session ID |
| Warp + tmux | Yes | Yes | CGEvents + tmux |
| Warp native | Yes | No | CGEvents tab navigation |
| Terminal.app + tmux | Yes | Yes | Bring to front + tmux |

Linux and Windows support coming soon.

</details>

<details>
<summary><strong>Claude Code Hooks</strong></summary>

gruai works without hooks. For instant status detection (permission prompts,
idle states), add hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'INPUT=$(cat); curl -s -X POST http://localhost:4444/api/events -H \"Content-Type: application/json\" -d \"{\\\"type\\\":\\\"permission_prompt\\\",\\\"sessionId\\\":\\\"$(echo $INPUT | jq -r .session_id)\\\",\\\"message\\\":\\\"$(echo $INPUT | jq -r .message)\\\"}\"'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'INPUT=$(cat); curl -s -X POST http://localhost:4444/api/events -H \"Content-Type: application/json\" -d \"{\\\"type\\\":\\\"stop\\\",\\\"sessionId\\\":\\\"$(echo $INPUT | jq -r .session_id)\\\"}\"'"
          }
        ]
      }
    ]
  }
}
```

Without hooks, status updates via filesystem scanning (slight delay). With hooks,
updates are instant.

</details>

<details>
<summary><strong>Scripts</strong></summary>

```bash
npm run dev          # Dev mode (server + client with hot reload)
npm run dev:server   # Server only (port 4444)
npm run dev:client   # Vite dev only
npm start            # Production server (serves built assets)
npm run build        # Production build
npm run type-check   # TypeScript check
npm run lint         # ESLint
```

</details>

<details>
<summary><strong>Claude Code Skills</strong></summary>

```
/gruai-agents        # Scaffold AI agent team with personalities and roles
/gruai-config        # Update framework files to latest version
/directive           # Run work through the directive pipeline
/report              # CEO dashboard report
/healthcheck         # Internal codebase health check
/scout               # External intelligence gathering
```

</details>

<details>
<summary><strong>Tech Stack</strong></summary>

| Layer | Stack |
|-------|-------|
| Server | Node.js + WebSocket + SQLite + chokidar |
| Frontend | React 19 + Vite + Zustand + Tailwind v4 + shadcn/ui |
| Game | Canvas 2D pixel-art engine, 16x16 tile system |
| Terminal | AppleScript (iTerm2) + CGEvents (Warp) + tmux CLI |
| Data | Zero external services -- reads from `~/.claude/` locally |

</details>

---

[MIT](LICENSE)
