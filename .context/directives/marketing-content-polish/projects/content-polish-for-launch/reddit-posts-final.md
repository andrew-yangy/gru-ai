# Reddit Launch Posts -- Final (Ready to Post)

Three posts, each tailored for its subreddit. Copy the Title, Flair, and Body
directly into Reddit. Post the Builder's Note as a reply comment within 5
minutes of posting.

GitHub repo: `https://github.com/andrew-yangy/agent-conductor`
npm package: `gru-ai`

---

## Post 1: r/ClaudeCode

**Title:** I built a pixel-art office that visualizes your Claude Code sessions in real-time

**Flair:** Tools & Projects

---

**Body:**

I've been running multi-agent Claude Code setups for a few months -- CTO, builder, reviewer agents working on a shared codebase. The problem: I had no idea what was happening across sessions without tailing 5 terminal windows.

So I built [gruai](https://github.com/andrew-yangy/agent-conductor) -- it watches your Claude Code session files and renders them as characters in a pixel-art isometric office. When an agent starts coding, you see them sit at a desk and type. When they start a review, they walk to the reviewer's desk. Brainstorming? They gather at the whiteboard.

**What it actually does:**
- Watches `~/.claude/projects/` for active sessions
- Maps agents defined in `.claude/agents/*.md` to pixel-art characters with idle, walking, and working animations
- Shows real-time status: which agent is active, what they're working on, current pipeline stage (triage -> plan -> build -> review -> ship)
- Includes a live dashboard with session kanban, activity tracking, and one-click terminal focus
- Runs locally -- no cloud, no API keys beyond what Claude Code already uses

**Quick start:**

```
git clone https://github.com/andrew-yangy/agent-conductor.git
cd agent-conductor && npm install
npm run dev
```

Also on npm: `npm install -g gru-ai && gru-ai`

**Tech stack:** React 19, TypeScript, Canvas 2D (no game engine), Vite, Express + chokidar for session watching, SQLite for state.

There's also a directive pipeline baked in -- structured triage, planning, build, and review stages with review gates. You define agents as markdown templates and the pipeline handles task decomposition, agent casting, code review, and completion verification. Lightweight tasks skip the heavy steps automatically.

It's MIT-licensed and macOS only for now (Linux/Windows terminal integration coming). Happy to answer questions about the architecture or how the session watcher works.

GitHub: https://github.com/andrew-yangy/agent-conductor

---

**Builder's Note (post as first comment):**

One thing I didn't mention in the post -- the agent animations are tied to real session state via file watchers, not mocked. If you kill a Claude Code session, the character stands up and walks away from their desk. The process discovery layer maps running Claude processes to terminal panes via `ps` and `lsof`, so it supports tmux, iTerm2, Warp, and Terminal.app. You can click an agent in the office and it focuses the right terminal pane.

---
---

## Post 2: r/ChatGPTCoding

**Title:** I built an open-source AI agent office -- gruai vs Devin, CrewAI, AutoGen

**Flair:** Tool / Resource

---

**Body:**

I've been building an open-source AI agent framework called [gruai](https://github.com/andrew-yangy/agent-conductor) and wanted to share how it fits alongside tools like Devin, CrewAI, AutoGen, and LangGraph.

**The short version:** gruai gives you a team of AI agents (planner, builder, reviewer) that work through a structured pipeline, and you watch them do it in a pixel-art isometric office. Every agent is a character with animations tied to real session state.

**How it compares:**

| Feature | gruai | Devin | CrewAI | AutoGen |
|---------|-------|-------|--------|---------|
| Visualization | Pixel-art office (real-time) | Web IDE | None | None |
| Pipeline | Triage > Plan > Build > Review > Ship | Autonomous | Role-based chains | Conversation patterns |
| Model support | Claude Code | Proprietary | Any LLM | Any LLM |
| Pricing | Free (MIT) | $500/mo | Free (Apache 2.0) | Free (CC-BY-4.0) |
| Setup | 3 commands, < 2 min | Cloud signup | Python + YAML | Python + notebooks |
| Code review | Built-in reviewer agents | Limited | Manual | Manual |

**What makes it different:**

1. **You can see your agents work.** Not in a log panel -- in a pixel-art office where characters walk to desks, type on keyboards, and gather at whiteboards. Click an agent and it focuses the right terminal pane.

2. **Structured pipeline, not free-form.** Every piece of work goes through triage -> planning -> build -> review -> completion. Lightweight tasks skip the heavy steps automatically. You get review gates with actual reviewer agents checking work against acceptance criteria.

3. **Agents are markdown files.** Define a CTO agent in `.claude/agents/sarah-cto.md` with specific review standards, and she enforces them in code reviews. Change the markdown, change the behavior. No Python, no YAML chains.

Currently built on Claude Code (Anthropic), so it's most relevant if you're in that ecosystem. No GPT or Gemini support yet -- the session watcher reads Anthropic's session format. The visualization layer is model-agnostic though, so multi-model support is architecturally possible.

MIT-licensed, macOS for now (Linux/Windows coming).

GitHub: https://github.com/andrew-yangy/agent-conductor
npm: `npm install -g gru-ai && gru-ai`

---

**Builder's Note (post as first comment):**

For anyone wondering about the Claude Code dependency -- the visualization and dashboard work by watching session files that Claude Code writes to `~/.claude/projects/`. The pipeline and agent definitions are just markdown files in your repo. If other AI coding tools start writing similar session files, supporting them would be straightforward. The hard part was the pipeline reliability (getting agents to follow multi-step processes without losing context), not the model integration.

---
---

## Post 3: r/SideProject

**Title:** I built an autonomous AI company framework with a pixel-art office -- gruai

**Flair:** Show Off

---

**Body:**

For the past few months I've been building gruai -- a framework that turns AI coding agents into a visible, structured team.

The idea came from frustration: I was running multiple Claude Code sessions for different tasks (planning, building, reviewing code) and had zero visibility into what was happening. Terminal logs scrolling in 5 windows. No way to tell if one agent was blocked waiting for another's review.

**What I built:**

gruai watches your AI coding sessions and renders them as characters in a pixel-art isometric office. Each agent -- CTO, builder, reviewer, planner -- has their own desk, their own animations, and their status updates in real-time. When a builder starts coding, you see them sit down and type. When a reviewer starts a code review, they walk over to the builder's desk.

But it's more than a visualization. Under the hood there's a full directive pipeline:

1. **Triage** -- incoming work gets classified by complexity (lightweight skips the heavy steps)
2. **Planning** -- a planner agent decomposes work into projects and tasks
3. **Build** -- builder agents execute tasks with structured context
4. **Review** -- reviewer agents check work against defined acceptance criteria
5. **Completion** -- nothing ships without passing review gates

**Tech details:**
- React 19, TypeScript, Canvas 2D (no game engine -- pure pixel pushing)
- Express + chokidar watches session files in real-time
- Agents defined as markdown templates -- swap personalities by editing a `.md` file
- MIT license, open source
- macOS only for now (Linux/Windows coming)
- npm: `npm install -g gru-ai && gru-ai`

**What I learned building it:**
- Pixel art by LLM is possible but needs heavy human curation -- the AI generates sprite concepts but you end up hand-fixing proportions and animation frames
- The hardest part was pipeline reliability, not the visualization -- getting agents to follow a multi-step process without losing context mid-way is a real engineering problem
- Canvas 2D is surprisingly capable for isometric rendering -- you don't need Phaser or PixiJS for this kind of thing

Would love feedback on the concept and the execution. Particularly interested in whether the visualization adds real value for managing AI agents or if it's just eye candy.

GitHub: https://github.com/andrew-yangy/agent-conductor

---

**Builder's Note (post as first comment):**

One detail I didn't cover -- the agents aren't just for show. Each agent is defined as a markdown file (e.g., `.claude/agents/sarah-cto.md`) with a specific personality, domain expertise, and review standards. The framework ships with a C-suite team (CTO, COO, CPO, CMO) plus specialist engineers, but you can create custom agents by adding a markdown file. The pixel-art office picks up new agents automatically and assigns them a character. The whole thing runs locally -- no cloud services, no accounts, just your Claude Code sessions and a browser window.

---
---

## Posting Checklist

- [ ] Demo GIF (`docs/assets/demo.gif`) is current and uploaded to Reddit or linked
- [ ] All GitHub links resolve: `https://github.com/andrew-yangy/agent-conductor`
- [ ] npm package works: `npm install -g gru-ai && gru-ai`
- [ ] Post r/ClaudeCode first (Tuesday/Wednesday, 9-10 AM US Eastern)
- [ ] Wait 24-48 hours, then post r/ChatGPTCoding
- [ ] Wait another 24-48 hours, then post r/SideProject
- [ ] Builder's Note comment posted within 5 minutes of each post
- [ ] Stay on Reddit for 2 hours after each post to reply to comments
