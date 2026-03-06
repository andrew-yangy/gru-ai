# Agent Conductor — Claude Code Rules

## What This Is
An autonomous AI company framework. See `.context/vision.md` for the full vision.

## Context Tree Structure

```
.context/
|-- vision.md                           # System vision (read first)
|
|-- goals/                              # Three-tier hierarchy: Goal > Project > Task
|   |-- {goal-id}/
|   |   |-- goal.json                   # REQUIRED: id, title, status, category, description
|   |   |-- context.md                  # OPTIONAL: domain knowledge, narrative
|   |   |-- backlog.json                # OPTIONAL: per-goal backlog items
|   |   +-- projects/
|   |       |-- {project-id}/
|   |       |   |-- project.json        # REQUIRED: entity + embedded tasks[]
|   |       |   |-- context.md          # OPTIONAL: spec, design notes
|   |       |   |-- report.md           # OPTIONAL: completion report
|   |       |   +-- *.md                # OPTIONAL: brainstorm, design docs
|   |       +-- ...
|   +-- ...
|
|-- directives/                         # Directive containers with nested projects
|   |-- {id}/
|   |   |-- directive.json              # Pipeline state, weight, references
|   |   |-- directive.md                # CEO brief
|   |   |-- brainstorm.md              # OPTIONAL: pre-planning (strategic/heavyweight)
|   |   |-- audit.md                   # OPTIONAL: technical audit
|   |   +-- projects/
|   |       |-- {project-id}/
|   |       |   +-- project.json       # Tasks[], DOD, agents -- THE source of truth
|   |       +-- ...
|   +-- ...
|
|-- intel/                              # Scout outputs
|   |-- latest/                         # Overwritten each /scout run
|   +-- archive/{YYYY-MM-DD}/           # Previous runs
|
|-- reports/                            # CEO dashboard reports
|   |-- daily-{date}.md
|   |-- weekly-{date}.md
|   +-- walkthrough-{date}.md
|
|-- lessons/                            # Flat, topic-based knowledge
|   |-- orchestration.md
|   |-- agent-behavior.md
|   |-- review-quality.md
|   |-- skill-design.md
|   +-- state-management.md
```

## How to Read the Context Tree

- **"What should we do now?"** -> Read `goals/*/goal.json` for active goals, then `goals/*/backlog.json` for pending work, check `goals/*/projects/*/project.json` for active projects
- **Planning a feature:** -> Read `vision.md` + relevant `goals/{goal}/goal.json` + `lessons/` + relevant project context.md files
- **Building a feature:** -> Read project.json for tasks (at `goals/{goal}/projects/{project}/project.json` or `directives/{id}/projects/{project}/project.json`), relevant `lessons/` files
- **After completing work:** -> Update project.json tasks, create report.md in project dir, update `lessons/` if new patterns discovered

## Key Conventions

- Directory names = entity IDs. `goals/data-model/` means `goal.id = "data-model"`
- project.json is THE source of truth for a project including all its tasks
- Tasks are embedded in project.json -- no separate task files
- Directives are directories in `directives/{id}/` -- each contains directive.json, directive.md, and optional projects/
- Goals discovered via glob: `goals/*/goal.json`
- Projects discovered via glob: `goals/*/projects/*/project.json` or `directives/*/projects/*/project.json`
- No indexer or computed state files -- read source files directly

## Four Goals

| Goal | Domain |
|------|--------|
| `data-model` | Context tree structure, entity schemas, relationships |
| `workflow-orchestration` | Directive pipeline, skills, agent casting, checkpoint/resume, telemetry, review quality |
| `ui` | Dashboard app, watchers, visualizations, CEO experience |
| `game` | Office simulation game — pixel-art CEO interface, React + Canvas 2D, separate from dashboard |

## Lessons Routing

| Role | Read These |
|------|-----------|
| All agents | lessons/agent-behavior.md |
| Morgan (planning/orchestration) | lessons/orchestration.md |
| Sarah (review/audit) | lessons/review-quality.md |
| Engineers | lessons/skill-design.md |
| Dashboard/state work | lessons/state-management.md |
| Scenario walkthroughs | lessons/scenarios.md |

## Pipeline Enforcement
- **ALL work goes through the `/directive` pipeline.** The pipeline is weight-adaptive: lightweight tasks skip Morgan/C-suite/approval and run fast; heavyweight gets the full process. No need to bypass it.
- NEVER spawn builder/engineer agents directly. Use `/directive` which handles reviews, scope, and completion verification. Bypassing the pipeline = bypassing all guardrails.

## Git Operations
NEVER perform git operations without explicit user approval.

## Database Safety
Production database with real customer data. NEVER run Prisma migrations. Safe commands: `npx prisma generate`, `npx prisma studio`.
