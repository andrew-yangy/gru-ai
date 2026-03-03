# Context Tree Redesign -- Execution Plan

**Directive:** context-tree-redesign
**Weight:** MEDIUM (Alex approves)
**Date:** 2026-03-03
**Planner:** Morgan Park (COO)
**Auditor:** Sarah Chen (CTO)
**Status:** APPROVED by Alex Rivera (Chief of Staff)

---

## Entity Inventory (Verified)

### Agent-Conductor Repo
| Entity | Count |
|--------|-------|
| Goals | 3 (agent-conductor, conductor-ux, conductor-review-quality) |
| Features | 10 (all done, all under agent-conductor) |
| Directives (inbox) | 8 |
| Directives (done) | 27 |
| Artifact directories | 9 |
| Intel files (latest) | 4 |
| Report files | 34 |
| Lesson files | 5 |
| State files (to delete) | 6 |
| Discussion files | 4 |
| Checkpoint files | 1 |

### SW (Consumer) Repo
| Entity | Count |
|--------|-------|
| Goals | 17 (14 real + 3 symlinked conductor goals) |
| Features (total) | 65 |
| Features (active) | 10 |
| Features (done) | 55 |
| Feature directories | 55 |
| Task files | 52 |
| State files (to delete) | 6 |
| Backlog files (.json) | exists per goal |
| Backlog files (.md) | exists per goal (to drop) |

### Total Migration Scope
- **3 goals consolidated to 1** (agent-conductor)
- **14 goals consolidated to ~5** (sw, minus 3 symlinked conductor goals)
- **65 features to convert to projects** (sw)
- **10 features to convert to projects** (agent-conductor)
- **35 directives to flatten** (agent-conductor)
- **0 directives in sw** (no inbox/done dirs)
- **52 task files to embed** (sw)
- **9 artifact directories to co-locate** (agent-conductor)
- **6 SKILL.md files to update** (agent-conductor)
- **2 CLAUDE.md files to update/create** (both repos)
- **6 dashboard server files to rewrite** (agent-conductor)
- **5 scripts to update/delete** (agent-conductor)

---

## Morgan's Challenges Assessment

### Risks
1. **Data loss during SW goal consolidation** (14 to 5) if feature-to-project mapping misses edge cases like features with no tasks.json
2. **SKILL.md and CLAUDE.md path updates falling out of sync** with actual migration -- agents break between migration merge and ref updates
3. **Dashboard update blocked** if migration validation reveals structural issues requiring script rework

### Over-Engineering Flags
- Do NOT auto-parse prose backlog.md into structured backlog.json. Create empty backlog.json files and let agents populate organically.

### Recommendation: PROCEED

---

## Initiatives

### Initiative 1: context-tree-migration (P0, complex)

**Scope:** Write an idempotent migration script that transforms .context/ to the new spec. Runs on both repos sequentially: agent-conductor first (smaller, 3 goals to 1), then sw (14 goals to 5). After migration, update all SKILL.md files and CLAUDE.md to reference new paths. Old structure preserved until review passes.

**Agent-conductor specifics:**
- Rename `agent-conductor/` goal to `conductor/`
- Demote `conductor-ux/` and `conductor-review-quality/` to projects under `conductor/`
- Convert 10 features to projects with embedded tasks
- Flatten `inbox/` + `done/` into `directives/` (35 directives)
- Move 9 artifact directories to co-located project directories
- Rename `intelligence/` to `intel/`
- Delete: `state/`, `checkpoints/`, empty logs, `scenarios.md`
- Absorb: `discussions/` into lessons or project context, `lessons.md` into `lessons/`
- Create per-goal `backlog.json` (empty, not parsed from backlog.md)
- Create CLAUDE.md (does not exist yet)

**SW specifics:**
- Consolidate 14 goals to 5 (buywisely, sellwisely, infrastructure, growth, new-products)
- Remove 3 symlinked conductor goals
- Convert 65 features to projects (55 done, 10 active)
- Embed 52 task files into project.json
- Handle `active/` and `done/` subdirectory convention (sw uses these, agent-conductor does not)
- Delete: `state/`, `_index.md`, `inventory.json`
- Preserve: `preferences.md`, `systems/`, `marketing/`, `workflow.md`, `roles.md`
- Update CLAUDE.md

**SKILL.md updates (6 files):**
- `brainstorm/SKILL.md` -- refs to `_index.md`, `discussions/`, `scenarios.md`
- `healthcheck/SKILL.md` -- refs to `_index.md`, `okrs.md`, `active/*`, `inventory.json`
- `walkthrough/SKILL.md` -- refs to `scenarios.md`, `inbox/`
- `scout/SKILL.md` -- refs to `_index.md`, `intelligence/`, `proposals.log`, `intelligence.log`, `inbox/`
- `directive/SKILL.md` -- refs to `inbox/`, `checkpoints/`, `artifacts/`, `_index.md`, `state/`, `backlog.md`, `okrs.md`, `done/`
- `report/SKILL.md` -- refs to `_index.md`, `intelligence/latest/`, `inventory.json`, `tasks.json`, `backlog.md`, `proposals.log`

**Phases:** build, review
**Cast:** auditor=sarah, builder=jordan, reviewers=[sarah]
**Verify:** `npm run type-check`

**Definition of Done:**
1. Migration script is idempotent and runs cleanly on both repos
2. Agent-conductor: 1 goal (conductor) with projects including dashboard-ux and review-quality
3. Agent-conductor: all 35 directives flat in `directives/`
4. SW: 5 consolidated goals, all 65 features converted to projects with embedded tasks
5. SW: 3 symlinked conductor goals removed
6. Validation report shows zero orphans, zero unmapped features, correct entity counts
7. All 6 SKILL.md files reference new glob patterns
8. CLAUDE.md updated in both repos
9. Old structure preserved on branch for comparison before merge
10. `npm run type-check` passes in agent-conductor

### Initiative 2: dashboard-glob-reads (P1, moderate)

**Depends on:** Initiative 1 (migration must be complete and validated first)

**Scope:** Replace the dashboard's indexer and state-based data layer with direct glob reads per SPEC Section 5. Remove all indexer code, state watchers, and computed-file dependencies. Rewrite data pipeline: glob + parse + chokidar replaces ContextWatcher -> index-state.ts -> state/ -> StateWatcher chain.

**Files to change:**
- `server/watchers/context-watcher.ts` -- DELETE (entire file is indexer trigger)
- `server/watchers/state-watcher.ts` -- DELETE (reads .context/state/)
- `server/watchers/goal-watcher.ts` -- REWRITE (glob goal.json files directly)
- `server/watchers/directive-watcher.ts` -- UPDATE paths
- `server/index.ts` -- Update findInboxWork, findBacklogWork, checkTriggerFired, handleArtifactContent
- `server/state/work-item-types.ts` -- REWRITE (new entity types)
- `server/state/aggregator.ts` -- REWRITE (direct reads, no computed state)
- `scripts/index-state.ts` -- DELETE
- `scripts/foreman.ts` -- Update all .context/conductor/ paths
- `scripts/intelligence-trends.ts` -- Update intelligence -> intel paths
- `scripts/backfill-references.ts` -- DELETE or update
- `scripts/migrate-cross-references.ts` -- DELETE or update
- `src/stores/dashboard-store.ts` -- Update types
- `src/stores/types.ts` -- Update FullWorkState interface

**Phases:** build, review
**Cast:** auditor=sarah, builder=riley, reviewers=[sarah]
**Verify:** `npm run type-check`

**Definition of Done:**
1. Dashboard reads all entities via glob patterns matching SPEC Section 5
2. Chokidar watches new paths: `goals/*/goal.json`, `goals/*/projects/*/project.json`, `goals/*/backlog.json`, `directives/*.json`, `intel/latest/*.json`, `reports/*.md`
3. Zero references to `state/`, indexer, `_state/`, computed files, or old path patterns remain
4. Dashboard correctly renders goals with nested projects and embedded tasks
5. Foreman paths fixed (no more `.context/conductor/` convention)
6. `npm run type-check` passes

---

## Sarah's Audit Findings

### Critical Risks

1. **SW repo audit blind spot** (HIGH): Entity counts for SW were estimated from the spec until we ran the inventory script. Now verified: 17 goals, 65 features, 52 task files. Migration script must handle the `active/` and `done/` subdirectory convention that SW uses but agent-conductor does not.

2. **Foreman path convention split** (HIGH): agent-conductor uses `.context/inbox/` directly, but the foreman/CLI scaffold consumer repos with `.context/conductor/inbox/`. The foreman has likely never worked correctly against agent-conductor itself. Migration must normalize this.

3. **SKILL.md path coverage** (HIGH): 6 SKILL.md files have 50+ unique path references. After migration, must grep for ALL old patterns. Zero matches = pass.

### Medium Risks

4. **Artifact-to-project mapping ambiguous**: 9 artifact directories must map to projects. Some (like context-tree-redesign) are for this active directive which has not created a formal project yet. Solution: create project entries for active directives.

5. **Directive schema change**: Old format has simple fields; new format has triage{}, plan{}, phases{}, etc. For completed directives, populate only what exists. Do not fabricate triage data.

6. **FullWorkState type crosses server/frontend boundary**: Changing it is a cross-boundary break. Define new types first, update server, then frontend.

### Low Risks

7. **Reports migration heuristic**: Reports named `daily-*`, `weekly-*`, `walkthrough-*` stay in `reports/`. All others are directive-specific and move to project dirs if matching project exists.

8. **No CLAUDE.md in agent-conductor**: Spec says update it, but it does not exist. Create it as part of migration.

9. **backlog.md -> backlog.json**: Current goals already have backlog.json files. Ignore backlog.md and use existing JSON. Create empty backlog.json where none exists.

---

## Execution Sequence

```
1. Initiative 1: context-tree-migration
   a. Write migration script (Node.js/TypeScript)
   b. Run on agent-conductor repo (git branch: context-tree-v2)
   c. Validate: entity counts, orphan check, broken refs
   d. Run on sw repo (git branch: context-tree-v2)
   e. Validate: same checks
   f. Update 6 SKILL.md files
   g. Update/create CLAUDE.md in both repos
   h. Sarah reviews branch diff
   i. Fix findings
   j. Merge (no CEO gate for medium weight)

2. Initiative 2: dashboard-glob-reads
   a. Rewrite watchers + aggregator to use glob reads
   b. Remove indexer code (context-watcher, state-watcher, index-state.ts)
   c. Update foreman paths
   d. Update frontend types
   e. Sarah reviews
   f. Fix findings
   g. Merge
```

---

## Approval

**Alex Rivera (Chief of Staff):** APPROVED

This is medium-weight, non-controversial infrastructure work. All design decisions were made by the CEO across 4 brainstorm rounds. The spec is comprehensive. The plan is 2 initiatives with clear sequencing. Risks are identified and mitigated.

Proceeding to execution.
