# Context Tree Redesign — FINAL Data Model (Round 3)

**Directive:** context-tree-redesign
**Date:** 2026-03-03
**Status:** FINAL — Ready for Morgan to plan execution
**Participants:** Sarah Chen (CTO), Marcus Rivera (CPO), Morgan Park (COO)
**Facilitator:** Alex Rivera (Chief of Staff)

---

## CEO Decisions Applied

All architecture decisions are settled. This document is the production specification.

1. Three-tier: Goals → Projects (nested under goals) → Tasks (embedded in project.json)
2. Directives link to hierarchy via triage field
3. Kill _state/ and indexer — dashboard reads source files directly
4. Context co-located with parent entity
5. Flat directives/, flat lessons/, intel/, reports/
6. Dynamic goals with CEO approval
7. No backwards compatibility — clean migration
8. Full traceability: directive → project → tasks → completion (bidirectional)

---

## 1. Entity Schemas

### 1.1 Goal

**File:** `.context/goals/{goal-id}/goal.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Kebab-case identifier, matches directory name |
| title | string | yes | Human-readable name |
| status | enum | yes | `"active"` \| `"paused"` \| `"achieved"` \| `"archived"` |
| category | enum | yes | `"product"` \| `"framework"` \| `"infrastructure"` \| `"growth"` |
| description | string | yes | One-paragraph purpose statement |
| created | string (ISO date) | yes | Creation date |
| updated | string (ISO date) | yes | Last modification date |
| okrs | array of OKR objects | no | Structured objectives and key results |

**OKR object:**
```json
{
  "objective": "string — what we're trying to achieve",
  "key_results": [
    {
      "id": "kr-1",
      "description": "string — measurable outcome",
      "target": "string or number — the target value",
      "current": "string or number — current value",
      "status": "not_started | in_progress | achieved | missed"
    }
  ]
}
```

**Example:**
```json
{
  "id": "buywisely",
  "title": "BuyWisely — Price Comparison Platform",
  "status": "active",
  "category": "product",
  "description": "Australia's price comparison platform. Grow revenue, improve UX, expand coverage.",
  "created": "2026-01-01",
  "updated": "2026-03-03",
  "okrs": [
    {
      "objective": "Grow subscription revenue to $5k MRR",
      "key_results": [
        {
          "id": "kr-1",
          "description": "Launch premium tier with price alerts",
          "target": "100 subscribers",
          "current": "0",
          "status": "not_started"
        }
      ]
    }
  ]
}
```

**What goals do NOT store:**
- No project IDs array. Projects are discovered by reading `goals/{goal-id}/projects/*/project.json`.
- No features array. Features are now projects.
- No backlog (see Backlog Model section below).

---

### 1.2 Project

**File:** `.context/goals/{goal-id}/projects/{project-id}/project.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Kebab-case identifier, matches directory name |
| title | string | yes | Human-readable name |
| goal_id | string (FK → Goal.id) | yes | Parent goal. Must match the filesystem path. |
| status | enum | yes | `"proposed"` \| `"planning"` \| `"active"` \| `"blocked"` \| `"completed"` \| `"abandoned"` |
| priority | enum | yes | `"p0"` \| `"p1"` \| `"p2"` \| `"p3"` |
| description | string | yes | What this project delivers |
| scope | object | no | `{ "in": ["..."], "out": ["..."] }` — explicit scope boundaries |
| dod | array of DOD objects | no | Definition of done criteria |
| source_directive | string (FK → Directive.id) | no | The directive that created this project |
| tags | array of strings | no | For secondary categorization (e.g., cross-goal relevance) |
| tasks | array of Task objects | yes | Embedded tasks (see 1.3). Empty array `[]` if no tasks yet. |
| created | string (ISO date) | yes | Creation date |
| updated | string (ISO date) | yes | Last modification date |
| completed | string (ISO date) | no | Completion date (set when status → completed) |

**DOD object:**
```json
{
  "criterion": "string — verifiable statement",
  "met": false,
  "verified_by": null
}
```

**Example:**
```json
{
  "id": "nextjs-upgrade",
  "title": "Next.js 14 → 16 Upgrade",
  "goal_id": "buywisely",
  "status": "completed",
  "priority": "p1",
  "description": "Upgrade BuyWisely from Next.js 14 to 16, React 18 to 19.",
  "scope": {
    "in": ["Next.js upgrade", "React 19 migration", "SST compatibility"],
    "out": ["Feature changes", "UI redesign"]
  },
  "dod": [
    { "criterion": "All pages render without errors on Next.js 16", "met": true, "verified_by": "sarah" },
    { "criterion": "Type-check passes with zero errors", "met": true, "verified_by": "sarah" },
    { "criterion": "SST dev and deploy work correctly", "met": true, "verified_by": "morgan" }
  ],
  "source_directive": "buywisely-nextjs-upgrade",
  "tags": ["modernization"],
  "tasks": [
    {
      "id": "t1",
      "title": "Update package.json dependencies",
      "status": "completed",
      "agent": null,
      "depends_on": [],
      "output": "Updated Next.js 14→16, React 18→19, all peer deps resolved.",
      "created": "2026-02-15",
      "completed": "2026-02-15"
    },
    {
      "id": "t2",
      "title": "Fix React 19 breaking changes",
      "status": "completed",
      "agent": "jordan",
      "depends_on": ["t1"],
      "output": "Fixed component={Link} pattern, updated forwardRef usage.",
      "created": "2026-02-15",
      "completed": "2026-02-16"
    }
  ],
  "created": "2026-02-15",
  "updated": "2026-02-20",
  "completed": "2026-02-20"
}
```

---

### 1.3 Task (embedded in Project)

Tasks are objects in the `project.json` `tasks[]` array. They are NOT separate files.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Short identifier, unique within the project (e.g., `"t1"`, `"t2"`, or descriptive like `"fix-auth-check"`) |
| title | string | yes | What this task accomplishes |
| status | enum | yes | `"pending"` \| `"in_progress"` \| `"completed"` \| `"blocked"` \| `"skipped"` |
| agent | string | no | Agent name assigned (e.g., `"jordan"`, `"sarah"`, `null` for unassigned) |
| depends_on | array of strings | no | Task IDs within the same project this task depends on. Default: `[]` |
| blocked_reason | string | no | Why this task is blocked (set when status = blocked) |
| cross_project_dep | string | no | Format: `"goal-id/project-id:task-id"` for rare cross-project dependencies |
| output | string | no | Summary of what was done (set on completion) |
| created | string (ISO date) | yes | Creation date |
| completed | string (ISO date) | no | Completion date |

**Task-level constraints:**
- Tasks are atomic, single-agent work items. If a task needs decomposition, it's too broad — split it or make it a project.
- No separate .md files for tasks. Ever.
- Cross-project dependencies are explicit but strongly discouraged. Prefer project-level sequencing.

---

### 1.4 Directive

**File:** `.context/directives/{directive-id}.json`
**Companion:** `.context/directives/{directive-id}.md` (CEO's brief / human-readable content)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Kebab-case identifier |
| title | string | yes | Human-readable name |
| status | enum | yes | `"pending"` \| `"triaged"` \| `"executing"` \| `"completed"` \| `"rejected"` |
| source | enum | yes | `"ceo"` \| `"scout"` \| `"healthcheck"` \| `"walkthrough"` |
| weight | enum | yes | `"quick-fix"` \| `"tactical"` \| `"strategic"` |
| created | string (ISO date) | yes | Creation date |
| updated | string (ISO date) | yes | Last modification date |
| completed | string (ISO date) | no | Completion date |
| triage | Triage object | no | Set during triage step. Required once status ≥ triaged. |
| plan | Plan object | no | Morgan's execution plan |
| phases | object | no | Phase outputs keyed by phase name |
| cast | object | no | Agent assignments per role |
| dod | array of DOD objects | no | Directive-level definition of done |
| report_summary | string | no | Short summary for dashboard display |
| telemetry | Telemetry object | no | Timing and cost data |

**Triage object:**
```json
{
  "action": "create_project | add_tasks | update_existing | create_goal | reject",
  "goal_id": "string — primary goal this maps to",
  "project_id": "string — existing or newly created project",
  "task_ids": ["string — task IDs created/updated in the project"],
  "secondary_goal_ids": ["string — for cross-goal directives"],
  "rationale": "string — why this mapping was chosen",
  "requires_ceo_approval": false
}
```

**Plan object (Morgan's output):**
```json
{
  "challenges": [
    { "agent": "sarah", "assessment": "string", "recommendation": "proceed | simplify | reject" }
  ],
  "initiatives": [
    {
      "id": "init-1",
      "title": "string",
      "phases": ["build", "review"],
      "cast": { "engineer": "jordan", "reviewer": "sarah" },
      "dod": [{ "criterion": "string", "met": false, "verified_by": null }],
      "user_scenario": "string — one sentence describing user experience after this ships"
    }
  ]
}
```

**Phases object (accumulated during execution):**
```json
{
  "audit": {
    "findings": [{ "file": "string", "issue": "string", "severity": "high | medium | low" }],
    "agent": "sarah",
    "timestamp": "ISO date"
  },
  "build": {
    "summary": "string",
    "files_changed": ["string"],
    "agent": "jordan",
    "timestamp": "ISO date"
  },
  "review": {
    "outcome": "pass | fail | critical",
    "findings": [{ "issue": "string", "severity": "string", "file": "string" }],
    "agent": "sarah",
    "timestamp": "ISO date"
  }
}
```

**Telemetry object:**
```json
{
  "started": "ISO datetime",
  "completed": "ISO datetime",
  "wall_time_minutes": 45,
  "phase_times": { "plan": 5, "audit": 8, "build": 20, "review": 12 }
}
```

**Example directive.json:**
```json
{
  "id": "context-tree-redesign",
  "title": "Context Tree Redesign — Clean Slate",
  "status": "executing",
  "source": "ceo",
  "weight": "strategic",
  "created": "2026-03-03",
  "updated": "2026-03-03",
  "completed": null,
  "triage": {
    "action": "create_project",
    "goal_id": "conductor",
    "project_id": "context-tree-redesign",
    "task_ids": [],
    "secondary_goal_ids": [],
    "rationale": "New project under conductor goal — redesigns the entire context tree structure.",
    "requires_ceo_approval": false
  },
  "plan": null,
  "phases": {
    "brainstorm": {
      "rounds": 3,
      "artifacts": ["brainstorm.md", "brainstorm-round-2.md", "brainstorm-round-3-final.md"],
      "timestamp": "2026-03-03"
    }
  },
  "cast": null,
  "dod": [
    { "criterion": "New .context/ directory structure documented and agreed", "met": false, "verified_by": null },
    { "criterion": "Migration script converts all existing data", "met": false, "verified_by": null },
    { "criterion": "Dashboard reads source files directly (no indexer)", "met": false, "verified_by": null }
  ],
  "report_summary": null,
  "telemetry": null
}
```

---

## 2. Directory Structure

```
.context/
├── vision.md                                    # System vision (required)
├── preferences.md                               # CEO preferences (consumer repos only)
│
├── goals/                                       # Dynamic goals — CEO approval for new
│   ├── buywisely/                               # Example product goal
│   │   ├── goal.json                            # REQUIRED — goal entity
│   │   ├── context.md                           # OPTIONAL — domain knowledge, narrative
│   │   └── projects/
│   │       ├── nextjs-upgrade/
│   │       │   ├── project.json                 # REQUIRED — project entity + embedded tasks
│   │       │   ├── context.md                   # OPTIONAL — spec, design notes
│   │       │   └── report.md                    # OPTIONAL — completion report
│   │       ├── subscription-tier/
│   │       │   ├── project.json
│   │       │   └── context.md
│   │       └── seo-optimization/
│   │           └── project.json
│   │
│   ├── sellwisely/
│   │   ├── goal.json
│   │   └── projects/
│   │       ├── competitor-comparison/
│   │       │   ├── project.json
│   │       │   └── context.md
│   │       └── revenue-growth/
│   │           └── project.json
│   │
│   ├── conductor/                               # Framework goal (in agent-conductor repo)
│   │   ├── goal.json
│   │   ├── context.md
│   │   └── projects/
│   │       ├── context-tree-redesign/
│   │       │   ├── project.json
│   │       │   ├── context.md                   # Spec / design decisions
│   │       │   ├── brainstorm.md                # Round 1 brainstorm output
│   │       │   ├── brainstorm-round-2.md        # Round 2 brainstorm output
│   │       │   ├── brainstorm-round-3-final.md  # THIS file — Round 3 final
│   │       │   └── report.md                    # Final report (written at completion)
│   │       ├── scout-improvements/
│   │       │   └── project.json
│   │       └── dashboard-ux/
│   │           ├── project.json
│   │           └── context.md
│   │
│   ├── infrastructure/
│   │   ├── goal.json
│   │   └── projects/
│   │       ├── database-ops/
│   │       │   └── project.json
│   │       └── sst-v3-migration/
│   │           ├── project.json
│   │           └── context.md
│   │
│   └── growth/
│       ├── goal.json
│       └── projects/
│           ├── growth-marketing/
│           │   └── project.json
│           └── competitor-intelligence/
│               └── project.json
│
├── directives/                                  # FLAT — status in JSON, not in directory
│   ├── context-tree-redesign.json               # Directive entity
│   ├── context-tree-redesign.md                 # CEO's brief (human-readable)
│   ├── improve-security.json
│   ├── improve-security.md
│   ├── buywisely-nextjs-upgrade.json
│   ├── buywisely-nextjs-upgrade.md
│   └── ...
│
├── intel/                                       # Scout outputs
│   ├── latest/                                  # Overwritten each /scout run
│   │   ├── sarah.json                           # CTO — security, tech trends
│   │   ├── marcus.json                          # CPO — competitors, market
│   │   ├── morgan.json                          # COO — agent frameworks, tooling
│   │   └── priya.json                           # CMO — growth, SEO trends
│   └── archive/                                 # OPTIONAL — previous runs (or use git history)
│       └── 2026-02-24/
│           ├── sarah.json
│           └── ...
│
├── reports/                                     # CEO dashboard reports
│   ├── daily-2026-03-03.md                      # /report daily output
│   ├── weekly-2026-03-03.md                     # /report weekly output
│   └── ...
│
├── lessons/                                     # Flat, topic-based knowledge
│   ├── orchestration.md
│   ├── agent-behavior.md
│   ├── state-management.md
│   ├── review-quality.md
│   └── skill-design.md
│
└── backlog.json                                 # Top-level backlog (see Backlog Model)
```

### File Existence Rules

| Level | Required Files | Optional Files |
|-------|---------------|----------------|
| Goal directory | `goal.json` | `context.md` |
| Project directory | `project.json` | `context.md`, `report.md`, `brainstorm*.md`, `design.md`, `*.md` (any named context file) |
| Directive | `{id}.json` | `{id}.md` (CEO brief) |
| Intel | `latest/{agent}.json` | `archive/{date}/{agent}.json` |
| Reports | `{type}-{date}.md` | — |
| Lessons | `{topic}.md` | — |

### Key Conventions
- **Directory names = entity IDs.** `goals/buywisely/` means `goal.id = "buywisely"`.
- **project.json is THE source of truth for a project** including all its tasks.
- **context.md is freeform markdown** — agents and CEO write whatever's useful. No schema.
- **Brainstorm/design/review outputs** live as named .md files in the project directory, co-located with the work they describe.
- **Reports co-located with projects** for directive-specific reports. CEO dashboard reports (daily/weekly) live in top-level `reports/`.

---

## 3. Directive Triage Flow

### Step-by-Step

```
1. CEO writes directive
   → Creates directives/{id}.md (freeform brief)
   → Creates directives/{id}.json with status: "pending"

2. Triage agent reads:
   → The directive .md (what the CEO wants)
   → All goals/*/goal.json (existing goals)
   → All goals/*/projects/*/project.json (existing projects)

3. Smart categorization:
   a. Extract key entities/domains from directive text
   b. Match against existing goal titles, descriptions, and categories
   c. Match against existing project titles and descriptions
   d. Determine scope: is this a goal-level change, a new project, tasks for existing project, or update?

4. Decision tree:
   ┌─ Does this match an existing project?
   │  YES → action: "add_tasks" or "update_existing"
   │        Set goal_id and project_id from the match
   │        Create/update tasks in the project.json
   │
   │  NO → Does this match an existing goal?
   │       YES → action: "create_project"
   │             Set goal_id from match
   │             Create new project directory under the goal
   │             Populate project.json with tasks
   │
   │       NO → Does this need a new goal?
   │            YES → action: "create_goal"
   │                  Set requires_ceo_approval: true
   │                  WAIT for CEO approval before proceeding
   │
   │            NO → action: "reject"
   │                 Set rationale explaining why

5. After triage:
   → Update directive.json: status → "triaged", triage field populated
   → If action created entities, they now exist on the filesystem
   → The directive's triage.project_id and triage.goal_id create the traceability link

6. Execution:
   → Morgan reads the triaged directive → creates plan
   → Plan references the project and tasks
   → Build/review phases update task statuses in project.json
   → Phase outputs written to directive.json phases field
   → Brainstorm/design artifacts written as .md files in the project directory

7. Completion:
   → Directive status → "completed"
   → All linked tasks marked completed
   → Project status updated (if all tasks done)
   → Report written to project directory as report.md
   → directive.json report_summary set
   → Lessons extracted to lessons/{topic}.md
```

### Cross-Goal Directives

When a directive spans 2+ goals:
- The `triage.goal_id` is the PRIMARY goal (where the project lives)
- The `triage.secondary_goal_ids` array lists other relevant goals
- The project's `tags` array includes references to secondary goals (e.g., `["cross-goal:growth"]`)
- Only ONE project is created, under the primary goal
- The dashboard can query `secondary_goal_ids` to show cross-goal relationships

### Default Bias: Map to Existing

The triage flow has a strong bias toward existing entities:
1. **First:** Try to map to an existing project (add tasks or update)
2. **Second:** Try to map to an existing goal (create project)
3. **Last resort:** Propose new goal (requires CEO approval)

This is the sprawl firewall. Goal creation is rare and always gated.

---

## 4. Context File Patterns

### Goal Level
| File | Purpose | Written By | Read By |
|------|---------|-----------|---------|
| `goal.json` | Entity data, OKRs | Conductor, CEO | All agents, dashboard |
| `context.md` | Domain knowledge, narrative "why" | CEO, agents | Agents at project start |

### Project Level
| File | Purpose | Written By | Read By |
|------|---------|-----------|---------|
| `project.json` | Entity + tasks + DOD | Conductor pipeline | All agents, dashboard |
| `context.md` | Spec, design decisions, technical context | Agents during design | Agents during build |
| `report.md` | Completion report (what shipped, what was learned) | Agents at completion | CEO, dashboard |
| `brainstorm.md` | Full brainstorm output (all agent proposals) | Brainstorm agents | CEO (full detail), agents |
| `brainstorm-round-N.md` | Multi-round brainstorm outputs | Brainstorm agents | CEO |
| `design.md` | Design document / technical spec | Sarah / engineers | Engineers during build |
| `audit.md` | Audit findings (if persisted separately) | Sarah | Engineers, reviewers |
| `review.md` | Review results (if persisted separately) | Reviewers | CEO, Morgan |

**Key pattern:** Any `.md` file can be placed in a project directory. The convention is descriptive naming. The only REQUIRED file is `project.json`.

### Directive Level
| File | Purpose | Written By | Read By |
|------|---------|-----------|---------|
| `{id}.json` | Machine state (status, triage, plan, phases, DOD) | Conductor pipeline | Dashboard, agents |
| `{id}.md` | CEO's brief (problem statement, requirements) | CEO | Triage agent, Morgan |

**CEO visibility into brainstorm details:**
- Brainstorm outputs are written as full .md files in the PROJECT directory (not summarized in JSON)
- e.g., `goals/conductor/projects/context-tree-redesign/brainstorm-round-3-final.md`
- The CEO navigates: goal → project → reads the .md files directly
- The directive.json `phases.brainstorm.artifacts` array lists the filenames for dashboard linking

---

## 5. Dashboard Read Patterns

### No Indexer — Direct File Reading

The dashboard reads source files on startup and watches for changes. No intermediate computed layer.

### Glob Patterns

```javascript
// List all goals
const goals = glob('.context/goals/*/goal.json')

// List all projects (nested under goals)
const projects = glob('.context/goals/*/projects/*/project.json')

// List all directives
const directives = glob('.context/directives/*.json')

// List all intel
const intel = glob('.context/intel/latest/*.json')

// List all reports
const reports = glob('.context/reports/*.md')

// List all lessons
const lessons = glob('.context/lessons/*.md')
```

### Aggregation (computed at read time)

```javascript
// Goal with project counts
for (const goalFile of goals) {
  const goal = JSON.parse(readFile(goalFile))
  const goalDir = dirname(goalFile)
  const projectFiles = glob(join(goalDir, 'projects/*/project.json'))
  goal._projectCount = projectFiles.length
  goal._activeProjects = projectFiles
    .map(f => JSON.parse(readFile(f)))
    .filter(p => p.status === 'active').length
}

// Project with task progress
for (const projFile of projects) {
  const project = JSON.parse(readFile(projFile))
  const total = project.tasks.length
  const completed = project.tasks.filter(t => t.status === 'completed').length
  project._progress = { total, completed, percent: Math.round(completed / total * 100) }
}

// Directive pipeline
const pipeline = {
  pending: directives.filter(d => d.status === 'pending').length,
  triaged: directives.filter(d => d.status === 'triaged').length,
  executing: directives.filter(d => d.status === 'executing').length,
  completed: directives.filter(d => d.status === 'completed').length,
}
```

### File Watching (chokidar)

```javascript
// Watch these paths for changes
chokidar.watch([
  '.context/goals/*/goal.json',
  '.context/goals/*/projects/*/project.json',
  '.context/directives/*.json',
  '.context/intel/latest/*.json',
  '.context/reports/*.md',
], { persistent: true })
  .on('change', (path) => {
    // Re-read the changed file and update the in-memory state
    // The dashboard maintains an in-memory cache, refreshed on file change
  })
  .on('add', (path) => { /* new entity created */ })
  .on('unlink', (path) => { /* entity deleted */ })
```

### Performance Characteristics

- **File count:** ~5-8 goal.json + ~15-25 project.json + ~35 directive.json + ~4 intel + ~10 reports = ~70-80 files total
- **Read time:** <100ms to read all files on a modern SSD
- **Watch overhead:** Minimal — chokidar uses native OS file watchers (FSEvents on macOS)
- **No indexer lag:** Changes are reflected immediately (no indexer delay, no stale state bugs)

### Tradeoffs vs. Indexer

| Aspect | Indexer (old) | Direct read (new) |
|--------|--------------|-------------------|
| Startup | Fast (read one file) | ~100ms (read all files) |
| Freshness | Stale until re-indexed | Always current |
| Complexity | Indexer script + triggers | Zero — just glob + parse |
| Bugs | Stale state, zombie processes | None (no moving parts) |
| Cross-entity queries | Pre-computed JOINs | Computed at read time |

The direct read approach is the right choice for our scale (< 100 files). If the system grows to 500+ files, we can add a simple in-memory cache that lazy-loads on first access and invalidates on file change — still no indexer script.

---

## 6. Migration Plan

### Phase 1: Create New Structure (empty)

Create the new directory tree:
```
.context/
├── goals/
├── directives/
├── intel/
│   └── latest/
├── reports/
├── lessons/
├── backlog.json
├── vision.md
└── preferences.md (sw repo only)
```

### Phase 2: Migrate Goals

**Agent-conductor repo (3 goals → 1 consolidated goal):**

| Old | New | Notes |
|-----|-----|-------|
| goals/agent-conductor/ | goals/conductor/ | Rename, consolidate |
| goals/conductor-ux/ | goals/conductor/projects/conductor-ux/ | Becomes a project |
| goals/conductor-review-quality/ | goals/conductor/projects/review-quality/ | Becomes a project |

**SW repo (14 goals → 5 goals):**

| New Goal | Old Goals Consolidated | Category |
|----------|----------------------|----------|
| `buywisely` | buywisely-growth, buywisely-modernize, buywisely-security | product |
| `sellwisely` | sellwisely-revenue | product |
| `infrastructure` | platform, database-ops, developer-productivity, scraper-product-discovery | infrastructure |
| `growth` | growth-marketing, competitor-intelligence, global-expansion | growth |
| `new-products` | ai-powered-apps, data-enrichment, pricesapi-launch | product |

**Note:** The exact goal list is dynamic — the CEO can adjust during migration. The schema supports any configuration. Starting set is a recommendation, not a mandate.

### Phase 3: Migrate Features → Projects

Each feature in the old `goal.json` `features[]` array becomes a project directory:

```
Old: goals/buywisely-growth/goal.json → features[{ id: "buywisely-competitor-intel", ... }]
New: goals/buywisely/projects/competitor-intel/project.json
```

**Migration mapping per feature:**
```json
// Old feature
{ "id": "buywisely-competitor-intel", "title": "BuyWisely Competitor Intel", "status": "done", "tasks_total": 13, "tasks_completed": 13, "source_directive": null }

// New project.json
{
  "id": "competitor-intel",
  "title": "BuyWisely Competitor Intel",
  "goal_id": "buywisely",
  "status": "completed",
  "priority": "p1",
  "description": "Migrated from feature: BuyWisely Competitor Intel",
  "source_directive": null,
  "tasks": [],
  "created": "2026-01-01",
  "updated": "2026-03-03",
  "completed": "2026-03-01"
}
```

**Status mapping:**
- `done` → `completed`
- `active` → `active`
- `planned` → `proposed`
- Any other → `proposed`

### Phase 4: Migrate Tasks

For features that have active `tasks.json` files in their directories:

```
Old: goals/buywisely-growth/active/subscription-tier/tasks.json
     → { tasks: [{ id: "1", title: "Design pricing tiers", status: "done" }, ...] }

New: goals/buywisely/projects/subscription-tier/project.json
     → tasks: [{ id: "t1", title: "Design pricing tiers", status: "completed", ... }]
```

For completed features with `tasks_total` / `tasks_completed` but no tasks.json (historical data):
- Set `tasks: []` in the new project.json
- The historical task count is NOT migrated (it's stale metadata)

### Phase 5: Migrate Directives

```
Old: inbox/context-tree-redesign.json + inbox/context-tree-redesign.md
     done/improve-security.json + done/improve-security.md

New: directives/context-tree-redesign.json + directives/context-tree-redesign.md
     directives/improve-security.json + directives/improve-security.md
```

**Directive status mapping:**
- In `inbox/` with `status: "pending"` → keep `status: "pending"`
- In `done/` → set `status: "completed"`

**Existing directive.json fields preserved:** id, title, status, weight, goal_ids, created, completed, produced_features (→ mapped to triage.project_id), report

**New fields added:** triage (populated from goal_ids + produced_features mapping), updated, source (default "ceo")

### Phase 6: Migrate Artifacts → Co-located

```
Old: artifacts/context-tree-redesign/brainstorm.md
     artifacts/context-tree-redesign/brainstorm-round-2.md

New: goals/conductor/projects/context-tree-redesign/brainstorm.md
     goals/conductor/projects/context-tree-redesign/brainstorm-round-2.md
```

For each artifact directory, find the matching project and move files there. If no matching project exists, create one.

### Phase 7: Migrate Reports

```
Old: reports/improve-security-2026-02-28.md
New: goals/{goal}/projects/{project}/report.md     (directive-specific reports)
     reports/daily-2026-02-28.md                    (CEO dashboard reports stay in reports/)
```

### Phase 8: Migrate Intelligence

```
Old: intelligence/latest/sarah.json, intelligence/archive/...
New: intel/latest/sarah.json
```

### Phase 9: Migrate Lessons

```
Old: lessons/orchestration.md, lessons/agent-behavior.md, ...
New: lessons/orchestration.md, lessons/agent-behavior.md, ...  (same, just verify clean)
```

### Phase 10: Delete Old Structure

Remove:
- `state/` (the indexer output directory)
- `inbox/` and `done/` (replaced by flat `directives/`)
- `artifacts/` (absorbed into project directories)
- `discussions/` (absorbed into lessons or project context)
- `checkpoints/` (absorbed into directive.json)
- `intelligence.log`, `proposals.log` (empty, never used)
- `scenarios.md` (outdated)
- `lessons.md` (top-level, replaced by `lessons/` directory)
- Old goal directories (replaced by consolidated goals)
- Feature directories under old goals (replaced by project directories)

### Phase 11: Update Consumers

- Update SKILL.md to read/write new paths
- Update dashboard to use direct file reading (remove indexer code)
- Update agent prompts to reference new paths
- Update CLAUDE.md context-reading instructions

### What Gets Preserved

- All goal data (consolidated into fewer goals)
- All feature data (as projects)
- All active task data (embedded in project.json)
- All directive data (flattened)
- All artifacts (co-located with projects)
- All lessons
- All intelligence
- Vision and preferences

### What Gets Dropped

- `state/` computed files (goals.json, features.json, etc.) — replaced by direct reads
- `tasks_total` / `tasks_completed` counts on old features — stale metadata
- `backlog.md` files — replaced by backlog.json
- `okrs.md` files — absorbed into goal.json `okrs` field
- `goal.md` narrative files — replaced by `context.md`
- Empty `.log` files
- `scenarios.md` — outdated
- `discussions/` — absorbed into lessons or project context
- `checkpoints/` — absorbed into directive.json
- Old indexer script

---

## 7. Edge Cases

### Cross-Goal Directive

**Scenario:** "Improve security across BuyWisely and infrastructure"

**Handling:**
- Triage sets `goal_id: "buywisely"` (primary) and `secondary_goal_ids: ["infrastructure"]`
- ONE project is created under the primary goal: `goals/buywisely/projects/security-hardening/`
- The project's `tags` include `"cross-goal:infrastructure"`
- Tasks within the project can reference both codebases
- The dashboard shows this project under both goals (via the `secondary_goal_ids` on the directive + tags on the project)

### Abandoned Project

**Scenario:** Project started, 3 of 8 tasks done, CEO decides to abandon.

**Handling:**
- Set `project.status: "abandoned"`
- Remaining tasks set to `status: "skipped"`
- Project stays on the filesystem (historical record)
- The directive that created it gets `status: "completed"` with `report_summary` noting abandonment
- Dashboard filters out abandoned projects from active views by default

### Task Blocked by Task in Different Project

**Scenario:** Task "deploy API v2" in project A is blocked by "update auth middleware" in project B.

**Handling:**
- Task in project A gets: `"cross_project_dep": "buywisely/auth-middleware-update:t3"`
- Task status: `"blocked"`, `blocked_reason: "Waiting for auth middleware update in auth-middleware-update project"`
- Dashboard can highlight cross-project blocks
- **Strongly discouraged.** Prefer: sequence projects (finish B before starting the blocked portion of A), or move the blocking work into the same project.

### Scout Intelligence → Project

**Scenario:** /scout finds a critical security vulnerability that needs a project.

**Handling:**
1. Scout writes finding to `intel/latest/sarah.json`
2. CEO reviews in /report and approves creating a directive
3. A directive is created: `directives/fix-cve-2026-1234.json` with `source: "scout"`
4. Triage maps it to an existing goal and creates a project
5. Normal execution pipeline proceeds

**Alternative (auto-proposal):** Scout can propose a backlog item directly:
- Add to `backlog.json` with `source: "scout"`, `trigger: "CVE-2026-1234 published"`
- CEO promotes to directive during next review

### Quick-Fix Directive (No Project Needed?)

**Scenario:** "Fix the broken link on the pricing page"

**Handling:** Even small fixes get a project — but a minimal one.
```json
{
  "id": "fix-pricing-link",
  "title": "Fix broken link on pricing page",
  "goal_id": "buywisely",
  "status": "active",
  "priority": "p0",
  "description": "The pricing page has a broken link to /plans",
  "tasks": [
    { "id": "t1", "title": "Fix the href on pricing page", "status": "pending", "agent": null, "depends_on": [], "created": "2026-03-03" }
  ],
  "source_directive": "fix-pricing-link",
  "created": "2026-03-03",
  "updated": "2026-03-03"
}
```

**Why not skip the project?** Full traceability requires every directive to produce a project. A one-task project is cheap (one JSON file) and provides the audit trail. The alternative — tasks that float without a project — breaks the three-tier model and creates orphans.

**Optimization for quick fixes:** The triage step can create the project AND task in a single operation. No separate planning phase needed. The directive can go from `pending` → `triaged` → `executing` → `completed` in minutes.

### Backlog Items

See Backlog Model below.

---

## 8. Backlog Model

### Where Backlogs Live

**Top-level backlog:** `.context/backlog.json`

This replaces per-goal `backlog.json` files. A single backlog for the entire context tree, with each item tagged to a goal.

**Rationale:** Backlogs are a cross-cutting concern. The CEO reviews ALL backlog items together in /report, not goal-by-goal. A single file makes this natural. The `goal_id` field provides filtering.

### Backlog Item Schema

```json
{
  "id": "string — unique identifier",
  "title": "string",
  "description": "string — what and why",
  "goal_id": "string (FK → Goal.id) — which goal this relates to",
  "priority": "p0 | p1 | p2 | p3",
  "status": "proposed | approved | promoted | rejected",
  "source": "scout | ceo | healthcheck | agent",
  "source_detail": "string — e.g., scout agent name, directive ID",
  "trigger": "string | null — condition that makes this actionable",
  "promoted_to": "string | null — directive ID if promoted",
  "created": "ISO date",
  "updated": "ISO date"
}
```

### Backlog Lifecycle

```
1. Item added (source: scout finding, CEO idea, healthcheck finding)
   → status: "proposed"

2. CEO reviews in /report
   → Approves: status → "approved"
   → Rejects: status → "rejected"

3. Trigger fires (or CEO decides to execute)
   → A directive is created from this backlog item
   → status → "promoted", promoted_to: "directive-id"
   → The directive's triage references this backlog item

4. Item sits with trigger condition
   → /scout checks triggers during consolidation
   → When trigger condition met, promotes automatically (or proposes to CEO)
```

### Example backlog.json

```json
[
  {
    "id": "prisma-7-upgrade",
    "title": "Upgrade to Prisma 7 when stable",
    "description": "Prisma 7 has significant performance improvements for our 180M row dataset.",
    "goal_id": "infrastructure",
    "priority": "p2",
    "status": "proposed",
    "source": "scout",
    "source_detail": "sarah — 2026-02-24 scout run",
    "trigger": "Prisma 7 reaches stable release (not RC)",
    "promoted_to": null,
    "created": "2026-02-24",
    "updated": "2026-02-24"
  },
  {
    "id": "competitor-price-alerts",
    "title": "Add real-time price alert notifications",
    "description": "Multiple competitors now offer this. Market expectation growing.",
    "goal_id": "buywisely",
    "priority": "p1",
    "status": "approved",
    "source": "scout",
    "source_detail": "marcus — competitor analysis",
    "trigger": null,
    "promoted_to": null,
    "created": "2026-02-24",
    "updated": "2026-03-01"
  }
]
```

---

## 9. Relationship Summary

### Forward References (parent → child)
```
Goal.id ← discovered via filesystem: goals/{goal-id}/projects/*/project.json
Project.tasks[] ← embedded in project.json
```

### Backward References (child → parent)
```
Project.goal_id → Goal.id
Project.source_directive → Directive.id
Task (embedded, inherits project context)
```

### Cross References
```
Directive.triage.goal_id → Goal.id
Directive.triage.project_id → Project.id
Directive.triage.task_ids[] → Task.id (within the project)
Directive.triage.secondary_goal_ids[] → Goal.id[]
Backlog.goal_id → Goal.id
Backlog.promoted_to → Directive.id
Task.cross_project_dep → "goal-id/project-id:task-id"
```

### Traceability Chain

**Forward (CEO intent → execution):**
```
CEO writes directive.md
→ directive.json (triage links to goal + project)
→ project.json (tasks created by directive)
→ task.output (what was done)
→ project report.md (what shipped)
```

**Reverse (what happened → why):**
```
project.json.source_directive → directive.json
→ directive.md (original CEO intent)
→ directive.triage.rationale (why it mapped here)
```

---

## 10. Open Questions

1. **Intel archive strategy:** Should we keep `intel/archive/` with date-based subdirectories, or rely entirely on git history? Recommendation: Keep `intel/archive/` for the last 4 weeks (1 month of scout runs), delete older. Git has everything if needed.

2. **Backlog per-goal vs. single file:** This spec proposes a single `backlog.json`. If the backlog grows past ~50 items, consider splitting to `goals/{goal-id}/backlog.json` per-goal files. Start with single file and split if needed — it's a non-breaking change.

---

## 11. Recommended Execution Approach (for Morgan)

### Sequencing

1. **Write migration script first.** A single Node.js script that reads the old structure and writes the new one. This is the critical path — everything else depends on having data in the new format.

2. **Run migration on agent-conductor repo first** (smaller, 3 goals). Validate the output manually.

3. **Run migration on sw repo** (larger, 14 goals). Validate.

4. **Update dashboard** to read from new paths (remove indexer code, add direct file reading).

5. **Update SKILL.md** to write to new paths (directive pipeline, scout, report).

6. **Update CLAUDE.md** context-reading instructions for both repos.

7. **Delete old structure** after everything works.

### Estimated Scope

| Initiative | Size | Risk |
|-----------|------|------|
| Migration script | Medium (50+ entities to map) | Medium (data loss if wrong) |
| Dashboard update | Medium (remove indexer, add globs) | Low |
| SKILL.md updates | Small (path changes) | Low |
| CLAUDE.md updates | Small | Low |
| Delete old structure | Small | Low (git has history) |

### Risk Mitigation

- **Git branch:** Run entire migration on a branch. Review diff before merging.
- **Validation step:** Migration script should print a validation report (entity counts, orphan checks, broken references).
- **Idempotent:** Migration script can be run multiple times safely.

---

*This document is the complete specification for the context tree redesign. Morgan plans execution from this. Sarah audits the implementation against this. No further brainstorming rounds needed.*
