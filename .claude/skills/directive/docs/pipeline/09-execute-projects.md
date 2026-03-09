<!-- Pipeline doc: 09-execute-projects.md | Source: SKILL.md restructure -->

## Execute: Execute Projects

### Multi-Project Execution

**For multi-project plans** (where the COO's plan produced a `projects` array): Run the ENTIRE execute step once per project, sequentially by priority tier (all P0 projects before P1). Each project has its own project.json, its own brainstorm, its own task loop, and its own review verification. Treat each project as an independent execution unit.

**Cross-project dependencies:** Projects can declare `depends_on` in the COO's plan to specify execution order. The wave analysis algorithm (below) uses `depends_on` + file overlap to compute which projects can run in parallel. Projects without `depends_on` and with no file overlap run in the same wave. Tightly coupled work that shares code dependencies should still be ONE project with ordered tasks -- use `depends_on` for genuinely separate projects where one must complete before another starts.

**For single-project plans** (flat `tasks` array): Run the execute step once for the single project.json.

### Pre-execution Gate: Validate project.json

**Before any task executes**, validate that project.json exists and has required fields (output of project-brainstorm step):

```bash
echo '{"directive_dir":"'"$DIRECTIVE_DIR"'","directive_name":"'"$DIRECTIVE_NAME"'"}' | .claude/hooks/validate-project-json.sh
```

If `valid: false`, **STOP**. Do not proceed to execution. Fix the violations first -- either create the project.json (approve step should have done this) or fill in missing fields. This is a hard gate, not a warning.

Execute each task from the project's `tasks` array **in priority order** (P0 first, then P1, then P2). Note: in a well-formed plan, all tasks should be `simple` complexity. If any are moderate/complex, the complexity floor (approve step) should have caught this and triggered re-decomposition.

### Wave Analysis (before execution loop)

Before executing tasks, compute execution waves. This is a deterministic algorithm -- no LLM involved. The orchestrator computes it from project.json tasks and audit data.

**Inputs:**
- `tasks[]` from project.json (with optional `depends_on` per task — defaults to `[]` since the brainstorm prompt does not produce it; array ordering is the primary sequencing mechanism, and file-overlap checks handle the rest)
- `active_files[]` from audit output (per task)

**Global sequential files** -- any task touching these files CANNOT run in parallel with any other task, regardless of other overlap checks:
- `package.json`, `package-lock.json` (npm)
- `tsconfig.json` (TypeScript config)
- `prisma/schema.prisma` (database schema)
- `.env*` (environment config)

**Algorithm (greedy wave computation):**

```
MAX_PARALLEL = 3  // tunable -- start conservative, increase if no rate-limit issues

function computeWaves(tasks, auditResults):
    remaining = set(all task IDs)
    completed = set()
    waves = []

    while remaining is not empty:
        eligible = []
        for task in remaining:
            // Check explicit dependencies
            if all of task.depends_on are in completed:
                eligible.append(task)

        if eligible is empty:
            // Circular dependency or unresolvable depends_on
            ERROR: "Circular dependency detected in remaining tasks"
            break

        // Within eligible tasks, group by priority tier
        // P0 eligible tasks go before P1 eligible tasks
        eligible.sort(by priority)
        currentPriority = eligible[0].priority

        // Take only the highest-priority eligible tasks
        tierEligible = eligible.filter(t => t.priority == currentPriority)

        // Within the tier, check file overlap to form parallel groups
        wave = []
        occupiedFiles = set()
        GLOBAL_SEQUENTIAL = {"package.json", "package-lock.json", "tsconfig.json",
                             "prisma/schema.prisma", ".env", ".env.*"}
        waveHasGlobalFile = false

        for task in tierEligible:
            if len(wave) >= MAX_PARALLEL:
                break  // defer remaining to next wave
            taskFiles = auditResults[task.id].active_files
            taskTouchesGlobal = taskFiles INTERSECT GLOBAL_SEQUENTIAL is NOT EMPTY

            // Global sequential files: only one task touching them per wave
            if taskTouchesGlobal and (waveHasGlobalFile or len(wave) > 0):
                continue  // defer -- can't parallelize with global file tasks
            if not taskTouchesGlobal and waveHasGlobalFile:
                continue  // defer -- wave already has a global file task

            if taskFiles INTERSECT occupiedFiles is EMPTY:
                wave.append(task)
                occupiedFiles.addAll(taskFiles)
                if taskTouchesGlobal:
                    waveHasGlobalFile = true
            else:
                // This task overlaps -- defer to next wave
                continue

        waves.append(wave)
        for task in wave:
            remaining.remove(task.id)
            completed.add(task.id)

    return waves
```

**Key properties:**

1. **Priority ordering preserved.** P0 tasks always schedule before P1, even if P1 tasks have no dependencies.
2. **File overlap prevents parallel execution.** Even if two tasks have no `depends_on` relationship, overlapping `active_files` forces them into separate waves.
3. **Greedy packing.** Each wave grabs as many non-overlapping tasks as possible (up to MAX_PARALLEL). Maximizes parallelism.
4. **Deterministic.** Same input always produces the same waves.

**Wave manifest artifact:** Write the computed waves to the project directory as `wave-manifest.json`:

```json
{
  "computed_at": "2026-03-06T10:00:00Z",
  "max_parallel": 3,
  "total_tasks": 8,
  "total_waves": 3,
  "waves": [
    {
      "wave": 1,
      "tasks": [
        { "id": "update-types", "builder": "backend-engineer-id", "priority": "P0", "active_files": ["src/types.ts"] }
      ],
      "parallel": false
    },
    {
      "wave": 2,
      "tasks": [
        { "id": "build-component-a", "builder": "frontend-engineer-id", "priority": "P0", "active_files": ["src/components/A.tsx"] },
        { "id": "build-component-b", "builder": "frontend-engineer-id", "priority": "P0", "active_files": ["src/components/B.tsx"] }
      ],
      "parallel": true
    },
    {
      "wave": 3,
      "tasks": [
        { "id": "integration-test", "builder": "qa-engineer-id", "priority": "P1", "active_files": ["tests/integration.test.ts"] }
      ],
      "parallel": false
    }
  ]
}
```

**Same builder in parallel tasks:** If a wave has two tasks both cast to the same builder (e.g., the frontend engineer), they still run in parallel as separate agent instances. Each instance gets its own scope, files, and context. The personality file makes them behave consistently, not identically.

### Wave-Based Execution Loop

Execute the computed waves sequentially. Within each wave, tasks run in parallel (if more than one).

```
for each wave in wave manifest:
    if wave has 1 task:
        execute task sequentially (build phases as normal)
    if wave has multiple tasks:
        spawn all build phases in parallel (each as CLI agent)
        wait for all builds to complete
        post-wave diff check (see below)

    // Review phase: SEQUENTIAL per task within the wave
    for each completed task in this wave:
        run code-review phase (if in task phases)
        run review phase
        if review fails -> fix cycle -> re-review

    advance to next wave
```

**Parallel builds use CLI spawns** (`tsx scripts/spawn-agent.ts`), NOT the Agent tool with `run_in_background`. Background agents get Bash permission auto-rejected. CLI sessions can use Bash. See "Agent Spawn Rules" below for the spawn pattern with CHILD_PIDS + trap cleanup.

**Reviews stay sequential per task** within each wave. Rationale:
- Reviews read the full file -- parallel reviews could see inconsistent state
- Fix cycles modify files -- sequential ensures each fixer sees current state
- Build is the bottleneck (3-10 min), not review (1-2 min)

**Post-wave diff check:** After each wave's builds complete, before starting reviews:
1. Run `git diff --name-only` to see what files were actually modified
2. Compare against the wave manifest's predicted `active_files`
3. If a task modified a file not in its `active_files`, log a warning:
   `[DRIFT] {task title} modified {file} not in predicted active_files`
4. The warning does not block -- the review phase catches inconsistencies

**Progress display format:**

```
Wave 1/3: [1 task, sequential]
  [1/8] Update types (P0, backend-engineer) -- building...
  [1/8] Update types -- completed

Wave 2/3: [2 tasks, PARALLEL]
  [2/8] Build component A (P0, frontend-engineer) -- building...
  [3/8] Build component B (P0, frontend-engineer) -- building...
  [3/8] Build component B -- completed (2m 14s)
  [2/8] Build component A -- completed (3m 01s)
  [2/8] Build component A -- reviewing...
  [3/8] Build component B -- reviewing...

Wave 3/3: [1 task, sequential]
  [4/8] Integration test (P1, qa-engineer) -- building...
```

For each task, execute its `phases` array in order. Each phase has specific agent assignments and artifact outputs.

### Phase Execution Reference

For each phase in the task's `phases` array, execute it according to these rules:

**Phase: `research`**
Spawn researcher agent (the CMO or CTO per cast) to investigate and produce findings. **Artifact:** the project directory as `research.md`.

**Phase: `product-spec`**
Spawn the CPO to write product requirements + acceptance criteria. **Artifact:** the project directory as `product-spec.md`.

**Phase: `design`**
Spawn the CTO to read the codebase and write a technical approach. Include any prior phase artifacts (research, product-spec) as context. **Artifact:** the project directory as `design.md`.

**Phase: `visual-design`**
Spawn the UI/UX designer (Quinn) to produce a visual design spec before the builder writes code. Include task scope + any prior phase artifacts (research, product-spec, design, audit findings) as context. The designer produces layout, component structure, visual spec, and interaction notes. The builder receives this as context during the build phase. **Artifact:** the project directory as `visual-design.md`.

**Phase: `keyword-research`**
Spawn the CMO to research target keywords, search intent, competitor content gaps, and recommended topics. **Artifact:** the project directory as `keyword-research.md`.

**Phase: `outline`**
Spawn the CMO to create a content outline -- structure, headings, target keywords per section, internal linking strategy. Include keyword research artifact as context. **Artifact:** the project directory as `outline.md`.

**Phase: `clarification`**
Pre-build Q&A stolen from ChatDev's dual-agent dehallucination pattern (40% error reduction). Spawn the engineer with all context (scope, design output, audit findings). Engineer outputs 3-5 specific clarifying questions about scope boundaries, edge cases, integration points, and ambiguous requirements. Spawn the designer/auditor from the previous phase to respond. **Artifact:** the project directory as `clarification.md`.

**Phase: `build`**
Spawn engineer agent(s) with task scope + all prior phase artifacts + audit findings. For migration tasks (phases include research + design + build), the build is INCREMENTAL: engineer executes one step at a time. **Artifact:** the project directory as `build.md`.

**Phase: `draft`**
Spawn engineer agent to write the actual content (MDX files, page components) following the outline artifact. **Artifact:** the project directory as `draft.md`.

**Phase: `seo-review`**
Spawn the CMO to review the draft for SEO quality -- meta tags, keyword density, structured data, internal links, readability. **Artifact:** the project directory as `seo-review.md`.

**Phase: `code-review`** (independent review with fresh context -- inspired by [Anthropic's official code-review plugin](https://github.com/anthropics/claude-code/tree/main/plugins/code-review))

Spawn the reviewer(s) from the project's `reviewers` array -- the SAME agents the COO assigned, but with a **fresh-context prompt** that strips all builder reasoning. They get full file contents + diff but NO design docs, scope, or builder intent. This is NOT hardcoded to any specific agent. If the builder IS one of the reviewers (conflict of interest), skip that reviewer for this phase.

The reviewer gets:
1. The **full contents** of files touched by this task (so they can see surrounding context)
2. The **git diff** highlighting what changed
3. The architect's **recommended approach** (from audit output -- so they can spot unjustified deviations)
4. The contents of `.claude/skills/code-review-excellence/SKILL.md` -- read this file and include it as review methodology guidance
5. The code-review prompt below

They do NOT get: design docs, scope description, builder reasoning, or prior phase artifacts. The one exception: they DO get the architect's `recommended_approach` (a brief implementation spec from the audit). This lets them flag cases where the builder ignored the architect's guidance without justification. The fresh-eyes benefit comes from not knowing the builder's intent, not from being blind to surrounding code or the implementation spec.

Code-review prompt (given to each reviewer):
```
MODE: Independent Code Review (fresh context, no builder bias)

You are reviewing code changes. You have no context about the builder's reasoning or intent.
You DO have the architect's recommended approach (the implementation spec the builder was given).
Your job is to find bugs and flag unjustified deviations from the spec. Assume the code is broken until proven otherwise.

THE CHANGED FILES (full contents):
{full file contents for each file touched by this task}

THE DIFF (what changed):
{output of `git diff` for files touched by this task}

ARCHITECT'S RECOMMENDED APPROACH:
{recommended_approach from audit output -- the implementation spec the builder was given as context}

REVIEW STEPS:
1. Read the diff. Judge the code on its own merits -- no design doc, no scope, no intent.
2. For every function/component changed: does it handle empty/null/error cases?
3. For every state change: trace the data flow end-to-end. Where does it come from? Where does it go? Can it be stale?
4. For every UI change: what happens if data is loading? Empty? Error? What does the user see at each state?
5. For every integration point: does the caller handle all return values? Are error paths covered?
6. Trace code paths manually -- call functions with edge-case inputs in your head.
7. REACHABILITY CHECK (mandatory): For every new artifact (component, endpoint, handler, config option, state field, command), trace its reachability: what user action or system event triggers it -> through what layers -> to what outcome. "Code exists" is NOT "code is reachable." Trace from entry point through every mapping/routing/dispatch layer to verify the new code is actually invoked. Report anything unreachable as a bug -- dead code that was supposed to be live is a wiring failure, not a style nit.

CRITICAL: We only want HIGH SIGNAL issues. Flag issues where:
- The code will fail to compile or parse
- The code will definitely produce wrong results
- Clear data flow bugs (stale state, missing null checks on paths that will hit null)
- Integration mismatches (caller expects X, callee returns Y)

Do NOT flag: style concerns, potential issues that depend on specific inputs, subjective improvements.

OUTPUT (JSON):
{
  "code_review_outcome": "pass | fail | critical",
  "bugs_found": [{"file": "...", "line": "...", "severity": "high|medium|low", "description": "..."}],
  "approach_deviation": "none | justified | unjustified -- did the builder follow the architect's recommended approach? If not, does the code suggest a valid reason?",
  "suspicious_patterns": ["things that smell wrong but you can't prove are bugs"],
  "data_flow_issues": ["stale data, race conditions, missing validation"],
  "reachability_check": ["for each new artifact: 'ArtifactName: entry_point -> layer1 -> layer2 -> outcome -- REACHABLE' or 'ArtifactName: UNREACHABLE -- no user action/system event invokes it'"],
  "verdict": "1-2 sentence summary -- would you ship this?"
}

If `approach_deviation` is "unjustified" (builder ignored the architect's spec without apparent reason), this alone warrants `code_review_outcome: "fail"` -- it signals the builder satisficed rather than engaging with the problem.

A review that finds zero issues is SUSPICIOUS. Real code changes almost always have at least one edge case worth noting. Double-check before reporting all-clear.
```

This phase is separate from the standard `review` phase. `code-review` catches bugs through fresh eyes; `review` checks DOD compliance and user perspective. Both are valuable for different reasons.

**When to include `code-review`:** The COO includes it when the task touches integration points (data flows, state management, API boundaries) or has >3 DOD criteria. Skip for trivial fixes. Pattern: `["build", "code-review", "review"]`.

**Artifact:** the project directory as `code-review.md`.

**Phase: `review`**
For each reviewer in the project's `reviewers` array, spawn the reviewer agent to review the changes. Collect all review JSONs. If ANY reviewer returns "critical", trigger the retry logic. **Artifact:** the project directory as `review.md`.

**Phase: `design-review`**
Spawn the UI/UX designer to review the UI implementation against the design spec (`visual-design.md`). Evaluates layout fidelity, visual consistency, usability, responsiveness, and polish. **Artifact:** the project directory as `design-review.md`. Include this phase for any UI-touching task.

**Phase: `tech-review`**
Spawn the CTO to review code quality + architecture. **Artifact:** the project directory as `tech-review.md`.

**Phase: `product-review`**
Spawn the CPO to verify it meets the product spec. **Artifact:** the project directory as `product-review.md`.

**After the last phase:** If any task phase produced UI changes, trigger UX verification (see "UX Verification Phase" below).

**For research-only tasks** (phases = `["research"]`): After the research phase, write the report to `.context/reports/` as well.

### Agent Spawn Rules

> **Process cleanup:** When spawning CLI agents (`tsx scripts/spawn-agent.ts`), track child PIDs so they get killed if the directive session exits unexpectedly. Without this, orphaned agent processes accumulate and saturate API rate limits.

**CLI spawn pattern with cleanup trap:**

```bash
# Set up cleanup trap ONCE at the start of execute step
CHILD_PIDS=()
cleanup_children() {
  for pid in "${CHILD_PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
}
trap cleanup_children EXIT

# For each CLI spawn, track the PID:
tsx scripts/spawn-agent.ts --agent {agent-id} --prompt "prompt" --mode tracked --model sonnet --output /tmp/{agent-id}-output.txt &
CHILD_PIDS+=($!)
wait $!
```

If the session gets killed (context limit, timeout, user cancels), the trap fires and kills all child processes. No more zombies.

**All named agents** (C-suite and specialists): Use the agent's `id` from `.claude/agent-registry.json` as the `subagent_type`. The personality file is auto-loaded by the agent system. Do NOT manually paste personality file contents into the prompt -- just use the named type.

Available `subagent_type` values are the `id` fields from the agent registry. Resolve roles to IDs by reading the registry at runtime:
- **C-suite**: CTO, CPO, CMO, COO
- **Specialists**: frontend engineer, UI/UX designer, backend engineer, data engineer, content builder, QA engineer, full-stack engineer

Specialists receive engineer-style instructions (scope, DOD, audit findings) in their task prompt -- the personality is already loaded via the type.

**Fallback assignments** (when no specific specialist is assigned):
- No specific builder assigned -> use the full-stack engineer (handles broad/cross-domain scope)
- Unnamed auditor (no named auditor assigned) -> use the CTO (handles unassigned audits)
- Unnamed reviewer (no named reviewer assigned) -> use the QA engineer (handles unassigned reviews)

All agents are named agents with personality files. There are no generic role agents.

**Engineer/builder agents** (any specialist or the full-stack engineer): Spawn with:
- Task scope (from the COO's plan)
- Task definition_of_done (from the COO's plan) -- the engineer must know acceptance criteria BEFORE building
- Audit findings (from audit step): active file list, baseline, dead code flags
- **Recommended approach** (from the architect's audit output) -- include the `recommended_approach` field verbatim as implementation context. This is guidance, not a mandate -- the builder can deviate if they discover a better path during implementation, but they should note deviations in their build report.
- Design output (if available from earlier phases)
- **Visual design spec** (if `visual-design.md` exists in the project directory -- the UI/UX designer's pre-build design from the `visual-design` phase). Include the full contents as the visual spec for the builder to follow.
- Brainstorm output (if this task's project had a brainstorm phase -- see brainstorm constraint below)
- Instruction: "The architect's recommended approach is provided as context. Use it as your starting point -- it's based on real codebase investigation. If you find a better approach during implementation, go with it but explain why in your build report."

**Brainstorm constraint prompt** (when the project had a brainstorm phase -- prepend to the engineer's build prompt):

```
BRAINSTORM CONSTRAINT -- READ BEFORE WRITING ANY CODE:

The team brainstormed this task's approach before you were assigned. Their analysis is below.

{brainstorm output from the project's brainstorm.md}

Before writing any code, you MUST:
1. Read the brainstorm analysis above
2. In your build report, include a `brainstorm_alignment` section that states:
   - Which brainstorm recommendations you followed
   - Which you deviated from and WHY
   - What the brainstorm missed that you discovered during implementation

This is not optional. If your build report has no `brainstorm_alignment` section, the review will flag it.
```

This forces the builder to engage with the brainstorm output rather than ignoring it. The reviewer can then check whether deviations were justified.

- **Task instruction**: "After completing the build, report BOTH what you built AND what you think is still missing or broken. List specific follow-ups you'd propose -- gaps in the UX, edge cases not covered, related features that should exist but don't. This is not optional -- every build report must include a `proposed_improvements` section."
- **User-perspective instruction**: "Before reporting completion, mentally walk through the feature as if you are the CEO using it for the first time. Ask yourself: Can I click this? Where does it go? Does the number match reality? Is anything a dead end? Include a `user_walkthrough` section in your build report describing what the CEO would experience step-by-step."
- **Project tracking instruction**: "After completing each task, update the project.json file. Set the task's `status` to `completed` and each of its `dod` items to `met: true` for criteria you verified. When ALL tasks are done, set the project-level `status` to `completed` and update project-level `dod` items. Also update the `updated` timestamp. This is how the dashboard tracks progress -- if you skip this, the project shows 0% complete despite being done."

**Engineer clarification prompt** (for complex processes only -- prepend to the engineer's build prompt when a clarification phase precedes the build):

```
Before building, you reviewed the scope and design and asked clarifying questions. Here are the answers:

{clarification Q&A from the clarification phase artifact}

Use these clarifications to guide your implementation. If the answers revealed scope changes or additional requirements, incorporate them.
```

**All agents** get:
- `subagent_type`: the agent's named type (see above) -- always use a named agent, never generic types
- `model: "opus"`
- `.context/preferences.md` -- CEO standing orders
- `.context/vision.md` guardrails section -- hard constraints
- `.context/lessons/` topic files (load only what's relevant to the agent's role):
  - **Engineers**: `.context/lessons/agent-behavior.md` + `.context/lessons/skill-design.md`
  - **CTO (auditor/reviewer)**: `.context/lessons/agent-behavior.md` + `.context/lessons/review-quality.md`
  - **CPO (product reviewer)**: `.context/lessons/review-quality.md`
  - **COO (process reviewer)**: `.context/lessons/orchestration.md` + `.context/lessons/review-quality.md`
  - **CMO (content/growth)**: `.context/lessons/agent-behavior.md`

### UX Verification Phase (mandatory for UI work)

**When:** After the build + review phases complete for any task where the audit's `active_files` list contains files matching UI patterns: `*.tsx`, `*.jsx`, `*.css`, `*.scss`, `*.html`, `tailwind.config.*`, `globals.css`, or files under `pages/`, `app/`, `components/`, `layouts/`, or `styles/` directories. This is NOT a subjective judgment call -- if the file patterns match, UX verification is REQUIRED.

**How:** The orchestrator (you) must personally verify the changes work from the CEO's perspective using browser automation tools (mcp__claude-in-chrome__*). This is NOT delegated to a subagent -- Chrome MCP tools only work in the main session.

**UX verification checklist:**
1. Navigate to every page/component that was modified
2. Click every clickable element -- verify it does something useful (no dead-end UI)
3. Check that data displayed matches the backend (numbers, counts, lists)
4. Test the "9am CEO workflow": open dashboard -> see what happened -> click into detail -> know what to do
5. Take screenshots as evidence

**If UX verification fails:** Fix the issues immediately (spawn another engineer if needed), then re-verify. Do NOT skip to the next task with broken UI.

**Visual feedback loop (MANDATORY for game visual work):** When the directive touches game visual rendering (check if active_files include paths under `src/components/game/` that involve sprites, tiles, furniture, or Canvas drawing), the standard UX verification is NOT sufficient. Instead:
1. After the build phase, take screenshots of the game at multiple zoom levels (1x, 2x, 4x)
2. Compare visually against the quality bar in `.context/directives/game-visual-quality-overhaul/` context
3. If the visual quality doesn't match the reference repos (pixel-agents, claw-empire), spawn the builder again with the screenshot and specific feedback ("the desk needs wood grain texture", "the character needs more detail in the hair", etc.)
4. Iterate until the visual quality matches. There is no maximum iteration count -- keep going until it looks right.
5. This applies to every visual change, not just the first build.

This is a CEO mandate. Slow is fine. Ugly is not.

**Skip UX verification if:** The task is backend-only, research-only, or doesn't touch any user-facing code.

**When running as a CLI session (no Chrome MCP):** Log the UI checks that need manual verification in the directive digest. The CEO can run them from the dashboard or game UI. The directive is NOT complete until UI review passes.

### User-Perspective Review (mandatory for all tasks)

Separate from code review. The reviewer evaluates the work from the end-user's perspective FIRST, then assesses code quality. A build that passes code review but fails user_scenario verification is a "fail" outcome. The user experience is the acceptance criterion, not the code quality.

**Add to every reviewer prompt (user_scenario and DOD verification come FIRST):**

```
PRIMARY REVIEW ACTIVITY -- user_scenario verification and DOD check:

STEP 1 -- USER SCENARIO WALKTHROUGH (do this BEFORE looking at code quality):
Walk through the task's `user_scenario`: "{user_scenario from the COO's plan}".
1. Does the build actually deliver this experience end-to-end?
2. If this were shipped today, would the CEO's workflow actually improve?
3. Are there dead-end UI elements (clickable-looking things that do nothing)?
4. Does the data flow make sense end-to-end (not just "does the component render")?

A build that passes code review but fails user_scenario verification is a
"fail" outcome. The user experience is the acceptance criterion, not the
code quality.

STEP 2 -- SECONDARY ASSESSMENT (after user_scenario passes):
5. What did the engineer build that technically works but misses the user's real need?
6. What's MISSING that the directive didn't ask for but the user clearly needs?

Include a `user_perspective` section in your review JSON:
{
  "user_perspective": {
    "workflow_improvement": "yes | partial | no -- does this actually help the user?",
    "missing_features": ["things the user needs but weren't built"],
    "dead_ends": ["UI elements that look interactive but aren't"],
    "data_integrity": ["data that displays but doesn't match reality"]
  }
}
```

**DOD verification** (mandatory if task has definition_of_done):

```
DEFINITION OF DONE VERIFICATION -- check EVERY criterion:
For each item in this task's definition_of_done array, verify whether it has been met.

Include a `dod_verification` section in your review JSON:
{
  "dod_verification": {
    "criteria": [
      {"criterion": "the DOD text", "met": true, "evidence": "what you observed that confirms/denies this"}
    ],
    "all_met": true
  }
}

If ANY criterion is not met, set review_outcome to "fail". If a criterion violation would breach a guardrail (SEO, security, data integrity), set review_outcome to "critical".
```

**Brainstorm alignment check** (mandatory when task had a brainstorm phase):

```
BRAINSTORM ALIGNMENT CHECK:
If this task's project had a brainstorm phase, the builder was required to include a `brainstorm_alignment` section in their build report.

1. Does the build report include a `brainstorm_alignment` section? If not, flag as "fail".
2. Read the brainstorm output (provided below) and compare against the builder's claimed alignment.
3. Did the builder deviate from brainstorm recommendations? If so, is the deviation justified by what the code actually does?
4. Did the builder claim to follow a recommendation but the code doesn't reflect it?

Include a `brainstorm_check` section in your review JSON:
{
  "brainstorm_check": {
    "alignment_section_present": true,
    "unjustified_deviations": ["list any deviations not justified by the code"],
    "claimed_but_not_implemented": ["recommendations builder said they followed but didn't"]
  }
}

Skip this check if the task had no brainstorm phase.
```

**CEO corrections check** (mandatory for all reviews):

```
CEO CORRECTIONS CHECK -- MANDATORY:
Read .context/preferences.md (specifically the ## Standing Corrections section). For each standing correction:
1. Does this task's work touch anything related to this correction?
2. If yes, does the implementation respect the correction?
3. If it violates a correction, this is automatically review_outcome: "critical".

Include a `corrections_check` section in your review JSON:
{
  "corrections_check": {
    "corrections_reviewed": 4,
    "violations": []
  }
}
```

**Default-state verification** (mandatory for tasks touching UI files):

```
DEFAULT-STATE VERIFICATION -- required when active_files include *.tsx,
*.jsx, *.css, components/, or pages/. Skip for backend-only tasks.

Verify the build at these default conditions:
1. Default browser zoom (100%) -- not zoomed in or out
2. Default view (no filters applied, no special navigation, initial load)
3. Representative data (not empty state, not extreme/edge-case data)

A panel that looks correct at 150% zoom but clips content at 100% would
be caught by this check. The zoom < 2 threshold that hid all labels and
icons at default zoom is exactly the class of bug this prevents.

Include a `default_state_check` section in your review JSON:
{
  "default_state_check": {
    "verified_at_default_zoom": true,
    "verified_at_default_view": true,
    "verified_with_representative_data": true,
    "issues_found": []
  }
}

If any default-state issue is found, set review_outcome to "fail".
```

**Review completeness** (mandatory for all reviews):

```
REVIEW COMPLETENESS -- use this structured output:
{
  "review_outcome": "pass | fail | critical",
  "code_quality": {"issues": [], "severity": "none | minor | major"},
  "user_perspective": { ... },
  "dod_verification": { ... },
  "corrections_check": { ... },
  "default_state_check": { "... (include for UI tasks, omit for backend-only)" },
  "surfaces_checked": ["list every file, endpoint, UI surface, or data flow you actually inspected"],
  "what_is_missing": ["things the directive asked for that aren't present in the build"],
  "regression_risks": ["existing functionality that could break from these changes"]
}

A review_outcome of "pass" requires: ALL DOD criteria met, ZERO corrections violations, user_perspective.workflow_improvement is "yes" or "partial", and no major code quality issues.

A review_outcome of "fail" if ANY of: user_perspective.workflow_improvement is "no" (even with clean code), ANY DOD criterion not met, or major code quality issues. workflow_improvement "no" is sufficient for "fail" on its own -- the user experience is the acceptance criterion.
```

**This is NOT optional.** Every review must include user-perspective evaluation. A review that only checks code quality but ignores user experience is incomplete.

Check the audit findings for this task. If `active_files` is empty and findings indicate nothing to fix, **skip the task** -- set status to `skipped` and continue to the next. Log: `[N/M] {title} -- skipped (audit found nothing to fix)`.

**Update directive.json:** Update this task's `status` to `"in_progress"` and `current_phase` to the first phase. Update `pipeline.execute.output` with current progress.

### After Each Phase

- If an agent fails or reports a blocker: **skip remaining phases for this task**, log the error, continue to next task
- If a **standard review** finds issues: **log them as non-fatal findings** (don't block). Include in digest.

### After code-review Phase Specifically

Code-review findings are NOT non-fatal. The code-review phase exists to catch bugs the builder missed -- ignoring its findings defeats the purpose.

- If `code_review_outcome` is `"fail"` or `"critical"`: **trigger a fix cycle** before proceeding to the standard `review` phase:
  1. Re-spawn the builder with the code-review findings as fix instructions (bugs_found, data_flow_issues)
  2. Re-run the code-review with the updated diff
  3. Maximum 1 fix cycle per task -- if still failing after retry, log findings and proceed to standard review (which will likely also catch them)
- If `code_review_outcome` is `"pass"`: proceed to the next phase normally

**Artifact:** Write the phase output to the directive's project directory: `.context/directives/{directive-id}/projects/{project-id}/build-{task-id}.md` (for build phase) or `review-{task-id}.md` (for review phase). The validate-gate.sh script checks for these files at step boundaries.

**Update directive.json:** Update the task's `phases_completed`, `current_phase`, and `artifact_paths`. Set `current_step: "execute"`.

**After the review phase specifically:** Also write the reviewer's `dod_verification` output to the task entry in directive.json. This is MANDATORY for heavyweight/strategic directives -- the review-gate checks this field. If the reviewer's JSON output includes a `dod_verification` section, copy it into `tasks[].dod_verification`. If the reviewer did not include `dod_verification`, write `null` (the review-gate will flag this as a violation).

### Conditional Retry (review_outcome = critical)

If ANY reviewer returns `review_outcome: "critical"`, attempt ONE retry:
1. Re-spawn the engineer with the critical reviewer's issues as fix instructions
2. Re-run ONLY the reviewer(s) that returned "critical" -- don't re-run reviewers that already passed
3. If still critical after retry, mark task as `partial` and continue

Maximum 1 retry per task. If all reviewers passed or got non-critical issues, no retry.

**What constitutes "critical":**
- Any DOD criterion not met that relates to a guardrail (SEO, security, data integrity)
- Any Standing Correction violation
- Security vulnerability introduced by the build
- Data loss or corruption risk
- Build that's fundamentally wrong approach (not just missing polish)

**What is NOT critical (just "fail"):**
- DOD criteria not met but no guardrail impact
- Missing edge case handling
- Code quality issues (naming, complexity, duplication)
- Incomplete coverage of scope (partial work)

### After Each Task

Log completion status: completed / partial / skipped / failed.

**Update directive.json:** Update the task's `status` to its final value (`completed`, `partial`, `skipped`, or `failed`). Set `current_phase: null`. Update `pipeline.execute.output` with overall progress. If this is the last task, set `current_step: "review-gate"` and `pipeline.execute.status` to `"completed"`.

**Update project.json:** ALSO update the project's `project.json` file for this task. Set the task's `status` to its final value (`completed`, `partial`, `skipped`, `failed`, or `blocked`). Update each DOD item's `met` field to reflect the reviewer's verification. If this is the last task and all tasks are completed, set the project-level `status` to `completed`. The project.json is the authoritative source of truth for task completion — if you only update directive.json, the dashboard will show stale project data and the stalled-directive detector may not recognize that work is done.

**Stop-on-failure for dependent tasks:** If a task ends with `failed` or `partial` status, check which later tasks depend on it (via `depends_on` or array position). Mark those dependent tasks as `blocked`. Non-dependent tasks proceed normally. Log: `[BLOCKED] {task title} blocked by {failed task title} ({status})`.

- `failed` -> block dependents. The task didn't produce working code.
- `partial` -> block dependents. Known critical issues survived retry -- dependent tasks would inherit the bugs.
- `skipped` -> continue. Audit found nothing to fix -- not a failure.
- `completed` -> continue.

### Failure Handling for Parallel Waves

Extends the stop-on-failure rules above for wave-based execution.

**Within a wave (parallel tasks):** Parallel task failures do NOT cascade within the same wave. If task A fails and task B succeeds (both in wave 2):
- Task A is marked `failed`
- Task B proceeds to review normally
- The wave is considered partially complete

**Across waves:** After a wave completes, check which tasks in LATER waves have `depends_on` references to failed tasks:
1. Mark dependent tasks as `blocked`
2. Non-dependent tasks in later waves proceed normally
3. The pipeline does NOT stop entirely -- only the dependency chain of the failed task is blocked

Example:
```
Wave 1: [task-1 (SUCCESS), task-2 (FAILED)]
Wave 2: [task-3 depends_on task-1, task-4 depends_on task-2]
-> task-3 runs normally, task-4 is blocked
```

**Timeout handling:** Each parallel task gets a 10-minute timeout. If a task times out:
- Kill the process (`kill $PID`)
- Mark as `failed`
- Log: `[TIMEOUT] {task title} -- exceeded 10m, marked failed`
- Other parallel tasks in the wave are NOT affected

**Merge conflict recovery:** All parallel tasks work on the same working tree. If two tasks modify the same file (audit missed the overlap):
1. Last-write-wins on the working tree -- the second task's changes overwrite the first
2. The review phase catches inconsistencies -- the reviewer sees the full file including modifications from both tasks
3. If the reviewer flags a conflict, the fix cycle re-spawns the builder with the current file state
4. Worst case: one task's changes need re-application -- a single re-build, not a cascade

This is acceptable because the wave algorithm prevents most conflicts by construction (file overlap check), and reviews catch the rest.

Collect `proposed_improvements` from the engineer's build report. These are ideas the builder had while working -- features that should exist, edge cases not covered, UX gaps. Include them in the digest and present to the CEO in the wrapup step.

### Finalize project.json (after all tasks complete)

The project.json was created in the approve step (after CEO approval) with tasks in `pending` status. Now finalize it with execution results.

**For multi-project plans:** Repeat this finalization for EACH project's project.json. Multi-project plans create separate project directories at `.context/directives/{directive-id}/projects/{project-id}/` -- finalize each one independently.

1. **Read the existing project.json** -- for single-project plans: `.context/directives/{directive-id}/projects/{directive-name}/project.json`. For multi-project plans: `.context/directives/{directive-id}/projects/{project-id}/project.json` (one per project)

2. **Update each task** with execution results:
   - `status`: `"completed"` | `"failed"` | `"partial"` | `"skipped"` | `"blocked"` based on task outcome
   - `agent`: array of agent names who performed the work (from the cast -- NEVER leave as `[]` for completed tasks)
   - `dod`: update each criterion's `met` from the reviewer's `dod_verification` output

3. **Update project-level DOD criteria** with verification results:
   - `met`: true/false based on reviewer's `dod_verification` output

4. **Update project status**: if all tasks completed, set `"status": "completed"` and `"completed": "{current ISO timestamp}"`. Do NOT leave as `"in_progress"` when all work is done.

5. **If project.json doesn't exist** (legacy directive or pipeline error): create it from scratch using the COO's plan + execution results. Log a warning -- this should not happen if the approve step ran correctly.

6. **For each completed task, also update directive.json:**
   - Add `goal-id/project-id` to `produced_projects` array

This ensures bidirectional links: project -> directive (via `source_directive`) and directive -> project (via `produced_projects`).

### Review-Gate: Review Verification (MANDATORY -- HARD GATE)

**Reviews MUST happen DURING execution, not after.** Each task's review phase runs immediately after its build phase, BEFORE the next task starts. The orchestrator MUST NOT batch all builds first and skip reviews -- that is the #1 failure mode (see Phase 3 post-mortem in lessons/agent-behavior.md).

**Execution loop for each task:**
1. Build phase -> spawn builder
2. Review phase -> spawn reviewer(s) from cast -- THIS IS NOT OPTIONAL
3. Fix cycle if review fails -> re-spawn builder with findings
4. Mark task complete only after review passes
5. Next task

**If the orchestrator realizes it skipped reviews after building multiple tasks**, it MUST stop and run reviews for all completed-but-unreviewed tasks before continuing. Do NOT finalize project.json until reviews are done.

**Post-execution hard gate -- run BEFORE finalizing project.json:**

```bash
echo '{"directive_dir":"'"$DIRECTIVE_DIR"'","directive_name":"'"$DIRECTIVE_NAME"'"}' | .claude/hooks/validate-reviews.sh
```

If `valid: false`, **STOP**. Do not finalize. Run the missing reviews first.

**Manual verification checklist** (the orchestrator must confirm each):

For each task that has status `completed` or `partial`:

1. **Was a reviewer agent spawned?** -- not "did I read the code myself" but "did I spawn the named reviewer from the cast"
2. **Did the reviewer produce a structured review output?** -- with `review_outcome`, `dod_verification`, `user_perspective` sections
3. **Did the reviewer's DOD verification mark each criterion?** -- not the builder self-certifying, not the orchestrator rubber-stamping
4. **For code-review phases: was a separate fresh-context review spawned?** -- builder != reviewer

**If any check fails:**
- Log which task is missing reviews: `[REVIEW MISSING] {task title} -- no review / no DOD verification`
- **Do NOT proceed to finalization.** Go back and run the missing review phase for that task.
- If the review was skipped because the build failed, that's acceptable -- log it and continue.

**If all checks pass:**
- Log: `[REVIEWS VERIFIED] All {N} tasks have review artifacts and DOD verification`
- Proceed to finalize project.json, then wrapup.
