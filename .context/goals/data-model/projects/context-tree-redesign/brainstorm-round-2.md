# Context Tree Redesign — Brainstorm Round 2: Data Model

**Directive:** context-tree-redesign
**Date:** 2026-03-03
**Focus:** Three-tier hierarchy data model (Goals → Projects → Tasks)
**Participants:** Sarah Chen (CTO), Marcus Rivera (CPO), Morgan Park (COO)
**Facilitator:** Alex Rivera (Chief of Staff)

---

## Sarah Chen (CTO) — Normalized Entity Model

### Core Thesis
Three-tier entity hierarchy: Goal → Project → Task. Directives are orthogonal — they are the INPUT mechanism that creates/mutates entities in the hierarchy. Every entity is one JSON file. Optional .md companion for narrative context at goal and project levels only. Tasks never get .md files. The filesystem is a DATABASE, not a file manager — relationships live in JSON foreign keys, the indexer builds the graph.

### Entity Schemas

**Goal** — `.context/goals/{id}.json`
- id, title, status (active/paused/achieved/abandoned), category (product/framework/infrastructure/growth)
- description, createdAt, updatedAt
- okrs: array of structured objectives + key results with status tracking
- Optional `.context/goals/{id}.md` for narrative context (READ-ONLY for agents)
- Goals do NOT store projectIds — indexer computes from project.goalId foreign keys

**Project** — `.context/projects/{id}.json`
- id, title, goalId (FK, required, single parent), status (planning/active/paused/done/abandoned)
- priority (P0-P3), description, createdAt, updatedAt, completedAt
- sourceDirective (FK), dod (array of verifiable statements), report (completion summary)
- Optional `.context/projects/{id}.md` for spec/design context
- Projects do NOT store taskIds — indexer computes from task.projectId

**Task** — `.context/tasks/{id}.json`
- id, title, projectId (FK, required), status (pending/in-progress/done/blocked/abandoned)
- priority (P0-P3), assignee (agent name or null), createdAt, updatedAt, completedAt
- blockedBy (array of task IDs, can cross project boundaries)
- result (outcome summary on completion), sourceDirective
- NO .md companion. Ever. If a task needs extended context, it's scoped too broadly.

**Directive** — `.context/directives/{id}.json` + `.context/directives/{id}.md`
- id, title, status (pending/triaged/executing/done/rejected), source (ceo/scout/healthcheck/walkthrough)
- createdAt, updatedAt
- triage: {assessment, action (create-goal/create-project/create-tasks/update-existing/reject), targets[], reasoning}
- plan, phases, report (all absorbed per Round 1)
- .md is CEO's input (freeform brief), .json is machine state

### Directory Structure
```
.context/
├── goals/                    # FLAT — one .json per goal (5-8 files)
│   ├── buywisely.json
│   ├── buywisely.md          # optional narrative
│   ├── sellwisely.json
│   ├── conductor.json
│   ├── platform.json
│   ├── growth.json
│   └── new-products.json
├── projects/                 # FLAT — one .json per project (15-20 files)
│   ├── buywisely-growth.json
│   ├── buywisely-modernize.json
│   ├── conductor-ux.json
│   ├── context-tree-redesign.json
│   ├── context-tree-redesign.md   # optional spec
│   └── ...
├── tasks/                    # FLAT — one .json per task (50-100+ files)
│   ├── implement-goal-schema.json
│   ├── migrate-backlog-items.json
│   └── ...
├── directives/               # FLAT per Round 1
│   ├── context-tree-redesign.json
│   ├── context-tree-redesign.md
│   └── ...
├── _state/                   # Indexer output, NEVER hand-edited
│   ├── index.json            # counts + health
│   ├── goals.json            # goals + computed project counts
│   ├── projects.json         # projects + computed task counts
│   ├── tasks.json            # tasks + resolved blockedBy
│   ├── directives.json
│   └── graph.json            # cross-entity JOIN table
├── lessons/
│   ├── index.md
│   ├── agent-behavior.md
│   ├── orchestration.md
│   └── ...
├── vision.md
└── scenarios.md
```

### Key Design Choices
1. **Fully normalized** — foreign keys link entities, no embedded arrays
2. **Flat directories per entity type** — no nesting goals/projects/tasks in filesystem
3. **Tasks as separate files** — enables parallel agent writes without merge conflicts
4. **3-level hard limit** — no sub-tasks, ever
5. **Goal creation requires CEO confirmation** — goal-sprawl firewall

### Migration: 17 goals → 6 goals
buywisely (product) ← buywisely-growth, buywisely-modernize, buywisely-security, global-expansion
sellwisely (product) ← sellwisely-revenue
conductor (framework) ← agent-conductor, conductor-review-quality, conductor-ux
platform (infrastructure) ← database-ops, developer-productivity, platform, scraper-product-discovery
growth (growth) ← growth-marketing, competitor-intelligence
new-products (product) ← ai-powered-apps, data-enrichment, pricesapi-launch

### Confidence: High

---

## Marcus Rivera (CPO) — Inline Tasks, Goal-Scoped Projects

### Core Thesis
Three-tier hierarchy: Goals → Projects → Tasks. Tasks live INSIDE project JSON, not as separate files. Projects live under their parent goal directory. Organize by how users FIND things — CEO drills from goals → projects → tasks. 17 goals collapse to 4 mega-goals.

### Entity Schemas

**Goal** — `.context/goals/{goal-id}/goal.json`
- id, title, description, status (active/paused/completed/archived)
- okrs (optional array), owner, tags, created, updated
- project_ids: ordered list of project IDs (source of truth for relationship)
- Optional `context.md` alongside goal.json

**Project** — `.context/goals/{goal-id}/projects/{project-id}.json`
- id, title, goal_id (FK), description, status (proposed/planning/active/blocked/completed/abandoned)
- priority (critical/high/medium/low), definition_of_done (array), directives (audit trail)
- **tasks: array of inline task objects** — tasks live INSIDE project JSON
- context: {decisions[], open_questions[], links[]} — structured context field
- reports: array of {date, summary, status} — co-located per Round 1
- created, updated, completed

**Task** — INLINE within project JSON
- id (unique within project), title, status (pending/in_progress/completed/blocked/skipped)
- agent (assigned agent or null), description, depends_on (within project)
- cross_project_deps (nullable array for rare cross-project deps)
- output (completion summary), created, completed

**Directive** — `.context/directives/{id}.json`
- id, title, source, status (inbox/triaging/mapped/completed/rejected)
- priority, raw_input (verbatim CEO text)
- mapping: {goal_ids[], project_ids[], task_ids[]} — where work landed
- triage_notes, created, updated, completed

### Directory Structure
```
.context/
├── goals/
│   ├── product/
│   │   ├── goal.json
│   │   ├── context.md
│   │   └── projects/
│   │       ├── buywisely-modernize.json    # with inline tasks
│   │       ├── sellwisely-revenue.json
│   │       └── ...
│   ├── growth/
│   │   ├── goal.json
│   │   └── projects/
│   │       ├── competitor-intelligence.json
│   │       └── ...
│   ├── infrastructure/
│   │   ├── goal.json
│   │   └── projects/
│   │       └── ...
│   └── framework/
│       ├── goal.json
│       └── projects/
│           ├── conductor-ux.json
│           └── ...
├── directives/
│   └── ...
└── _state/
    └── index.json
```

### Key Design Choices
1. **Tasks embedded in project JSON** — co-located, no file explosion, one read for full picture
2. **Projects nested under goal directories** — visual hierarchy in filesystem, CEO can `ls goals/growth/projects/`
3. **Smart triage with fuzzy matching** — match confidence > 0.7 → auto-map, 0.4-0.7 → propose to CEO, < 0.4 → new project
4. **Creating a goal requires CEO approval, creating a project does not**
5. **No 4th tier** — avoid sub-tasks at all costs

### Migration: 17 goals → 4 goals
product ← buywisely-*, sellwisely-*, ai-powered-apps, pricesapi-launch, data-enrichment (6 projects)
growth ← buywisely-growth, competitor-intelligence, growth-marketing, global-expansion (4 projects)
infrastructure ← platform, database-ops, developer-productivity, scraper-product-discovery (4 projects)
framework ← agent-conductor, conductor-review-quality, conductor-ux (3 projects)

### Confidence: High

---

## Morgan Park (COO) — Flat Projects, Embedded Tasks

### Core Thesis
Three-tier: Goals (domains) → Projects (initiatives) → Tasks (work items). Relationships live in JSON references, never in filesystem nesting. Top-level entities get directories for context growth. Leaf entities (tasks) are embedded in their parent. The directive pipeline is the primary WRITE workflow — every change enters through here.

### Entity Schemas

**Goal** — `.context/goals/{goal-id}/goal.json`
- id, name, description, status (active/paused/achieved), okrs (optional), owner, created, updated
- Directory because goals are long-lived and accumulate context. Only 4-8 of them.
- Optional context.md for domain-level knowledge

**Project** — `.context/projects/{project-id}/project.json`
- id, name, goal_id (FK, required, single parent), status (draft/active/blocked/completed/abandoned)
- description, scope (what's in/out), dod (verifiable criteria), priority (p0/p1/p2)
- **tasks: embedded array of task objects** — ordered by execution sequence
- source_directive, tags (for secondary goal refs), reports (absorbed summaries)
- created, updated
- Optional context.md for project-specific knowledge
- FLAT listing, NOT nested under goals — goal_id reference provides hierarchy

**Task** — Embedded in project.json
- id (short identifier within project), name, status (pending/in_progress/completed/blocked/skipped)
- agent (assigned type), depends_on (within project, cross-project format: 'project-id:task-id' — discouraged)
- output_summary, blocked_reason

**Directive** — `.context/directives/{id}.json`
- id, name, status (inbox/triaged/in_progress/completed/rejected), source
- triage: {size (goal/project/task), goal_id, project_id, task_ids[], rationale}
- plan, cast, phases, reports, created, updated

### Directory Structure
```
.context/
├── goals/                    # directories, 4-8 total
│   ├── product/
│   │   ├── goal.json
│   │   └── context.md        # optional
│   ├── growth/
│   │   └── goal.json
│   ├── infrastructure/
│   │   └── goal.json
│   └── framework/
│       └── goal.json
├── projects/                 # directories, flat listing, 10-20
│   ├── buywisely-modernize/
│   │   ├── project.json      # with embedded tasks + reports
│   │   └── context.md        # optional
│   ├── conductor-redesign/
│   │   ├── project.json
│   │   └── context.md
│   └── .../
├── directives/               # flat per Round 1
│   └── ...
└── _state/
    └── index.json
```

### Key Design Choices
1. **Projects FLAT, not nested under goals** — move a project between goals by editing one field, not renaming paths
2. **Tasks embedded in project.json** — no separate task files, keeps model at exactly 3 tiers
3. **Goal directories** for context accumulation, project directories for working context
4. **Default bias: MAP TO EXISTING over CREATE NEW** — the sprawl firewall
5. **Single goal per project** — cross-goal relevance via tags, not multiple parents
6. **No sub-tasks** — forced splitting is a feature (keeps agent scope tight)

### Migration: 17 goals → 4 (sw) + 1 (conductor)
product ← buywisely-*, sellwisely-revenue, ai-powered-apps, global-expansion
growth ← buywisely-growth, growth-marketing, competitor-intelligence
infrastructure ← database-ops, developer-productivity, platform, scraper-product-discovery
exploration ← data-enrichment, pricesapi-launch
framework (conductor) ← agent-conductor, conductor-review-quality, conductor-ux

### Confidence: High

---

## Synthesis — Agreements & Disagreements

### Where All Three Agree (STRONG CONSENSUS)

1. **Three-tier hierarchy: Goal → Project → Task.** No 4th tier. No sub-tasks. If a task is too big, it becomes a project with smaller tasks. This is a hard constraint. All three agents independently arrived at the same conclusion, matching the industry pattern (Linear, Jira, OKR tools all settle on 3 active levels).

2. **Directives are orthogonal INPUT, not a hierarchy tier.** A directive gets triaged and creates/maps-to goals, projects, or tasks. The directive itself is not "under" any goal. It has a mapping/triage field that links to the hierarchy entities it created.

3. **Goal creation requires CEO approval — the sprawl firewall.** All three independently identified this as the critical mechanism to prevent the current 17-goal mess. Creating a project does NOT require CEO approval (Morgan can do it autonomously). Creating a goal DOES.

4. **Tasks are atomic, single-agent work items.** Small scope, focused, verifiable, completable in one session. If a task needs extended context or decomposition, it's scoped too broadly.

5. **Goals are company-level domains, 4-8 total.** Stable, long-lived, rarely change. All three propose consolidating the current 17 goals into 4-6 company-level goals.

6. **OKRs live on the goal entity.** Structured array of objectives + key results with progress tracking. Optional (not every goal needs formal OKRs).

7. **Context scales hierarchically.** Goal-level context.md (optional) for domain knowledge. Project-level context (optional) for working knowledge. Task-level context is just the task description — no separate files. Agent loads 3-5 files max.

8. **Smart triage with bias toward existing entities.** The directive skill must search existing goals and projects BEFORE creating new ones. Default: map to existing. Rare: create new project. Extremely rare: create new goal.

9. **Reports co-located with parent entity** per Round 1 decision. No separate reports/ directory.

10. **Cross-project task dependencies are explicit but discouraged.** All three support it but prefer project-level sequencing over fine-grained cross-project task deps.

### Where They Disagree

**Disagreement 1: Tasks as Separate Files vs. Embedded in Project JSON**

| Agent | Proposal | Rationale |
|-------|----------|-----------|
| Sarah | **Separate files** in `.context/tasks/{id}.json` | One entity = one file. Parallel agent writes without merge conflicts. Normalized database. |
| Marcus | **Embedded** in project JSON `tasks[]` array | Co-located, one read for full picture, no file explosion. |
| Morgan | **Embedded** in project JSON `tasks[]` array | One file per project = one source of truth. Tasks are cheap leaf nodes. |

*Design tension:* Normalization vs. co-location. Sarah's approach is more database-pure but creates potentially 100+ small files. Marcus and Morgan's approach keeps things tight but risks concurrent write conflicts when two agents update tasks in the same project.

**Disagreement 2: Project Filesystem Location**

| Agent | Proposal | Rationale |
|-------|----------|-----------|
| Sarah | **Flat** `.context/projects/{id}.json` — no directories | Pure flat. .md companion alongside .json. Simplest possible. |
| Marcus | **Nested** `.context/goals/{goal-id}/projects/{project-id}.json` | Visual hierarchy. CEO can `ls goals/growth/projects/`. |
| Morgan | **Flat directories** `.context/projects/{project-id}/project.json` | Flat listing but each project gets a directory for context.md growth. Move between goals by editing one field. |

*Design tension:* Visual browsability vs. data purity. Marcus's nesting provides visual hierarchy but couples path to goal assignment (moving a project = renaming paths). Morgan's flat directories decouple the relationship but lose visual grouping. Sarah's flat files are purest but no room for context.md growth.

**Disagreement 3: Goal Filesystem Location**

| Agent | Proposal | Rationale |
|-------|----------|-----------|
| Sarah | **Flat files** `.context/goals/{id}.json` + optional `.md` | One file per entity. Simplest. |
| Marcus | **Directories** `.context/goals/{goal-id}/` containing goal.json + projects/ subdir | Full nesting. |
| Morgan | **Directories** `.context/goals/{goal-id}/` containing goal.json + optional context.md | Directory for context growth, but projects NOT nested inside. |

*Design tension:* All three agree goals need directories (2 of 3 explicitly, Sarah implicitly with the .md companion pattern). The real question is whether projects nest inside goal directories.

**Disagreement 4: Number of Consolidated Goals**

| Agent | Proposal | Notes |
|-------|----------|-------|
| Sarah | **6 goals** (buywisely, sellwisely, conductor, platform, growth, new-products) | Keeps product lines separate |
| Marcus | **4 goals** (product, growth, infrastructure, framework) | Maximally consolidated |
| Morgan | **5 goals** (product, growth, infrastructure, exploration, framework) | Separates exploring items |

*Design tension:* How granular should company-level goals be? This is a strategic/business question, not a technical one.

**Disagreement 5: How Goals Reference Projects**

| Agent | Proposal | Rationale |
|-------|----------|-----------|
| Sarah | Goals do NOT store project IDs — indexer computes from project.goalId | Normalized, no sync bugs |
| Marcus | Goals store `project_ids[]` array — source of truth for ordering | Explicit ordering, browsable |
| Morgan | Goals do NOT store project IDs — indexer builds the graph | Normalized |

---

## Key Design Tensions

### 1. Normalized Flat Files vs. Embedded Co-location
Sarah's fully normalized model (separate files per entity, foreign keys, indexer builds relationships) vs. Marcus/Morgan's embedded model (tasks inside project.json, co-located reads).

**For normalized (Sarah):** No merge conflicts on concurrent writes. Clean entity boundaries. Consistent "one entity = one file" rule. The indexer already exists and is fast.

**For embedded (Marcus/Morgan):** Fewer files. One read gets the full project picture. Tasks don't deserve their own files — they're too small. 95% of the time you read tasks WITH their project, not independently.

**Recommendation:** The embedded model (tasks in project.json) is the pragmatic choice for this system. The conductor runs max 1-2 directives at a time, sequentially. Concurrent agent writes to the same project are rare. The simplicity of "read one file, see the whole project" outweighs the theoretical benefit of parallel task writes. If concurrent writes become a real problem later, we can extract tasks to separate files — that's a non-breaking change.

### 2. Nested vs. Flat Project Location
Marcus nests projects inside goal directories. Morgan and Sarah keep projects flat with a goalId reference.

**For nested:** Visual hierarchy when browsing. CEO can `ls goals/growth/projects/`.

**For flat:** Moving a project between goals is a one-field edit, not a directory rename. Path doesn't encode business logic. The dashboard provides the grouped view.

**Recommendation:** Flat projects with directories (Morgan's model). The filesystem is a database, not a folder hierarchy. The dashboard and indexer provide the grouped views the CEO needs. Flat projects with goalId references are simpler to manage programmatically.

### 3. Goal Granularity (4 vs. 5 vs. 6)
This is the CEO's call. The data model supports any number equally well.

---

## Recommended Approach

There is strong consensus on the core model. Here is the synthesized recommendation:

### Entities
1. **Goal** — company-level domain, 4-8 total, directories with goal.json + optional context.md
2. **Project** — scoped initiative, flat directories with project.json + embedded tasks + optional context.md
3. **Task** — atomic work item, embedded in project.json, no separate files
4. **Directive** — CEO input, flat .json + .md in directives/, maps to hierarchy via triage

### Filesystem
```
.context/
├── goals/                        # directories, 4-8 total
│   ├── {goal-id}/
│   │   ├── goal.json             # entity + OKRs
│   │   └── context.md            # optional domain knowledge
│   └── .../
├── projects/                     # flat directories, 10-20+
│   ├── {project-id}/
│   │   ├── project.json          # entity + embedded tasks + reports
│   │   └── context.md            # optional project knowledge
│   └── .../
├── directives/                   # flat per Round 1
│   ├── {id}.json                 # machine state
│   ├── {id}.md                   # CEO's brief
│   └── .../
├── _state/                       # indexer output
│   ├── index.json                # overview + health
│   ├── goals.json                # goals + computed project counts
│   ├── projects.json             # projects + task rollups
│   └── directives.json           # directive pipeline state
├── lessons/                      # stable knowledge
│   └── *.md
└── vision.md
```

### Relationships
- Project.goal_id → Goal.id (required, single parent)
- Task.depends_on → Task.id[] within project (cross-project via 'project-id:task-id', discouraged)
- Directive.triage.targets[] → {Goal|Project|Task}.id (many-to-many mapping)
- Project.source_directive → Directive.id (audit trail)

### Triage Flow
1. Directive arrives as .json + .md, status=pending
2. Triage reads _state/ to find existing goals and projects
3. Classify: create-goal (CEO approval required) / create-project / add-tasks / update-existing / reject
4. Default bias: MAP TO EXISTING. Goal creation is the last resort.
5. Execute against hierarchy entities
6. Close: update directive status=done, project/task statuses independently

---

## Clarifying Questions for the CEO

**1. How many goals? What are they?**
All three agents agree on consolidation but differ on count (4-6). This is a strategic question only the CEO can answer. The three proposals:
- **4 goals (Marcus):** product, growth, infrastructure, framework — maximally simple
- **5 goals (Morgan):** product, growth, infrastructure, exploration, framework — separates "exploring" items
- **6 goals (Sarah):** buywisely, sellwisely, conductor, platform, growth, new-products — keeps product lines separate

Which grouping matches how you think about the business? If you're not sure, start with 5-6. Goals can be merged later (cheaper than splitting).

**2. Tasks: separate files or embedded in project JSON?**
Sarah wants one file per task (normalized, parallel-safe). Marcus and Morgan want tasks embedded in project.json (simpler, co-located). The team leans 2-to-1 toward embedded. Concurrent write conflicts are theoretical given our sequential execution. But if you foresee scaling to parallel agent execution, Sarah's approach is more future-proof. Your call.

**3. Should projects nest inside goal directories or stay flat?**
Marcus nests projects under `goals/{id}/projects/`. Morgan and Sarah keep projects in a flat `projects/` directory with a goal_id reference. The team leans 2-to-1 toward flat. Flat means moving a project between goals is a one-field edit. Nested means you can visually browse `goals/growth/projects/` but moving requires directory rename. Your call.

---

## Brainstorm Artifact Path
`/Users/yangyang/Repos/agent-conductor/.context/artifacts/context-tree-redesign/brainstorm-round-2.md`
