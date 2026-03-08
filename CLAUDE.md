# gruai — Claude Code Rules

## What This Is
An autonomous AI company framework. See `.context/vision.md` for the full vision.

## Context Tree Structure

```
.context/
|-- vision.md                           # System vision (read first)
|
|-- directives/                         # ALL work lives here: Directive > Project > Task
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

- **"What should we do now?"** -> Read `directives/*/directive.json` for active directives, check `directives/*/projects/*/project.json` for active projects
- **Planning a feature:** -> Read `vision.md` + relevant directive context + `lessons/` + relevant project context.md files
- **Building a feature:** -> Read project.json for tasks (at `directives/{id}/projects/{project}/project.json`), relevant `lessons/` files
- **After completing work:** -> Update project.json tasks, create report.md in project dir, update `lessons/` if new patterns discovered

## Key Conventions

- Directory names = entity IDs. `directives/pipeline-v2/` means `directive.id = "pipeline-v2"`
- project.json is THE source of truth for a project including all its tasks
- Tasks are embedded in project.json -- no separate task files
- Directives are directories in `directives/{id}/` -- each contains directive.json, directive.md, and optional projects/
- Directives discovered via glob: `directives/*/directive.json`
- Projects discovered via glob: `directives/*/projects/*/project.json`
- No indexer or computed state files -- read source files directly

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

## Design-First for UI Work
When the CEO asks about UI changes or improvements (e.g. "can we improve the UI of X", "this panel looks bad", "redesign the log panel"), **spawn Quinn (UI/UX designer) first** to produce a design before routing to `/directive`. Flow:
1. Spawn Quinn with the CEO's request + relevant current code as context
2. Quinn produces a design (layout, components, visual spec, interactions)
3. Show the design to the CEO for feedback
4. Once the CEO is happy, create a directive with Quinn's design attached and run `/directive`

## Git Operations
NEVER perform git operations without explicit user approval.

## Database Safety
Production database with real customer data. NEVER run Prisma migrations. Safe commands: `npx prisma generate`, `npx prisma studio`.
