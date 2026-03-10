# Agent Model

How agents are structured, scoped, and constrained.

## Core Principle: Agents Are Scoped Workers, Not Autonomous Actors

Each agent receives a focused task with bounded context and returns a structured result. Agents don't negotiate scope, choose their own tasks, or coordinate with each other directly. The orchestrator (CEO session) is the only entity with full pipeline context.

## Sub-Agent Architecture

### Why Sub-Agents
- Fresh context windows produce better output than accumulated context
- Isolation prevents cross-contamination between parallel tasks
- Failure in one agent doesn't corrupt others' state
- Each agent's context budget is spent on its task, not pipeline overhead

### Constraints (Platform)
- **No sub-subagents.** Claude Code Agent tool cannot spawn nested agents (confirmed via test + GitHub #4182). This means builders can't delegate internally. Task decomposition must happen at the planning level, not at build time.
- **Background agents get Bash rejected.** Agents spawned with `run_in_background: true` have Bash permissions auto-rejected unless `permissionMode: bypassPermissions` is set.
- **Agent teams unstable.** Experimental feature (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS). Teammates go idle without processing messages when spawned from an existing session. Parked — not reliable enough for production pipeline.

### Agent Spawn Pattern
Each agent gets:
1. **Personality** — auto-loaded from `.claude/agents/{name}.md` via `subagent_type` matching agent registry `id`
2. **Task context** — scoped to their specific task (CEO brief, audit findings, DOD)
3. **Global context** — preferences.md, vision.md, role-specific lessons, relevant design docs
4. **Model** — opus for builders/reviewers (quality-critical), sonnet for brainstorm/research (cost-efficient)

### Output Expectations
Builders must return:
- Structured build report with `proposed_improvements`, `user_walkthrough`
- `brainstorm_alignment` if brainstorm phase preceded build
- Updated project.json (task status, DOD met fields)

Reviewers must return structured JSON with:
- `review_outcome` (pass/fail/critical)
- `dod_verification` (per-criterion met/evidence)
- `user_perspective` (workflow improvement assessment)

## Role Separation

| Role | Does | Does NOT |
|------|------|----------|
| CEO session | Triages, delegates, reviews results | Plan, build, or edit code |
| COO | Plans projects, decomposes scope, casts agents | Scan codebase, audit code, build |
| CTO/Auditor | Audits codebase, reviews architecture, decomposes tasks | Plan projects, cast agents |
| Builder | Implements tasks per DOD, writes build reports | Choose scope, skip DOD, self-certify completion |
| Reviewer | Verifies DOD, checks user perspective, finds bugs | See builder reasoning (fresh context only) |

## Trust Boundaries

- **Self-review is forbidden.** A builder cannot review their own code. validate-reviews.sh enforces this.
- **Self-certification is forbidden.** DOD criteria are marked by reviewers, not builders. The pipeline checks for this.
- **Same-agent prompt review is forbidden.** An agent cannot review changes to its own personality file or prompts (conflict of interest).
- **Reviewer sees no builder reasoning.** Code review uses fresh context with file contents + diff only. Builder's design rationale, brainstorm alignment, and implementation notes are excluded to prevent confirmation bias.

## Effort Scaling

Agent count and model choice scale with directive weight:
- **Lightweight:** 1 builder + 1 reviewer, minimal audit
- **Medium:** 1-2 builders + reviewers, standard audit
- **Heavyweight:** Multiple builders (wave-parallel), full two-phase audit, C-suite brainstorm
- **Strategic:** Same as heavyweight + deliberation round (2 brainstorm passes)

This matches Anthropic's finding (multi-agent research, Jun 2025): "don't send 50 subagents for simple queries." Scale resources to task complexity.
