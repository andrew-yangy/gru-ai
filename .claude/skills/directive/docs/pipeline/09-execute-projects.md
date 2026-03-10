<!-- Pipeline doc: 09-execute-projects.md | Source: SKILL.md restructure -->

## Execute: Execute Projects

### Multi-Project Execution

- **Multi-project plans** (`projects` array): Run the entire execute step once per project, sequentially by priority tier (P0 before P1). Each project is an independent execution unit with its own project.json, brainstorm, task loop, and review verification.
- **Cross-project dependencies:** `depends_on` in the COO's plan specifies execution order. The wave algorithm (below) uses `depends_on` + file overlap to determine parallelism. Tightly coupled work sharing code dependencies should be ONE project with ordered tasks.
- **Single-project plans**: Run once for the single project.json.

### Pre-execution Gate: Validate project.json

**Before any task executes**, validate project.json:

```bash
# Run once per project in the directive
echo '{"directive_dir":"'"$DIRECTIVE_DIR"'","project_id":"'"$PROJECT_ID"'"}' | .claude/hooks/validate-project-json.sh
```

If `valid: false`, **STOP**. Fix violations before proceeding. Hard gate, not a warning.

### CRITICAL: Update project.json After Each Task

After completing each task, update project.json: set `status` to final value and `dod[].met` from the reviewer's verification (not builder self-assessment). When ALL tasks are done, set project-level `status` to `completed` and update `updated` timestamp. This is how the dashboard tracks progress.

---

Execute tasks from `tasks` array in priority order (P0 first). All tasks should be `simple` complexity -- the approve step enforces this.

### Wave Analysis (before execution loop)

Deterministic algorithm computed by the orchestrator from project.json tasks and audit data. No LLM involved.

**Inputs:** `tasks[]` from project.json (with optional `depends_on`, defaults to `[]`), `active_files[]` from audit output.

**Global sequential files** (tasks touching these CANNOT run in parallel):
`package.json`, `package-lock.json`, `tsconfig.json`, `prisma/schema.prisma`, `.env*`

**Algorithm:**

```
MAX_PARALLEL = 3

function computeWaves(tasks, auditResults):
    remaining = set(all task IDs)
    completed = set()
    waves = []

    while remaining is not empty:
        eligible = [t for t in remaining if all t.depends_on in completed]
        if eligible is empty:
            ERROR: "Circular dependency detected"
            break

        eligible.sort(by priority)
        tierEligible = eligible.filter(t => t.priority == eligible[0].priority)

        wave = []
        occupiedFiles = set()
        waveHasGlobalFile = false

        for task in tierEligible:
            if len(wave) >= MAX_PARALLEL: break
            taskFiles = auditResults[task.id].active_files
            taskTouchesGlobal = taskFiles INTERSECT GLOBAL_SEQUENTIAL is NOT EMPTY

            if taskTouchesGlobal and (waveHasGlobalFile or len(wave) > 0): continue
            if not taskTouchesGlobal and waveHasGlobalFile: continue

            if taskFiles INTERSECT occupiedFiles is EMPTY:
                wave.append(task)
                occupiedFiles.addAll(taskFiles)
                if taskTouchesGlobal: waveHasGlobalFile = true

        waves.append(wave)
        for task in wave:
            remaining.remove(task.id)
            completed.add(task.id)

    return waves
```

**Properties:** Priority ordering preserved (P0 before P1). File overlap prevents parallel execution. Greedy packing up to MAX_PARALLEL. Deterministic.

**Wave manifest artifact:** Write to project directory as `wave-manifest.json`:

```json
{
  "computed_at": "2026-03-06T10:00:00Z",
  "max_parallel": 3,
  "total_tasks": 8,
  "total_waves": 3,
  "waves": [
    { "wave": 1, "tasks": [{ "id": "update-types", "priority": "P0", "active_files": ["src/types.ts"] }], "parallel": false },
    { "wave": 2, "tasks": [{ "id": "build-a", "priority": "P0", "active_files": ["src/A.tsx"] }, { "id": "build-b", "priority": "P0", "active_files": ["src/B.tsx"] }], "parallel": true }
  ]
}
```

Same builder in parallel tasks: separate agent instances, each with own scope and context.

### Wave-Based Execution Loop

```
for each wave in manifest:
    if 1 task: execute sequentially
    if multiple: spawn parallel CLI agents, wait for all, post-wave diff check

    // Reviews: SEQUENTIAL per task within the wave
    for each completed task:
        run code-review (if in phases) -> run review -> fix cycle if fail
    advance to next wave
```

**Parallel builds use CLI spawns** (`tsx scripts/spawn-agent.ts`), NOT `run_in_background` (background agents get Bash auto-rejected).

**Reviews stay sequential** -- parallel reviews see inconsistent state, and fix cycles modify files.

**Post-wave diff check:** After builds complete, run `git diff --name-only`, compare against manifest's `active_files`. Log drift warnings: `[DRIFT] {task title} modified {file} not in predicted active_files`. Warning only, does not block.

**Progress format:** `Wave 1/3: [1 task, sequential]` then `[1/8] Update types (P0, backend-engineer) -- building...`

### Phase Execution Reference

Execute each phase in the task's `phases` array per the rules in `reference/rules/phase-definitions.md`. Key points per phase:

- **research/product-spec/design/visual-design/keyword-research/outline/clarification/draft/seo-review:** Spawn the assigned agent per cast. Write artifact to project directory as `{phase-name}.md`.
- **build:** See "Engineer/Builder Agents" below for full context.
- **code-review:** See "Code-Review Enforcement" below (unique blocking logic).
- **review:** Spawn each reviewer from `reviewers` array. See "Review Prompts" below.
- **design-review/tech-review/product-review:** Spawn assigned reviewer. Artifact to project dir.

**After the last phase:** If any task phase produced UI changes, trigger UX verification (below).

**For research-only tasks** (`["research"]`): Also write report to `.context/reports/`.

### Code-Review Enforcement

Code-review uses the project's `reviewers` with a **fresh-context prompt** -- full file contents + diff, NO builder reasoning/design docs. Skip any reviewer who is also the builder (conflict of interest).

**The reviewer gets:**
1. Full contents of files touched by this task
2. Git diff of changes
3. Architect's `recommended_approach` from audit output
4. Contents of `.claude/skills/code-review-excellence/SKILL.md`
5. The code-review prompt below

**Code-review prompt:**
```
MODE: Independent Code Review (fresh context, no builder bias)

You are reviewing code changes with no context about builder reasoning.
You DO have the architect's recommended approach. Find bugs and flag
unjustified deviations. Assume code is broken until proven otherwise.

THE CHANGED FILES: {full file contents}
THE DIFF: {git diff output}
ARCHITECT'S RECOMMENDED APPROACH: {recommended_approach from audit}

REVIEW STEPS:
1. Read diff. Judge code on its own merits.
2. Check empty/null/error handling for every changed function/component.
3. Trace data flow end-to-end for every state change.
4. For UI changes: check loading/empty/error states.
5. For integration points: verify caller handles all return values.
6. Trace code paths with edge-case inputs.
7. REACHABILITY CHECK: For every new artifact, trace from entry point
   through routing/dispatch to verify it is actually invoked. Unreachable
   code = bug, not a style nit.

FLAG: compile/parse failures, wrong results, data flow bugs, integration
mismatches. Do NOT flag: style, potential issues, subjective improvements.

OUTPUT (JSON):
{
  "code_review_outcome": "pass | fail | critical",
  "bugs_found": [{"file", "line", "severity", "description"}],
  "approach_deviation": "none | justified | unjustified",
  "suspicious_patterns": [],
  "data_flow_issues": [],
  "reachability_check": [],
  "verdict": "1-2 sentence summary"
}
```

If `approach_deviation` is "unjustified", that alone warrants `fail`. A zero-issue review is suspicious -- double-check.

**Failure blocking:** If `code_review_outcome` = `fail` or `critical`:
1. Re-spawn builder with findings as fix instructions
2. Re-run code-review on updated diff
3. **Max 3 fix cycles.** Track bug IDs across cycles. **Convergence detection:** if the same bug (same file + same description) appears in 2 consecutive cycles, the builder cannot fix it -- escalate to a senior engineer or log as known issue and proceed to standard review. Do NOT cycle again on the same bug.
4. If all 3 cycles exhausted and still failing, log remaining findings and proceed to standard review.

### Agent Spawn Rules

**CLI spawn pattern with cleanup trap:**

```bash
CHILD_PIDS=()
cleanup_children() { for pid in "${CHILD_PIDS[@]}"; do kill "$pid" 2>/dev/null; done }
trap cleanup_children EXIT

tsx scripts/spawn-agent.ts --agent {agent-id} --prompt "prompt" --mode tracked --model sonnet --output /tmp/{agent-id}-output.txt &
CHILD_PIDS+=($!)
wait $!
```

**Agent resolution:** Use `id` from `.claude/agent-registry.json` as `subagent_type`. Personality auto-loads. Do NOT paste personality content into prompts. For role-to-ID mapping, see `reference/rules/casting-rules.md`.

**Fallback assignments:** No builder -> full-stack engineer. No auditor -> CTO. No reviewer -> QA engineer.

### Engineer/Builder Agent Context

Spawn engineer agents with:
- Task scope + `definition_of_done` from `project.json` (populated by the project-brainstorm step)
- **CEO brief** from `directive.md` -- include the full text verbatim, not paraphrased. The builder must understand the CEO's original intent, not a filtered summary.
- **Verified intent** from `directive.json` at `pipeline.clarification.output.verified_intent` (if available) -- include verbatim. This captures scope refinements and CEO corrections that post-date the original brief.
- Audit findings: active files, baseline, dead code flags
- `recommended_approach` from audit (verbatim, as guidance not mandate)
- Design output + visual-design spec (if available)
- Brainstorm output (if project had brainstorm phase -- see constraint below)
- Instruction: "If you find a better approach, explain why in your build report."

**Brainstorm constraint prompt** (prepend when project had brainstorm):

```
BRAINSTORM CONSTRAINT -- READ BEFORE WRITING ANY CODE:
{brainstorm output from project's brainstorm.md}

Before writing code, you MUST:
1. Read the brainstorm analysis
2. Include `brainstorm_alignment` in build report: what you followed,
   deviated from (and WHY), and what brainstorm missed

Missing brainstorm_alignment = review flags it.
```

**Required build report sections:**
- `proposed_improvements`: gaps, edge cases, features that should exist
- `user_walkthrough`: step-by-step CEO experience of the feature
- **Project tracking:** Update project.json after each task (status, DOD met fields, timestamps)

**Clarification prompt** (prepend when clarification phase precedes build):
```
Pre-build Q&A answers: {clarification Q&A from artifact}
Use these to guide implementation. Incorporate scope changes revealed.
```

**All agents get:** `model: "opus"`, `.context/preferences.md`, `.context/vision.md` guardrails, relevant `.context/lessons/` files per role (engineers: agent-behavior + skill-design; CTO: agent-behavior + review-quality; CPO: review-quality; COO: orchestration + review-quality; CMO: agent-behavior), relevant `.context/design/` docs (all agents get context-flow + agent-model; auditors also get verification + pipeline-architecture; COO also gets pipeline-architecture + state-and-recovery).

### UX Verification Phase (mandatory for UI work)

**When:** After build + review for any task where `active_files` match UI patterns: `*.tsx`, `*.jsx`, `*.css`, `*.scss`, `*.html`, `tailwind.config.*`, `globals.css`, or files under `pages/`, `app/`, `components/`, `layouts/`, `styles/`.

**How:** Orchestrator personally verifies via Chrome MCP (NOT delegated to subagent).

**Checklist:**
1. Navigate to every modified page/component
2. Click every clickable element -- verify no dead-end UI
3. Check data matches backend
4. Test "9am CEO workflow": dashboard -> detail -> action
5. Take screenshots as evidence

**If fails:** Fix immediately, re-verify. Do NOT skip.

**Game visual work** (active_files under `src/components/game/` with sprites/tiles/furniture/Canvas): Standard UX verification is NOT sufficient. Screenshot at multiple zoom levels, compare against quality bar, iterate with builder until visual quality matches. No maximum iterations. CEO mandate: slow is fine, ugly is not.

**CLI session (no Chrome MCP):** Log UI checks needing manual verification in digest. Directive NOT complete until UI review passes.

**Skip if:** Backend-only, research-only, no user-facing code.

### Review Prompts (mandatory for all tasks)

**Add to every reviewer prompt:**

```
STEP 1 -- USER SCENARIO WALKTHROUGH (before code quality):
Walk through: "{user_scenario}".
1. Does the build deliver this experience end-to-end?
2. Would the CEO's workflow actually improve?
3. Any dead-end UI elements?
4. Does data flow make sense end-to-end?

A build passing code review but failing user_scenario = "fail".

STEP 2 -- SECONDARY ASSESSMENT:
5. What technically works but misses the user's real need?
6. What's MISSING that the user clearly needs?

Output: "user_perspective": { "workflow_improvement": "yes|partial|no",
  "missing_features": [], "dead_ends": [], "data_integrity": [] }
```

**DOD verification** (mandatory):
```
For each definition_of_done item, verify met/not-met with evidence.
Output: "dod_verification": { "criteria": [{"criterion", "met", "evidence"}], "all_met": true }
If ANY criterion not met -> "fail". Guardrail violation -> "critical".
```

**Update project.json DOD from REVIEWER output, not builder self-assessment.**

**Brainstorm alignment check** (when project had brainstorm):
```
Check build report for `brainstorm_alignment` section. Missing = "fail".
Compare claimed alignment against actual code. Flag unjustified deviations.
Output: "brainstorm_check": { "alignment_section_present", "unjustified_deviations", "claimed_but_not_implemented" }
Skip if no brainstorm phase.
```

**CEO corrections check** (mandatory):
```
Read .context/preferences.md ## Standing Corrections. For each correction:
does this task touch it? Does implementation respect it? Violation = "critical".
Output: "corrections_check": { "corrections_reviewed": N, "violations": [] }
```

**Default-state verification** (UI tasks only -- see `scope-and-dod.md` for full rules):
```
Verify at: 100% zoom, default view (initial load), representative data.
Output: "default_state_check": { "verified_at_default_zoom", "verified_at_default_view",
  "verified_with_representative_data", "issues_found": [] }
Issue found -> "fail".
```

**Review completeness output:**
```json
{
  "review_outcome": "pass | fail | critical",
  "code_quality": {"issues": [], "severity": "none|minor|major"},
  "user_perspective": { ... },
  "dod_verification": { ... },
  "corrections_check": { ... },
  "default_state_check": { ... },
  "surfaces_checked": [],
  "what_is_missing": [],
  "regression_risks": []
}
```

**Pass requires:** ALL DOD met, ZERO corrections violations, workflow_improvement "yes" or "partial", no major code issues. **Fail if:** workflow_improvement "no" (even with clean code), ANY DOD unmet, or major code issues.

### Standard Review Fix Cycles

If `review_outcome` = `"fail"`:

1. **Re-spawn builder** with the reviewer's full output as fix instructions. Include `what_is_missing`, `dod_verification` (unmet criteria), and `user_perspective` (workflow gaps) verbatim. The builder must address every unmet DOD criterion and every "no" or "partial" workflow issue.
2. **Builder fixes** the issues and updates the build report.
3. **Re-run standard review** on the updated code (fresh reviewer context, same prompt as original review).
4. **Max 2 fix cycles.** If after 2 cycles the review still returns `"fail"`, log the remaining findings as non-fatal warnings and proceed to task completion. The findings carry forward to the digest for CEO visibility.

If `review_outcome` = `"critical"` (guardrail violation): Do NOT cycle. Log immediately and escalate -- critical issues require human intervention, not automated fix loops.

**Interaction with code-review:** Code-review fix cycles (max 3) run BEFORE standard review fix cycles (max 2). A task can go through up to 5 total fix cycles in the worst case: 3 code-review + 2 standard review. This is by design -- each review type catches different classes of issues.

Check audit findings -- if `active_files` is empty and nothing to fix, **skip the task** (status `skipped`).

**Update directive.json:** Set task `status` to `in_progress`, `current_phase` to first phase, update `pipeline.execute.output`.

### After Each Phase

- Agent fails or reports blocker: skip remaining phases for this task, log error, continue
- Standard review returns `"fail"`: trigger fix cycle (see "Standard Review Fix Cycles" below). Returns `"critical"`: escalate immediately, no fix cycle.

### After code-review Phase

Code-review findings are NOT non-fatal. Apply blocking logic based on `code_review_outcome`:

**If `"pass"`:** Proceed to the next phase (standard review) normally.

**If `"fail"` or `"critical"`:** STOP -- do NOT proceed to standard review. Execute fix cycle:

1. **Re-spawn builder** with the code-review findings as fix instructions. Include `bugs_found` and `data_flow_issues` from the review output verbatim -- these are the specific items the builder must address.
2. **Builder fixes** the identified issues and reports what was changed.
3. **Re-run code-review** on the updated diff (fresh reviewer context, same prompt as original review).
4. **Max 3 fix cycles.** After each cycle, compare `bugs_found` IDs (file + description) against previous cycles. **Convergence detection:** if the same bug appears in 2 consecutive cycles, the builder cannot fix it -- escalate to a senior engineer or log as known issue and proceed to standard review. Do NOT cycle on the same bug a third time.
5. If all 3 cycles exhausted and the code-review still returns `"fail"` or `"critical"`, log the remaining findings as non-fatal warnings and proceed to standard review.

This ensures bugs caught by code-review are addressed before the reviewer sees the code, while bounding the fix loop to prevent stalls. Convergence detection catches unfixable issues early instead of wasting all 3 cycles.

### After Each Task

Log status: completed / partial / skipped / failed.

**Update directive.json:** Task `status`, `current_phase: null`, `pipeline.execute.output`. On last task: `current_step: "review-gate"`, `pipeline.execute.status: "completed"`.

**Update project.json:** Task `status` and `dod[].met` from reviewer verification. On last task: project `status: "completed"`. Project.json is the authoritative source -- if you only update directive.json, the dashboard shows stale data.

**Artifact:** Write phase output to `.context/directives/{directive-id}/projects/{project-id}/build-{task-id}.md` or `review-{task-id}.md`. validate-gate.sh checks for these.

**After review phase:** Write reviewer's `dod_verification` to project.json task entry. MANDATORY for heavyweight directives. If reviewer omitted it, write `null` (review-gate flags this).

**Stop-on-failure:** If task ends `failed` or `partial`, mark dependent tasks as `blocked`. `skipped` and `completed` do not block.

### Failure Handling for Parallel Waves

- **Within a wave:** Parallel failures do NOT cascade. Failed task A does not affect successful task B in the same wave.
- **Across waves:** After wave completes, mark tasks in later waves with `depends_on` referencing failed tasks as `blocked`. Non-dependent tasks proceed.
- **Timeout:** 10-minute limit per parallel task. Timeout -> `failed`, other tasks unaffected.
- **Merge conflicts:** Last-write-wins on working tree. Review phase catches inconsistencies. Fix cycle re-spawns builder with current state. Wave algorithm prevents most conflicts by construction.

Collect `proposed_improvements` from build reports for the digest.

### Finalize project.json (after all tasks complete)

For multi-project plans, repeat for each project.

1. Read existing project.json
2. Update each task: `status`, `agent` (NEVER leave `[]` for completed tasks), `dod[].met` from reviewer
3. Update project-level DOD with verification results
4. Set `status: "completed"` and `completed` timestamp when all tasks done
5. If project.json missing (legacy): create from COO's plan + results, log warning
6. Update directive.json `projects` array for bidirectional linking

### Review-Gate: Review Verification (MANDATORY -- HARD GATE)

**Reviews MUST happen DURING execution, not after.** Each task's review runs immediately after its build, BEFORE the next task starts. Do NOT batch builds and skip reviews -- this is the #1 failure mode.

**Execution loop:** Build -> Review -> Fix cycle if fail -> Mark complete -> Next task.

**If reviews were skipped:** STOP and run reviews for all unreviewed tasks before continuing.

**Post-execution gate:**

```bash
# Run once per project in the directive
echo '{"directive_dir":"'"$DIRECTIVE_DIR"'","project_id":"'"$PROJECT_ID"'"}' | .claude/hooks/validate-reviews.sh
```

If `valid: false`, **STOP**. Run missing reviews first.

**Verification checklist** (for each completed/partial task):
1. Was a reviewer agent spawned (not self-review)?
2. Did reviewer produce structured output with `review_outcome`, `dod_verification`, `user_perspective`?
3. Did reviewer mark each DOD criterion (not builder self-certifying)?
4. For code-review: was a separate fresh-context review spawned?

**If any check fails:** Log `[REVIEW MISSING] {task title}` and go back to run the missing review. Do NOT proceed to finalization.

**If all pass:** Log `[REVIEWS VERIFIED] All {N} tasks have review artifacts and DOD verification`. Proceed to finalize, then wrapup.

**Update directive.json:** Set `current_step: "wrapup"` (the next step). Update `pipeline["review-gate"].status` to `"completed"` with output summary including review pass count and any unresolved findings.

**Next step:** Proceed to [10-wrapup.md](10-wrapup.md) (wrapup) for OKRs, follow-ups, digest, and lessons.
