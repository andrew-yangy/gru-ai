# Agent Conductor

**The mission control for Claude Code power users.**

If you're like me — running Claude Code like crazy, multitasking across 10+ terminal sessions, constantly tab-switching to check if an agent finished, peeking at team progress, approving prompts, and wishing you could just *click something* to jump straight to the right session — Agent Conductor is for you. It's a real-time dashboard that gives you full visibility and control over every Claude Code session, so you can stop juggling terminals and start shipping faster.

![Dashboard](https://img.shields.io/badge/status-alpha-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![React](https://img.shields.io/badge/React-19-blue) ![License](https://img.shields.io/badge/license-MIT-green)

![Demo](docs/demo.gif)

## Features

### Session Kanban Board
See every Claude Code session at a glance — organized into columns by status: **Active**, **Waiting**, **Needs You**, and **Done**. Each card shows the model, git branch, working directory, elapsed time, and what the agent is doing *right now*. Filter by time range, search by project, and never lose track of a session again.

### One-Click Session Focus
Click any session card and instantly jump to its terminal tab/pane. No more hunting through 15 tmux panes or 8 iTerm tabs. Works with **tmux**, **iTerm2**, **Warp**, and **Terminal.app** — Conductor detects which terminal hosts each session and shows a badge on the card so you know at a glance.

### Live Activity Tracking
See what each agent is doing in real-time: which tool is running, what file is being edited, whether it's thinking. Active sessions pulse with a green dot. You'll know the moment something finishes or needs attention.

### Agent Teams & Subagents
Monitor entire agent teams from one view. See team members, their roles, current tasks, and progress bars. Subagents are nested under their parent session with their own status and activity. Track task completion across the whole team without switching terminals.

### Quick Actions — Approve, Reject, Abort
When a session is waiting for approval or input, action buttons appear right on the card. Approve, reject, or abort without leaving the dashboard. Send custom text input too. No more switching to a terminal just to type "y".

### Prompt History
Searchable history of every prompt across all sessions — 1000+ entries, filterable by project and date. Find that prompt you ran three days ago, see what you asked, and pick up where you left off.

### Usage Insights
Daily message charts, model usage breakdown, activity heatmaps, and session statistics. See how you're using Claude Code across projects and time periods.

### Plans Viewer
Browse all your Claude Code plans with rendered markdown previews. See which plans are running, done, or still in draft.

### Notifications
Native macOS alerts and browser notifications when agents need your attention — even when the dashboard is minimized. Never miss a permission prompt again.

### Stale Team Cleanup
Old teams cluttering your `~/.claude/teams/`? Delete them with one click from the dashboard.

## Quick Start

```bash
git clone https://github.com/andrew-yangy/agent-conductor.git
cd agent-conductor
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). That's it.

Agent Conductor automatically discovers all your Claude Code sessions from `~/.claude/` — no configuration, no hooks, no setup. Just run it and see everything.

## Architecture

```
~/.claude/                          Agent Conductor
┌─────────────────────┐            ┌──────────────────────────────────────┐
│ projects/           │            │                                      │
│   {project}/        │  chokidar  │  ┌──────────────┐   ┌────────────┐  │
│     {uuid}.jsonl  ──┼──watch────>│  │   Session     │──>│            │  │
│     {uuid}/         │            │  │   Scanner     │   │ Aggregator │  │
│       subagents/    │            │  └──────────────┘   │            │  │
│         agent-*.jsonl            │                      │  merges    │  │
│                     │            │  ┌──────────────┐   │  sources   │  │
│ teams/              │  read      │  │   Team &     │──>│  into      │  │
│   {team}/config.json├──────────>│  │   Task       │   │  unified   │  │
│                     │            │  │   Parsers    │   │  state     │  │
│ tasks/              │  read      │  └──────────────┘   └─────┬──────┘  │
│   {team}/*.json   ──┼──────────>│                            │         │
│                     │            │  ┌──────────────┐         │         │
│ history.jsonl     ──┼──read────>│  │   Process    │   WebSocket     │
│ plans/*.md        ──┼──read────>│  │   Discovery  │─────────│         │
│ stats-cache.json  ──┼──read────>│  │   (ps, lsof) │         │         │
└─────────────────────┘            │  └──────────────┘   ┌─────▼───────┐ │
                                   │                     │   React     │ │
  ┌─────────────┐                  │                     │   Dashboard │ │
  │ Hook events │   POST           │                     │             │ │
  │ (optional)  ├──/api/events───>│  enrich status ────>│  Sessions   │ │
  └─────────────┘                  │                     │  Teams      │ │
                                   │  ┌──────────────┐   │  Insights   │ │
  ┌─────────────┐                  │  │  Terminal    │   │  History    │ │
  │ Click card  │   POST           │  │  Focus &    │   │  Plans      │ │
  │ in browser  ├──/api/actions──>│  │  Send Input │   │  Settings   │ │
  └─────────────┘                  │  └──────────────┘   └─────────────┘ │
                                   └──────────────────────────────────────┘
```

**How it works:**

1. **Session Scanner** watches `~/.claude/projects/` for JSONL session files. Active sessions (modified < 30s) get tail-read for live metadata — model, git branch, cwd, current tool, file being edited. Inactive sessions use file path info only, keeping things fast even with hundreds of sessions.

2. **Process Discovery** maps running Claude processes to terminal panes using `ps` and `lsof`. It walks process trees to find tmux panes, iTerm2 tabs, and Warp windows. For sessions where Claude has exited (orphan tabs), it uses TTY + CWD matching to still connect the dots.

3. **Team & Task Parsers** read team configs and task lists from `~/.claude/teams/` and `~/.claude/tasks/`. Subagent relationships are built from the directory structure.

4. **Aggregator** merges everything into a single state object, pushed to the dashboard via WebSocket in real-time.

## Supported Terminals

Session discovery works on **any OS** where Claude Code runs — it just reads `~/.claude/` files.

Terminal focus and send-input require OS-level integration. Current support:

| Environment | Focus | Send Input | How It Works |
|-------------|:-----:|:----------:|--------------|
| **iTerm2 + tmux** | Yes | Yes | AppleScript tab switching + tmux `select-pane` |
| **iTerm2 (native)** | Yes | Yes | AppleScript with unique session ID |
| **Warp + tmux** | Yes | Yes | CGEvents for Warp + tmux for pane |
| **Warp (native)** | Yes | No | CGEvents tab navigation |
| **Terminal.app + tmux** | Yes | Yes | Brings app to front + tmux pane switching |

Each session card shows a **terminal badge** (tmux, iTerm, Warp) so you know what's available at a glance.

> **Coming soon:** Linux support via `xdotool`/`wmctrl`, Kitty/Alacritty IPC, Windows PowerShell-based activation.

## Optional: Claude Code Hooks

Agent Conductor works out of the box — no hooks required. But for **instant** status detection (permission prompts, idle states), you can add hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [{ "type": "command", "command": "bash -c 'INPUT=$(cat); curl -s -X POST http://localhost:4444/api/events -H \"Content-Type: application/json\" -d \"{\\\"type\\\":\\\"permission_prompt\\\",\\\"sessionId\\\":\\\"$(echo $INPUT | jq -r .session_id)\\\",\\\"message\\\":\\\"$(echo $INPUT | jq -r .message)\\\"}\"'" }]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [{ "type": "command", "command": "bash -c 'INPUT=$(cat); curl -s -X POST http://localhost:4444/api/events -H \"Content-Type: application/json\" -d \"{\\\"type\\\":\\\"idle_prompt\\\",\\\"sessionId\\\":\\\"$(echo $INPUT | jq -r .session_id)\\\",\\\"message\\\":\\\"$(echo $INPUT | jq -r .message)\\\"}\"'" }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "bash -c 'INPUT=$(cat); curl -s -X POST http://localhost:4444/api/events -H \"Content-Type: application/json\" -d \"{\\\"type\\\":\\\"stop\\\",\\\"sessionId\\\":\\\"$(echo $INPUT | jq -r .session_id)\\\"}\"'" }]
      }
    ]
  }
}
```

Without hooks, Conductor detects status via filesystem scanning (slight delay). With hooks, status updates are instant.

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Server** | Node.js + `ws` WebSocket + SQLite (better-sqlite3) + chokidar |
| **Frontend** | React 19 + Vite + Zustand + Tailwind v4 + shadcn/ui |
| **Terminal** | AppleScript (iTerm2, Terminal.app) + CGEvents (Warp) + tmux CLI |
| **Data** | Zero external services — everything reads from `~/.claude/` locally |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/state` | Full dashboard state |
| `GET` | `/api/events` | Recent events |
| `POST` | `/api/events` | Add hook event |
| `POST` | `/api/actions/focus-session` | Focus a terminal pane |
| `POST` | `/api/actions/send-input` | Send input to a session |
| `DELETE` | `/api/teams/:name` | Delete a stale team |
| `GET` | `/api/config` | Get notification settings |
| `PATCH` | `/api/config` | Update notification settings |
| `GET` | `/api/insights/stats` | Usage statistics |
| `GET` | `/api/insights/history` | Prompt history |
| `GET` | `/api/insights/plans` | Plan files |
| `WS` | `ws://localhost:4444` | Real-time state stream |

## Scripts

```bash
npm run dev          # Start server + client
npm run dev:server   # Server only (port 4444)
npm run dev:client   # Vite dev only
npm run build        # Production build
npm run type-check   # TypeScript check
npm run lint         # ESLint
```

## License

MIT
