# Lessons: Orchestration Patterns

> How to coordinate agents, sequence work, manage resources.
> Relevant to: Morgan (planning), orchestrator (execution)

## Scoping Philosophy

- **With AI agents, "do it all in one go" beats incremental scoping.** Human teams need phased delivery because humans get tired, context-switch, and have limited hours. AI agents don't. Deferring work to "follow-up directives" creates tech debt that gets lost between sessions. If the decision is made, execute the full decision — don't carve off pieces for later.
- **Deferred follow-ups get lost.** The Option B goal structure directive shipped goal.json but deferred backlog.json and feature.json to "follow-up." No follow-up directive was ever created. The remaining work was buried in an "Agent-Proposed Improvements" section of a report nobody re-read. If it's part of the decision, it's part of the directive.
- **Sarah's technical opinions on data architecture carry extra weight.** When the CTO says "single source of truth — don't create a hybrid," that's a technical constraint, not a preference. Morgan's pragmatic scoping instinct is good for prioritization but should not override Sarah's architectural non-negotiables. If Sarah says "the hybrid is the worst outcome," don't ship half the migration and call it done.

## Project Decomposition (learned from Phase 3 failure)

- **ALL tasks must be `simple`. Moderate = decompose, not escalate.** If Morgan classifies something as moderate, she must decompose it into 2-3 simple tasks. Only genuinely complex work (can't be broken into simple parts -- e.g., requires architectural decisions, multiple valid approaches, cross-system integration) becomes its own project with brainstorm. The decomposition IS Morgan's planning work. Phase 3 had 9 "moderate" tasks treated as single units; most shipped broken because builders satisficed.
- **Dependent tasks belong in ONE project -- array order IS the dependency mechanism.** Within a project, array order controls task sequencing. Cross-project dependencies use the `depends_on` field in Morgan's plan (project-level). If task B depends on task A's output (shared code, shared data structures, one builds on the other), they MUST be in the same project as ordered tasks. Separate projects are only for genuinely independent work that could execute in parallel. The char-identity directive originally split into 3 projects (nameplates, status icons, personality) but these all depended on the same bitmap font + renderer -- merged into 1 project with 9 ordered tasks.
- **Mechanical complexity floor prevents optimistic classification.** Morgan (an LLM) is optimistic about complexity. After the audit, enforce: >5 active files = NOT simple (re-spawn Morgan to decompose), >10 active files or >2 directories = genuinely complex (needs own project with brainstorm). This uses audit data as ground truth, not LLM judgment.
- **Brainstorm output must mechanically flow to builder (complex projects only).** Builder gets a "brainstorm constraint" prompt requiring a `brainstorm_alignment` section in the build report — which recommendations they followed, which they deviated from and why. Without this, brainstorm is ceremony the builder ignores.
- **Independent code review catches integration bugs — and must block on failure.** The code-review phase uses cast reviewers with full file contents but no builder reasoning. Code-review "fail" triggers a fix cycle (re-spawn builder, re-review) before proceeding to standard review. Without blocking, bugs get detected then shipped anyway.
- **Code-reviewer gets full files + diff, not diff-only.** Diff-only prevents the reviewer from seeing whether changes interact correctly with surrounding code. The fresh-eyes benefit comes from stripping builder intent, not from hiding context.
- **"It compiles" is not "it works" — so don't pretend it is.** Phase 3 data-binding passed type-check and build but was completely broken at runtime. The `verify` field was removed from Morgan's plan schema because `npm run type-check` gave false confidence. Real verification is code-review (catches logic bugs) + Chrome MCP visual testing (catches UI bugs). Don't substitute compilation for correctness.

## Planning & Sequencing

- **Strategic planning should be separate from codebase scanning.** Morgan (COO) plans WHAT and WHO. The auditor scans WHERE and HOW. Mixing them produced a 97K token, 218s planning phase. Splitting reduced it to 41K tokens, 15s for Morgan + separate audit.
- **Group tasks by auditor to save tokens.** If 3 tasks all need Sarah to audit, send them in one agent call, not three.
- **Technical audit prevents wasted build cycles.** The audit found 2/3 KRs already achieved before any build work started. Without the audit, we'd have spawned engineers to fix problems that don't exist.
- **Combine tasks that modify the same file.** Checkpoint writing and artifact persistence both modify SKILL.md. Running them as separate agents risks merge conflicts. Combining into one agent with clear scope boundaries avoids this.
- **Large directives (5+ tasks, 2+ codebases) benefit from compressed phases.** Combined design+build for task-1 and task-2 instead of separate design->build->review. Saved ~2 agent round trips without quality loss -- the audit findings provided enough design context.

## Execution Attitude

- **"Do everything" means KEEP GOING until verified, not stop at the report.** The CEO expects continuous autonomous execution: build -> verify visually -> review -> find gaps -> fix -> iterate. The digest is a checkpoint, not a finish line. If the CEO is asleep, that's MORE reason to keep working, not less.
- **Agent-conductor is a safe playground — go wild.** Dashboard changes are isolated (separate repo, no production impact). Don't classify dashboard work as high-risk. SKILL.md updates for the conductor's own orchestration layer are medium-risk at most — just do them.
- **Always verify with Chrome MCP after building UI.** Building without visual testing is shipping untested code. Take screenshots, find issues, fix them in a loop.
- **After building, spawn reviewers to find gaps.** Sarah for code quality, Marcus for UX, then fix what they find. Don't stop after one pass.

## Parallel Execution Patterns

- **Wave-based execution is now the default.** The pipeline computes execution waves from `depends_on` + `active_files` overlap after the audit. Tasks with no dependencies and no file overlap run in parallel within the same wave. Reviews stay sequential post-wave. See 09-execute-projects.md for the full algorithm.
- **CLI spawns are the primary parallel build primitive.** `claude -p --agent {name}` with CHILD_PIDS + trap cleanup. Agent tool background agents can't use Bash (permission auto-rejected) — only use them for research/review. `/batch` is for mechanical mass changes only (each unit gets its own PR). Agent teams are PARKED — teammates go idle without processing messages when spawned from within existing sessions.
- **Global sequential files force solo waves.** Tasks touching package.json, tsconfig.json, prisma/schema.prisma, or .env* cannot run in parallel with any other task — working tree contention causes corruption. The wave algorithm enforces this.
- **Parallelism is safe ONLY when active_files don't overlap.** Two tasks touching the same file will cause merge conflicts or overwrites. The audit's `active_files` array is the source of truth for overlap detection.
- **Always group by priority tier first — never run P1 in parallel with P0.** Priority ordering exists for a reason (P0 may establish patterns that P1 depends on). Parallelism is only within-tier.
- **Failed tasks block dependents only, not the whole pipeline.** After a wave completes, check `depends_on` references to failed tasks. Block dependent tasks, let non-dependent tasks proceed.
- **Post-wave diff check catches audit misses.** Run `git diff --name-only` after each wave and compare against predicted active_files. Log drift warnings — the review phase catches actual conflicts.
- **Collection pattern: spawn all -> TaskOutput each -> aggregate results.** Use `run_in_background: true` for each parallel agent, then collect with TaskOutput per agent ID. Same pattern applies to brainstorm and challenge phases.
- **Timeout: 10 minutes per task before marking failed.** Long-running agents may be stuck. Don't wait indefinitely -- mark as failed and continue.
- **Brainstorm and challenge agents are always parallel.** These are lightweight, independent, advisory calls. Use `run_in_background: true` + collect pattern. Failed brainstorm/challenge agents never block the pipeline.
- **`depends_on` exists at two levels.** Project-level (Morgan's output) controls cross-project execution order. Task-level (from project-brainstorm step) controls within-project wave analysis. Both feed the same greedy wave algorithm.

## Enforcement Architecture Decisions

- **Explicit pipeline steps beat shell hook enforcement.** We tried Stop hooks (enforce-completion.sh) and scope hooks (enforce-orchestrator-scope.sh) as bash scripts on the orchestrator agent. Problems: hooks require bash permission (fails for background agents), add maintenance overhead, and are opaque. Better: an explicit Step 5b (Review Verification) in the pipeline that the LLM executes as part of the normal flow. The checkpoint file tracks everything needed — just check it.
- **Don't track observable actions when you can check outcomes.** Checking "did the checkpoint reach step-5?" is a single jq query. Outcome checks beat action tracking.
- **Correction-to-code pipeline deferred.** Auto-escalating CEO corrections to enforced constraints requires a constraint definition format and checker infrastructure we decided not to build. The simpler path: CEO adds corrections to preferences.md, agents read preferences.md.
- **Separated review steps get skipped — embed reviews in the per-task loop.** Step 5b (Review Verification) was a separate step that ran AFTER all task builds. This structural separation made it possible to complete all 9 builds without any review. The orchestrator (an LLM) doesn't have "speed incentive" — the real cause is that the pipeline doc made reviews a deferred batch check, not an inline per-task gate. When the orchestrator processes tasks sequentially, it follows the loop: for each task → build → next task. Reviews, being a separate post-hoc step, fell off the execution path entirely. The fix: (1) `validate-reviews.sh` script as a hard gate before finalization, (2) pipeline doc restructured so reviews happen per-task DURING execution (build→review→next task), not as a post-hoc batch. The pattern: any step that CAN be deferred WILL be skipped — embed critical checks inside the loop, not after it.

## Multi-Codebase Directives

- **Directives spanning multiple repos need explicit coordination.** The work-state-management directive touched both `sw/` (context tree, SKILL.md) and `agent-conductor/` (dashboard). Worktree isolates only one repo. The agent-conductor changes were made directly (no worktree) — acceptable for this case but risky for larger changes. Consider: separate branches per repo, or a script that creates worktrees in both.

## Context Window Management

- **CEO session should delegate, not implement — NO EXCEPTIONS.** The CEO's context window is the most valuable resource. Filling it with implementation details (file edits, lint errors, agent prompts) prevents strategic thinking. For medium/heavy directives, launch a dedicated CLI session (`claude -p "/directive {name}"`) — this keeps the CEO session clean for decisions and browser verification. **Failure mode: "do better" escalation.** When the CEO is frustrated with quality and says "fix it" or "do better," the correct response is to create/update a directive with specific quality requirements and route through the pipeline — NOT to start editing files directly. The CEO session editing code is ALWAYS wrong, even when it feels faster. The CEO reviews in Chrome MCP, agents build.
- **Chrome MCP tools only work in the main session — visual verification bounces back.** CLI-spawned sessions and subagents cannot use browser tools. When UI work needs verification, the directive digest includes specific instructions: URLs, elements to click, expected behavior. The CEO handles the browser checks. Plan accordingly: never assign Chrome work to non-interactive sessions.
- **Context-shielded delegation preserves CEO attention.** Each directive fills 50-100K tokens of context. Running 3 directives in one CEO session means the CEO loses the ability to think strategically by the third. Launching separate CLI sessions means 3 directives = 3 clean summaries, each consuming ~2K tokens when reported back.

## Batch Directive Execution

- **C-suite challenges catch over-engineering across multiple directives.** In a batch of 5 P1 items, challengers pushed back on 3 (manager re-planning, full Reflexion migration, full personality updates) as over-engineered for zero-frequency problems or category errors. Lightweight versions shipped instead. Challenge mode is the single most valuable quality gate.
- **Lightweight implementations beat full-scope for framework changes.** When both challengers say "over-engineered", the right move is scope down to the minimum useful version, not power through the original scope. 3 of 5 directives shipped as lightweight variants with 80% of the value at 20% of the complexity.
- **Personality files are behavioral contracts, not knowledge stores.** Both Sarah and Morgan independently flagged that duplicating lessons into personality files creates dual source of truth. conductor/lessons.md is the knowledge store; personality files define how agents think and behave.
