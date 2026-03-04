# Lessons: Orchestration Patterns

> How to coordinate agents, sequence work, manage resources.
> Relevant to: Morgan (planning), orchestrator (execution)

## Scoping Philosophy

- **With AI agents, "do it all in one go" beats incremental scoping.** Human teams need phased delivery because humans get tired, context-switch, and have limited hours. AI agents don't. Deferring work to "follow-up directives" creates tech debt that gets lost between sessions. If the decision is made, execute the full decision — don't carve off pieces for later.
- **Deferred follow-ups get lost.** The Option B goal structure directive shipped goal.json but deferred backlog.json and feature.json to "follow-up." No follow-up directive was ever created. The remaining work was buried in an "Agent-Proposed Improvements" section of a report nobody re-read. If it's part of the decision, it's part of the directive.
- **Sarah's technical opinions on data architecture carry extra weight.** When the CTO says "single source of truth — don't create a hybrid," that's a technical constraint, not a preference. Morgan's pragmatic scoping instinct is good for prioritization but should not override Sarah's architectural non-negotiables. If Sarah says "the hybrid is the worst outcome," don't ship half the migration and call it done.

## Planning & Sequencing

- **Strategic planning should be separate from codebase scanning.** Morgan (COO) plans WHAT and WHO. The auditor scans WHERE and HOW. Mixing them produced a 97K token, 218s planning phase. Splitting reduced it to 41K tokens, 15s for Morgan + separate audit.
- **Group initiatives by auditor to save tokens.** If 3 initiatives all need Sarah to audit, send them in one agent call, not three.
- **Technical audit prevents wasted build cycles.** The audit found 2/3 KRs already achieved before any build work started. Without the audit, we'd have spawned engineers to fix problems that don't exist.
- **Combine initiatives that modify the same file.** Checkpoint writing and artifact persistence both modify SKILL.md. Running them as separate agents risks merge conflicts. Combining into one agent with clear scope boundaries avoids this.
- **Large directives (5+ initiatives, 2+ codebases) benefit from compressed phases.** Combined design+build for init-1 and init-2 instead of separate design->build->review. Saved ~2 agent round trips without quality loss — the audit findings provided enough design context.

## Execution Attitude

- **"Do everything" means KEEP GOING until verified, not stop at the report.** The CEO expects continuous autonomous execution: build -> verify visually -> review -> find gaps -> fix -> iterate. The digest is a checkpoint, not a finish line. If the CEO is asleep, that's MORE reason to keep working, not less.
- **Agent-conductor is a safe playground — go wild.** Dashboard changes are isolated (separate repo, no production impact). Don't classify dashboard work as high-risk. SKILL.md updates for the conductor's own orchestration layer are medium-risk at most — just do them.
- **Always verify with Chrome MCP after building UI.** Building without visual testing is shipping untested code. Take screenshots, find issues, fix them in a loop.
- **After building, spawn reviewers to find gaps.** Sarah for code quality, Marcus for UX, then fix what they find. Don't stop after one pass.

## Parallel Execution Patterns

- **Parallelism is safe ONLY when active_files don't overlap.** Two initiatives touching the same file will cause merge conflicts or overwrites. The audit's `active_files` array is the source of truth for overlap detection.
- **Always group by priority tier first — never run P1 in parallel with P0.** Priority ordering exists for a reason (P0 may establish patterns that P1 depends on). Parallelism is only within-tier.
- **Background agent failures don't cascade — each initiative is independent.** If one parallel initiative crashes, the others continue. Mark the failed one and move on.
- **Collection pattern: spawn all -> TaskOutput each -> aggregate results.** Use `run_in_background: true` for each parallel agent, then collect with TaskOutput per agent ID. Same pattern applies to brainstorm and challenge phases.
- **Timeout: 10 minutes per initiative before marking failed.** Long-running agents may be stuck. Don't wait indefinitely — mark as failed and continue.
- **Brainstorm and challenge agents are always parallel.** These are lightweight, independent, advisory calls. Use `run_in_background: true` + collect pattern. Failed brainstorm/challenge agents never block the pipeline.

## Enforcement Architecture Decisions

- **Explicit pipeline steps beat shell hook enforcement.** We tried Stop hooks (enforce-completion.sh) and scope hooks (enforce-orchestrator-scope.sh) as bash scripts on the orchestrator agent. Problems: hooks require bash permission (fails for background agents), add maintenance overhead, and are opaque. Better: an explicit Step 5b (Review Verification) in the pipeline that the LLM executes as part of the normal flow. The checkpoint file tracks everything needed — just check it.
- **Don't track observable actions when you can check outcomes.** Checking "did the checkpoint reach step-5?" is a single jq query. Outcome checks beat action tracking.
- **Correction-to-code pipeline deferred.** Auto-escalating CEO corrections to enforced constraints requires a constraint definition format and checker infrastructure we decided not to build. The simpler path: CEO adds corrections to preferences.md, agents read preferences.md.

## Multi-Codebase Directives

- **Directives spanning multiple repos need explicit coordination.** The work-state-management directive touched both `sw/` (context tree, SKILL.md) and `agent-conductor/` (dashboard). Worktree isolates only one repo. The agent-conductor changes were made directly (no worktree) — acceptable for this case but risky for larger changes. Consider: separate branches per repo, or a script that creates worktrees in both.

## Context Window Management

- **CEO session should delegate, not implement.** The CEO's context window is the most valuable resource. Filling it with implementation details (file edits, lint errors, agent prompts) prevents strategic thinking. For medium/heavy directives, launch a dedicated CLI session (`claude -p "/directive {name}"`) — this keeps the CEO session clean for decisions and browser verification.
- **Chrome MCP tools only work in the main session — visual verification bounces back.** CLI-spawned sessions and subagents cannot use browser tools. When UI work needs verification, the directive digest includes specific instructions: URLs, elements to click, expected behavior. The CEO handles the browser checks. Plan accordingly: never assign Chrome work to non-interactive sessions.
- **Context-shielded delegation preserves CEO attention.** Each directive fills 50-100K tokens of context. Running 3 directives in one CEO session means the CEO loses the ability to think strategically by the third. Launching separate CLI sessions means 3 directives = 3 clean summaries, each consuming ~2K tokens when reported back.

## Batch Directive Execution

- **C-suite challenges catch over-engineering across multiple directives.** In a batch of 5 P1 items, challengers pushed back on 3 (manager re-planning, full Reflexion migration, full personality updates) as over-engineered for zero-frequency problems or category errors. Lightweight versions shipped instead. Challenge mode is the single most valuable quality gate.
- **Lightweight implementations beat full-scope for framework changes.** When both challengers say "over-engineered", the right move is scope down to the minimum useful version, not power through the original scope. 3 of 5 directives shipped as lightweight variants with 80% of the value at 20% of the complexity.
- **Personality files are behavioral contracts, not knowledge stores.** Both Sarah and Morgan independently flagged that duplicating lessons into personality files creates dual source of truth. conductor/lessons.md is the knowledge store; personality files define how agents think and behave.
