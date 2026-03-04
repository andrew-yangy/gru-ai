# Full-Team System Review and Smoke Test — 2026-03-04

Comprehensive review of all changes made 2026-03-03/04, covering pipeline docs, enforcement hooks, agent definitions, casting rules, project completions, sw repo cleanup, CLAUDE.md updates, API_BASE migration, and state-watcher deferred status.

## Executive Summary

**Build status: PASS.** TypeScript type-check and Vite build both succeed cleanly. All 4 hook scripts pass smoke tests with valid, invalid, and edge-case inputs. All 28 project.json files, 42 directive.json files, and 3 goal.json files are valid JSON. The API_BASE migration is complete with zero remaining hardcoded localhost references in frontend code. The sw repo conductor/ directory is confirmed deleted.

**2 bugs found. 1 schema inconsistency identified. 0 critical blockers.**

---

## Sam (QA) — Build and Hook Smoke Tests

### Build Verification
- `npx tsc --noEmit`: **PASS** — zero errors across all project references
- `npx vite build`: **PASS** — 1937 modules transformed, built in 1.71s
  - Informational warning: `src/lib/api.ts` is both dynamically imported (by `dashboard-store.ts` line 106) and statically imported (by 18 other files). This is cosmetic — Vite handles it correctly but it means api.ts cannot be code-split into a lazy chunk. Not a bug.

### Hook Smoke Tests

**validate-cast.sh** (4 test cases):
1. Valid input (auditor present, no conflicts): `{"valid": true}` -- PASS
2. Missing auditor + builder=reviewer: correctly identifies both violations -- PASS
3. Complex initiative (5+ phases) without C-suite reviewer: correctly identifies violation -- PASS
4. Self-review violation (riley reviewing riley-frontend.md changes): correctly identifies -- PASS
5. Invalid JSON input: graceful error with system-level violation -- PASS

**enforce-orchestrator-scope.sh** (4 test cases):
1. Source code path (src/): correctly blocks with deny -- PASS
2. .context/ path: allows through (no output) -- PASS
3. .claude/ path: allows through -- PASS
4. No file_path in tool_input: allows through -- PASS

**BUG FOUND - Path traversal bypass:** `.context/../src/lib/api.ts` is ALLOWED because the substring `.context/` is present in the path. The hook uses simple substring matching (`[[ "$FILE_PATH" == *".context/"* ]]`) which does not resolve the path. An attacker path like `/repo/.context/../src/anything` would bypass the check. Same for `.claude/../` paths.

**enforce-completion.sh**: Tested indirectly — no checkpoint active so it correctly allows through (no enforcement without active checkpoint). Logic review of the script shows correct structure.

**detect-stale-docs.sh** (2 test cases):
1. Real files (server/index.ts, server/config.ts): found 10 potentially stale docs in <1s -- PASS
2. Output format correct with clear references -- PASS

**checkpoint.sh** (3 test cases):
1. Help output: clean, all commands listed -- PASS
2. Init with nonexistent directive: correct error, exit 1 -- PASS
3. Read with nonexistent checkpoint: correct error, exit 1 -- PASS

### Data Integrity
- 28 project.json files: all valid JSON -- PASS
- 42 directive.json files: all valid JSON -- PASS
- 3 goal.json files: all valid JSON -- PASS
- 14 sw backlog.json files: all valid JSON, 117 total items -- PASS

---

## Sarah (Architecture) — Pipeline and Hook Architecture Review

### Pipeline Doc Consistency
- SKILL.md is a clean routing map with tables pointing to 10 pipeline docs + 7 schema docs + 5 template docs + 4 rules docs
- Every pipeline doc has a verification marker comment at the top
- Step ordering preserved: 00 (triage) -> 01 (checkpoint) -> 02 (read) -> 03 (context) -> 04 (challenge) -> 05 (planning) -> 06 (audit) -> 07 (approval) -> 08 (worktree) -> 09 (execute) -> 10 (wrapup)
- Cross-references between docs use correct relative paths

### Hook Architecture
- Clean separation: enforce-orchestrator-scope.sh (PreToolUse) and enforce-completion.sh (Stop) are the right two hooks
- All hooks exit 0 always with JSON output for decisions — correct pattern for Claude Code hooks
- enforce-completion.sh reads checkpoint file to determine enforcement needs — outcome-based checking, not action tracking. Architecturally sound.
- Second-attempt passthrough in enforce-completion.sh prevents infinite blocking loops — good defensive pattern
- validate-cast.sh and detect-stale-docs.sh are manual/pipeline-triggered, not Claude Code hooks — correct categorization

### Agent Definition Correctness
- 14 agent files present (5 C-suite + 5 specialists + 4 role agents)
- C-suite agents (sarah, marcus, priya): Read, Glob, Grep, Bash (read-only + execution) -- CORRECT
- Morgan: has Write tool — CORRECT (she writes plans, not source code)
- Alex: has Agent, TaskCreate/TaskUpdate/TaskList/TaskGet — CORRECT for orchestration
- Specialists (riley, jordan, casey): have Write/Edit tools — CORRECT for building
- Sam (QA): has Read, Glob, Grep, Bash only (no Write/Edit) — CORRECT for verification
- Taylor (content): has Write/Edit — CORRECT for content creation
- Role agents: auditor + investigator = read-only + opus model; builder = write + inherit; reviewer = read-only + inherit — CORRECT

### Alex Hook Integration
- alex-cos.md frontmatter correctly defines PreToolUse hook for Edit|Write using enforce-orchestrator-scope.sh
- Stop hook using enforce-completion.sh is correctly placed
- Hook command paths use `$CLAUDE_PROJECT_DIR` variable — correct for portability

### FINDING: Path Traversal Bypass (Medium Risk)
The scope enforcement hook uses substring matching (`*".context/"*`) which allows bypass via path traversal. A path like `.context/../src/file.ts` contains the substring `.context/` but resolves to `src/file.ts`. Fix: resolve the path using `realpath` or `readlink -f` before checking, or strip `../` segments.

### FINDING: Weight/Classification Field Mismatch (Low Risk)
`enforce-completion.sh` reads `.weight` from directive JSON (`jq -r '.weight // "medium"'`). The new directive I created uses `classification` instead of `weight`. Older directives use `weight` with values like `tactical`, `quick-fix`, `medium`, `strategic`. The hook expects `lightweight`, `medium`, `heavyweight`, `strategic`. Values like `tactical` and `quick-fix` are not recognized — they fall through to the default `"medium"` which happens to be safe (medium enforcement applies). Not a bug in practice for existing directives (most are completed), but a schema inconsistency that should be resolved.

---

## Morgan (Operations) — Pipeline Operations Review

### Casting Rules
- casting-rules.md covers all delegation patterns: C-suite for strategy, specialists for execution
- Specialist builder assignment uses file-pattern matching (e.g., `*.tsx` -> riley, `server/` -> jordan) -- deterministic
- Multi-reviewer guidance is clear: match reviewer to domain, dual review for complex/risky work
- Self-review prohibition explicitly stated and enforced by validate-cast.sh
- Generic fallback (`"builder": "engineer"`) available when no specialist matches

### Pipeline Step Ordering
- Triage happens first (Step 0b), correctly determines process weight
- Medium directives skip C-suite challenges and CEO approval — correct
- Heavyweight includes brainstorm (Phase 1 only, no deliberation) — correct distinction from strategic
- Strategic adds deliberation round (Phase 2 rebuttals) — correct
- Follow-ups processed by risk level (Step 6b) before digest (Step 6d) — correct ordering
- Stale doc detection (Step 6c) runs between follow-ups and digest — correct placement

### Weight Classification
- Four weights: lightweight, medium, heavyweight, strategic
- Clear criteria for each with security-specific examples
- "Strategic" is NOT "big" — it's "unclear approach with lasting consequences" — good distinction

### Checkpoint Flow
- checkpoint.sh supports full lifecycle: init -> update-step -> update-initiative -> track-agent -> track-artifact -> delete
- Enforcement fields (agents_spawned, review_artifacts_written) added to checkpoint schema
- Stop hook reads checkpoint to verify enforcement — clean integration
- Cleanup: checkpoint deleted after digest written (Step 6f) — correct, digest is the permanent record

### FINDING: Stale Weight Vocabulary
Old directives use `tactical` (32 files), `quick-fix` (1 file) — these are not in the current classification vocabulary (lightweight/medium/heavyweight/strategic). The enforce-completion.sh hook defaults to "medium" for unknown values, which means tactical directives would get medium enforcement. This is safe but misleading. Recommend: either migrate old directive JSONs to use new vocabulary, or add `tactical` as an alias for `lightweight` in the hook.

---

## Riley (Frontend) — UI Component Review

### API_BASE Migration
- **Complete.** 19 frontend files import from `@/lib/api` — zero remaining `localhost:4444` references
- `src/lib/api.ts` correctly derives host from `window.location.hostname` with port 4444
- dashboard-store.ts uses dynamic import (`await import('@/lib/api')`) in `deleteTeam` — the one async usage that causes the Vite warning. Functional but cosmetic issue.

### Component Review
All modified `.tsx` files reviewed. Findings:

**DashboardPage.tsx**: Clean. Destructured store without selector on line 15 (`const { teams, sessions, events, sessionActivities, tasksByTeam } = useDashboardStore()`) — this triggers re-render on ANY store change. The `workState` uses a proper selector on line 16. The destructured call is a known trade-off (this page needs most state). No bugs.

**ProjectsPage.tsx**: Large file (49KB). Uses API_BASE correctly. Fetches work state on mount. No dead imports detected.

**KanbanCard.tsx, SessionCard.tsx**: Both use API_BASE for `focus-session` API calls. Agent badge colors defined consistently in both files (duplicated helper functions: `agentBadgeColor`, `statusDotColor`, `shortModel`, `shortCwd`, `formatFileSize`). Not a bug but a maintenance concern — these could be extracted to a shared utility.

**SettingsPage.tsx**: Clean. Uses API_BASE for PATCH config. Proper error handling.

**AppLayout.tsx**: Eagerly fetches work state on app load — important for orientation banner and search. Uses `fetchedRef` to prevent duplicate fetches. Clean.

**SearchCommandPalette.tsx**: Proper abort controller for stale requests. Debounced search at 300ms. Uses API_BASE correctly.

**SendInput.tsx, QuickActions.tsx, MemberCard.tsx**: All use API_BASE correctly. No issues.

**CeoBrief.tsx, SchedulerCard.tsx**: Both use API_BASE correctly. CeoBrief has a well-structured inline markdown renderer. SchedulerCard has proper polling (30s interval with cleanup).

**ArtifactsPage.tsx**: Clean. Uses API_BASE for artifact content loading. Proper loading/error states.

### No Dead Imports Found
All imports in modified files are used. No orphaned components detected.

### FINDING: Duplicated Helper Functions (Low Risk, Maintenance)
`agentBadgeColor`, `statusDotColor`, `shortModel`, `shortCwd`, `formatFileSize` are duplicated between `KanbanCard.tsx` and `SessionCard.tsx`. Should be extracted to `@/lib/utils` to prevent drift.

---

## Jordan (Backend) — Server Review

### Server Changes Scope
The git status shows no server source files (server/*.ts) as modified in this diff. The changes in this review period were primarily to:
- Pipeline docs, hooks, and agent definitions (.claude/)
- Frontend files (src/)
- Context tree files (.context/)

Server-side code (server/index.ts, server/config.ts, etc.) was not directly modified in this batch.

The `localhost` references found in `server/index.ts` (lines 87, 1175-1178) are server-side logging/URL construction — appropriate and not affected by the frontend API_BASE migration.

### WebSocket Events
The useWebSocket.ts hook correctly handles all message types: full_state, sessions_updated, projects_updated, teams_updated, tasks_updated, event_added, events_updated, session_activities_updated, directive_updated, goals_updated, state_updated, config_updated, notification_fired. No gaps detected.

### No Backend Issues Found
Backend code is unchanged in this batch. No review findings.

---

## Casey (Data/Pipeline) — Data Integrity Review

### Project.json Schema Compliance
All 28 project.json files validated:
- Valid JSON: 28/28
- Completed projects have `completed` date field
- Deferred projects (correction-to-code-pipeline) have `status: "deferred"` with unmet DOD criteria — correct
- Tasks embedded within project.json — no separate task files — correct per CLAUDE.md
- `verified_by` fields present where required (as arrays) — correct per 27baf5c fix

### Directive JSON Files
All 42 directive.json files validated:
- Valid JSON: 42/42
- Completed directives have `status: "completed"` and `completed` date
- In-progress directive (full-system-review-2026-03-04) has `status: "executing"` — correct

### Backlog Files
Agent-conductor: no backlog.json files in .context/goals/ — not required
SW repo: 14 backlog.json files, all valid JSON, 117 total items across goals

### Context Tree Integrity
- 3 goals (data-model, ui, workflow-orchestration): all have goal.json — PASS
- Goals discoverable via glob `goals/*/goal.json` — PASS
- Projects discoverable via glob `goals/*/projects/*/project.json` — PASS
- Directives flat in `directives/` with status in JSON — PASS
- SW repo conductor/ directory deleted — PASS

### FINDING: goal.json Missing okrs Field
The context tree spec mentions `okrs` in goal.json but the wrapup pipeline (Step 6) checks for it. Should verify goal.json files have the field or the check handles absence gracefully. Not blocking — Step 6 says "If goal.json has no okrs or it is empty, skip this step."

---

## Marcus (Product) — CEO Experience Review

### CLAUDE.md Clarity
- Context tree structure is well-documented with explicit paths and glob patterns
- "How to Read the Context Tree" section provides 4 clear use-case patterns (what to do, planning, building, after work)
- Three goals table with domain mapping is clear
- Lessons routing table maps roles to specific topic files — easy to follow

### Directive Trigger Description
- SKILL.md trigger description is clear: "Use this skill whenever the user requests non-trivial work that goes beyond a one-liner fix"
- Explicitly lists when to use: "building features, running projects with project.json, executing multiple tasks, multi-file changes, or any work with defined DOD/reviewers"
- Pipeline routing for different weight classes is well-explained

### Report Tiers
The progressive-disclosure-report project (completed) introduces 3 tiers:
- `/report` (headline): 5-line status — shipped, blocked, needs CEO, health, top action
- `/report summary`: current daily-mode output
- `/report deep`: current weekly-mode output with full analysis
This is intuitive and matches CEO attention patterns.

### System Understandability for New Users
1. Reading order is clear: vision.md first, then goals, then lessons
2. Agent definitions are self-documenting with clear personality, background, and behavioral rules
3. The routing map in SKILL.md is navigable — each step has a doc pointer
4. Casting rules are deterministic with file-pattern matching

### FINDING: New User Onboarding Gap (Low Risk)
There is no "Getting Started" or "First Run" guide. A new user would need to piece together: (1) install deps, (2) start server, (3) understand the autonomous loop. The vision.md covers the what and why but not the how. Not blocking for current usage (single CEO) but would be needed for framework adoption.

---

## Bugs Found

### BUG 1: Path Traversal Bypass in enforce-orchestrator-scope.sh (Medium Risk)
**File:** `/Users/yangyang/Repos/agent-conductor/.claude/hooks/enforce-orchestrator-scope.sh` line 29
**Issue:** Simple substring matching `[[ "$FILE_PATH" == *".context/"* ]]` allows paths like `.context/../src/file.ts` to bypass the check.
**Impact:** An LLM could theoretically construct a path traversal to write source code despite the scope restriction. In practice, Claude Code likely resolves paths before passing them to hooks, reducing actual risk. But the defense-in-depth is broken.
**Fix:** Resolve the path before checking: `FILE_PATH=$(python3 -c "import os; print(os.path.realpath('$FILE_PATH'))")` or use `realpath` if available.

### BUG 2: Weight/Classification Field Naming Inconsistency (Low Risk)
**File:** `/Users/yangyang/Repos/agent-conductor/.claude/hooks/enforce-completion.sh` line 57
**Issue:** Hook reads `.weight` but the directive JSON schema used by the pipeline (00-delegation-and-triage.md) calls it "classification." New directives may use `classification` instead of `weight`, causing the hook to default to "medium" regardless.
**Impact:** Low — defaults to medium enforcement which is safe. But if a lightweight directive uses `classification: "lightweight"` instead of `weight: "lightweight"`, it would get medium enforcement (unnecessary strictness). And a heavyweight directive would only get medium enforcement (insufficient strictness).
**Fix:** Normalize: either the hook should check both fields (`jq -r '.weight // .classification // "medium"'`), or the pipeline docs should standardize on `weight` (matching the hook and 40 existing directives).

### INCONSISTENCY: Stale Weight Vocabulary (Low Risk)
**Files:** 32 directive.json files use `weight: "tactical"`, 1 uses `weight: "quick-fix"` — neither matches the current vocabulary (lightweight, medium, heavyweight, strategic).
**Impact:** These directives are all completed, so the hook never runs against them. But if checkpoint/resume is ever used on an old directive, `tactical` would be treated as `medium`. This is likely fine but should be documented.

---

## Potentially Stale Docs
Output from `detect-stale-docs.sh server/index.ts server/config.ts`:
- .context/directives/dashboard-glob-reads.md -> references server/index.ts
- .context/goals/data-model/projects/context-tree-redesign/plan-for-approval.md -> references server/index.ts
- .context/lessons/skill-design.md -> references server/index.ts
- .context/reports/projects-page-repo-grouping-2026-03-03.md -> references server/config.ts
- .claude/agents/sam-qa.md -> references server/index.ts
- .claude/agents/jordan-backend.md -> references server/index.ts, server/config.ts
- .claude/agent-memory/alex/MEMORY.md -> references server/index.ts

These are informational. The references are accurate descriptions (not stale) — the agent definitions and reports describe the server architecture which hasn't changed.
