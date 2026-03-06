# Build Report: pipeline-docs-rewrite

**Builder:** Taylor Chen (Content)
**Date:** 2026-03-06
**Directive:** pipeline-v2

## Changes Made

### Task 1: Terminology Search-and-Replace

**Files modified (pipeline docs):**
- `09-execute-initiatives.md` -- RENAMED to `09-execute-projects.md` + full rewrite (~58 occurrences replaced)
- `00-delegation-and-triage.md` -- 6 replacements (initiative -> task/project contextually)
- `01-checkpoint.md` -- 4 replacements
- `05-morgan-planning.md` -- 4 replacements
- `06-technical-audit.md` -- 6 replacements
- `07-plan-approval.md` -- 16 replacements
- `08-worktree-and-state.md` -- 3 replacements (also updated current.json schema: totalInitiatives -> totalTasks, etc.)
- `10-wrapup.md` -- 17 replacements

**Files modified (reference templates):**
- `morgan-prompt.md` -- FULL REWRITE (see Task 5)
- `digest.md` -- 13 replacements
- `architect-prompt.md` -- 7 replacements
- `auditor-prompt.md` -- 6 replacements
- `investigator-prompt.md` -- 5 replacements

**Files modified (reference rules):**
- `casting-rules.md` -- 5 replacements
- `phase-definitions.md` -- 7 replacements
- `scope-and-dod.md` -- 4 replacements
- `failure-handling.md` -- 5 replacements

**SKILL.md updates:**
- All `09-execute-initiatives.md` references -> `09-execute-projects.md`
- "Execute all initiatives" -> "Execute all tasks"
- "simple initiatives" -> "simple tasks"

### Task 2: Add Step 3c -- Project Brainstorm

- Created `07b-project-brainstorm.md` -- full instructions for Sarah + builder task decomposition
- Updated `07-plan-approval.md` to reference project brainstorm as next step after approval
- Added Step 3c to SKILL.md routing table

### Task 3: Add Completion Gate Step

- Created `11-completion-gate.md` -- CEO sign-off step for all directive weights
- Updated `10-wrapup.md` Step 6g: `completed` -> `awaiting_completion`
- Updated NEVER/ALWAYS rules in `10-wrapup.md` to reference new completion flow
- Added Step 8 to SKILL.md routing table

### Task 4: Resolve Conflicts and Contradictions

- **C5-C6:** `00-delegation-and-triage.md` updated -- lightweight says "No plan-approval gate" (not "No CEO approval"), medium says "No pause for plan sign-off" (completion gate still applies). Both weight classes now reference Step 8 completion gate.
- **IC1:** `vision.md` principle 6 updated -- "Low = do + report (CEO approves completion after). Medium = do + report (CEO can reopen). High = CEO approves plan AND completion."
- **IC2:** `10-wrapup.md` Step 6g now checks `browser_test: true` before marking `awaiting_completion`.
- **IC3:** `10-wrapup.md` Step 6g now requires failed/partial task explanations in the digest before marking `awaiting_completion`.
- `vision.md` principle 4 updated -- "Engineers are spawned per-task" (was "per-initiative")

### Task 5: Update Morgan Prompt Template

- `morgan-prompt.md` -- FULL REWRITE
- Morgan now outputs `projects[]` (not `initiatives[]`)
- Morgan does NOT output tasks or definition_of_done -- that moves to Step 3c
- Example schema shows `projects[]` with `scope_summary`, `agent`, `reviewers`, `auditor`
- Removed user_scenario, phases, definition_of_done from Morgan's output
- Zero occurrences of "initiative"

### Task 6: Update Agent Prompts and Memory

**Agent files updated (10 files, zero "initiative" remaining):**
- `morgan-coo.md` -- 11 replacements (initiatives -> projects/tasks contextually)
- `sarah-cto.md` -- 2 replacements
- `marcus-cpo.md` -- 1 replacement
- `priya-cmo.md` -- 2 replacements
- `riley-frontend.md` -- 1 replacement (description)
- `jordan-backend.md` -- 1 replacement (description)
- `casey-data.md` -- 1 replacement (description)
- `taylor-content.md` -- 1 replacement (description)
- `sam-qa.md` -- 1 replacement (description)
- `devon-fullstack.md` -- 2 replacements

**MEMORY.md updated:**
- project.json schema section: "Morgan outputs `projects[]`" (was `initiatives`)
- Pipeline docs references: `09-execute-projects.md` (was `09-execute-initiatives.md`)
- Added `07b-project-brainstorm.md` reference
- Pipeline improvements section: "initiative" -> "task" throughout

**Lessons files updated (prescriptive guidance only):**
- `orchestration.md` -- 8 replacements in prescriptive bullets
- `state-management.md` -- 2 replacements
- `agent-behavior.md` -- 1 replacement (section heading)
- `scenarios.md` -- 2 replacements in scenario steps
- `review-quality.md` -- NOT modified (references are in historical narrative about Phase 3, not prescriptive guidance)

### Task 7: Update CLAUDE.md and SKILL.md

- `CLAUDE.md` context tree updated -- directives now show directory structure with `directive.json`, `brainstorm.md`, `projects/`
- `SKILL.md` routing table includes Step 3c (`07b-project-brainstorm.md`) and Step 8 (`11-completion-gate.md`)
- Zero "initiative" in either file

## Verification

```
$ grep -ri "initiative" .claude/skills/directive/docs/ .claude/agents/ CLAUDE.md | grep -v schemas/
(zero results)
```

All 7 tasks completed. Zero remaining "initiative" references in target files (excluding schemas dir, which was handled by Project 1).

## Brainstorm Alignment

**Followed:**
- Brainstorm Round 1: Morgan outputs "projects" (confirmed and implemented throughout)
- Brainstorm Round 3: Morgan stops writing tasks/DOD, keeps project-level planning only (morgan-prompt.md rewritten accordingly)
- Brainstorm Round 3: Sarah + assigned builder produce task breakdown post-approval (07b-project-brainstorm.md created)
- CEO Addition: All directives get completion gate (11-completion-gate.md created)

**Deviated from:**
- Sarah's audit recommended weight-based completion gates (lightweight=none, medium=soft, heavyweight=hard). The project.json task says "ALL directives require CEO completion approval". I followed the project.json requirement, not Sarah's audit recommendation. All weights get `awaiting_completion` status.
- Sarah's audit recommended a new status value `pending_ceo_completion`. I used `awaiting_completion` instead (matches the brainstorm doc's language and is clearer).

## Proposed Improvements

- **Schema files need updating**: The schemas dir (`directive-json.md`, `current-json.md`, `morgan-plan.md`) was excluded per Project 1 scope, but `current-json.md` still uses `totalInitiatives`/`currentInitiative` field names. These should be updated to match the pipeline docs.
- **validate-cast.sh may need updating**: The script currently validates `initiatives[]` in Morgan's plan. Since Morgan now outputs `projects[]`, the script's parsing logic should be verified.
- **validate-project-json.sh**: Should verify tasks array has DOD (which now comes from Step 3c, not Step 4). May need timing adjustment.
- **Heavyweight process listing in 00-delegation-and-triage.md**: The step listing (Steps 0 -> 1 -> 2 -> ... -> 7) should be updated to include Step 3c and Step 8.
- **Brainstorm prompt template** (`brainstorm-prompt.md`): Still generic -- does not reference the new project-level brainstorm (07b). Could be confusing since there are now two types of brainstorm (directive-level strategic brainstorm and project-level task decomposition brainstorm).
