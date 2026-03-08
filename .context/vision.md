# gruai — System Vision

> This file describes the conductor framework itself, not the consumer project (Wisely).
> Consumer context lives in `.context/vision.md`, `.context/preferences.md`, etc.
> When migrating to a standalone repo, this file becomes the root vision.

## What Is It

An autonomous AI company framework. Named C-suite agents with distinct personalities own their domains, research the outside world, propose initiatives bottom-up, challenge decisions, execute work, and evolve the system. The human (CEO) sets direction and reviews proposals — they don't micromanage execution.

## Operating Principles

1. **Outward-looking by default.** The C-suite researches competitors, markets, frameworks, and trends. Internal maintenance is secondary.
2. **Autonomy as default.** Low-risk work ships without CEO approval. The team does + reports.
3. **Structured outputs over dialogue.** JSON schemas beat freeform conversation. Typed interfaces between agents prevent error amplification.
4. **Static C-suite, ephemeral engineers.** The C-suite has institutional memory and standing responsibilities. Engineers are spawned per-task and dissolved when done.
5. **Bottom-up proposals are the goal state.** The system succeeds when 50%+ of initiatives come from the team's external research, not CEO directives.
6. **Risk-based decision authority.** Low = do + report (CEO approves completion after). Medium = do + report (CEO can reopen). High = CEO approves plan AND completion.
7. **Challenge mode, not yes-men.** Agents push back on CEO directives with reasoning. Parallel independent critiques, not group consensus.
8. **Self-evolution through research.** Morgan monitors the agent framework ecosystem and proposes system improvements. The conductor evolves by stealing patterns from the outside world.

## System Architecture

```
Skills (the interface):
  /scout      — external intelligence: agents research the world → findings → proposals → CEO review
  /directive  — top-down execution: CEO directive → challenge → plan → audit → build → review → digest
  /healthcheck — internal maintenance: Sarah + Morgan scan codebase + operations (bi-weekly)
  /report     — CEO dashboard (daily/weekly) with external intelligence + internal health + OKR tracking

Context (the state):
  .context/                      — all conductor state
  .context/directives/           — directive > project > task hierarchy (directive.json, project.json)
  .context/intel/                — scout outputs (latest/ + archive/)
  .context/reports/              — CEO dashboard reports (daily/weekly/walkthrough)
  .context/lessons/              — topic-specific lesson files
  .context/vision.md             — this file

Agents (the team):
  .claude/agents/morgan-coo.md — orchestration, planning, casting + ecosystem intelligence
  .claude/agents/sarah-cto.md  — architecture, security, code quality + technology intelligence
  .claude/agents/marcus-cpo.md — product, UX, feature prioritization + market intelligence
  .claude/agents/priya-cmo.md  — growth, SEO, positioning + growth intelligence
```

## The Autonomous Loop

```
Monday:    /scout → CEO reviews intelligence + approves proposals (~15 min)
Tue-Thu:   /directive executes approved work (autonomous)
Friday:    /report weekly → CEO reviews dashboard (~20 min)
Bi-weekly: /healthcheck → auto-fix low-risk, batch medium-risk
```

CEO total: ~45 min/week. Staff handles the rest.

## Agent Intelligence Domains

Each C-suite member has a standing external research responsibility:

| Agent | Internal Role | External Intelligence |
|-------|--------------|----------------------|
| Sarah (CTO) | Architecture, security, code quality | Security advisories, framework releases, tech trends |
| Marcus (CPO) | Product decisions, UX, prioritization | Competitor products, user sentiment, market gaps |
| Priya (CMO) | Growth, SEO, positioning | Keyword trends, competitor content, distribution channels |
| Morgan (COO) | Operations, planning, casting | Agent frameworks, Claude Code updates, workflow tools |

Morgan's ecosystem intelligence is how the system improves itself — she researches external patterns and proposes conductor improvements.

## Separation of Concerns

| Layer | What it contains | Who owns it | Migrates with conductor? |
|-------|-----------------|-------------|-------------------------|
| Framework | Skills, agent definitions, conductor state | The conductor system | Yes |
| Consumer | Vision, goals, lessons, preferences | The CEO/project | No — each project brings its own |

Agents read BOTH layers:
- Framework context tells them HOW to operate (process, risk taxonomy, intelligence domains)
- Consumer context tells them WHAT to work on (vision, guardrails, domain lessons)

## Harness Engineering Alignment

gruai is an **organizational harness** — OpenAI's harness engineering describes the environment layer (how to set up a codebase for agents); we extend it with the organization layer (how to structure agents into an autonomous company).

| Harness Engineering Pillar | Our Implementation |
|---|---|
| **Context engineering** | `.context/` tree — directives, lessons, intel. Domain-scoped, continuously updated by /scout and /healthcheck. |
| **Architectural constraints** | SKILL.md typed pipelines, JSON schemas between agents, risk taxonomy, Morgan's casting rules. Organizational constraints via C-suite domain ownership. |
| **Entropy management** | /healthcheck (internal decay), /scout (external drift), lessons/ (institutional memory). Broader than code-only — covers organizational entropy. |

**What we add beyond harness engineering:**
- **Organizational constraints** — domain ownership, challenge mode, bottom-up proposals, personality-driven decision-making
- **Autonomous operations loop** — /scout → /healthcheck → /directive → /report (continuous, not one-shot)
- **CEO experience design** — human reviews outcomes, not code. 45 min/week.
- **Institutional memory** — lessons compound across directives; personality files evolve from experience

**Known gap:** Deterministic enforcement. We rely heavily on LLM-based review; OpenAI uses structural tests + linters + LLM review together. Building deterministic constraint checks is a P0 priority.

## Success Criteria

1. C-suite agents produce meaningfully different, opinionated outputs (not yes-men)
2. Team proposes 50%+ of initiatives from external research, not CEO directives
3. Low-risk work ships without CEO approval and doesn't break things
4. CEO spends <45min/week reviewing reports and approving proposals
5. The system evolves itself — Morgan proposes conductor improvements from ecosystem research
6. Framework is cleanly separable from consumer context
