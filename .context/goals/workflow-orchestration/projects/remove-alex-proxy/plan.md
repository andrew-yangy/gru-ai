# Plan: Remove Alex Proxy Layer

## Problem Statement

Alex (Chief of Staff) is currently spawned as a **background subagent** via the Agent tool to orchestrate the directive pipeline. This is fundamentally broken:

1. **Subagents can't use the Agent tool** — confirmed platform limitation (Claude Code issue #4182)
2. **Alex must use CLI** (`claude --agent`) via Bash to spawn sub-agents
3. **Background agents can't get Bash permission** — auto-rejected, no user to approve
4. **Alex gets stuck every time** — unable to spawn Morgan, Sarah, Riley, or anyone

## Key Insights

From CEO conversation (2026-03-04):

> "The concept of Alex is just a visual one. The CC session IS Alex. The CEO session is just a layer in the game."

- The CEO is NOT a CC session. The CEO is the player (game UI, dashboard, or separate terminal).
- "Blocking the CEO" is a false constraint — multiple terminal sessions run simultaneously.
- Alex the agent definition is unnecessary — the `/directive` skill already contains all orchestration logic.
- Hooks are unnecessary — replace with an explicit review verification step in the pipeline. The directive runs in a visible terminal; the CEO is the enforcement.

## Architecture: Before and After

### Before (broken)
```
CEO CC Session
  └─ Agent tool: spawns Alex (background subagent)
       └─ reads SKILL.md + pipeline docs
       └─ tries Bash: claude --agent riley → REJECTED (no permission)
       └─ stuck
       └─ hooks: enforce-completion.sh, enforce-orchestrator-scope.sh
```

### After
```
Lightweight:
  CEO CC Session
    └─ /directive runs inline
    └─ Agent tool for single-level spawns (research, audit, review)

Medium/Heavy:
  CEO (game UI / dashboard / terminal)
    └─ launches: claude -p "/directive {name}" (top-level CC process, new terminal)
         └─ CLI: claude --agent riley → works (real terminal, user can approve)
         └─ CLI: claude --agent sarah → works
         └─ review verification = explicit pipeline step (no hooks)
```

## What Gets Removed

1. **`alex-cos.md`** — deleted entirely. The skill IS the orchestrator.
2. **SKILL.md Step 0a** — no more "delegate to Alex" pattern.
3. **All hooks** — `enforce-completion.sh`, `enforce-orchestrator-scope.sh`, `enforce-reviews.sh`. Replaced by an explicit pipeline step.
4. **Background-agent workarounds** in pipeline docs (ui-review-request.json, "you cannot use AskUserQuestion", etc.)
5. **`chief-of-staff-pattern` project** — marked superseded.

## What Gets Added

1. **Pipeline Step 5b: Review Verification** — explicit numbered step between build/review (Step 5) and wrapup (Step 6). Runs `scripts/verify-reviews.sh` which checks that review artifacts exist and DOD is verified for each initiative. If it fails, the pipeline says "fix the missing reviews before proceeding." LLM follows numbered steps reliably; CEO can see the output.

2. **SKILL.md routing decision** — replaces Step 0a:
   - Lightweight → run inline
   - Medium/Heavy → print CLI launch command for the CEO, or auto-launch via Foreman

3. **Foreman update** — already launches top-level processes correctly. Just needs to stop referencing Alex and run `/directive` directly.

## Tasks

### Task 1: Delete alex-cos.md and hooks

Remove:
- `.claude/agents/alex-cos.md`
- `.claude/hooks/enforce-completion.sh`
- `.claude/hooks/enforce-orchestrator-scope.sh`

Update `.claude/settings.json` to remove any hook references.

### Task 2: Rewrite SKILL.md Step 0a

Replace "Delegate to Alex" with a routing decision:
- Lightweight → run inline, proceed to Step 0b
- Medium/Heavy → output CLI launch command: `claude -p "/directive {name}" --dangerously-skip-permissions`
- Remove all references to Alex, background agents, ui-review-request.json

### Task 3: Add pipeline Step 5b — Review Verification

Add between Step 5 (execute) and Step 6 (wrapup):
- Run `scripts/verify-reviews.sh`
- Check: review artifacts exist for each initiative
- Check: DOD verification is present
- If missing → "Do not proceed. Complete reviews first."
- This is the LLM-enforced replacement for enforce-completion.sh

### Task 4: Update pipeline docs — Remove background-agent workarounds

- `00-delegation-and-triage.md` — remove "you are a background agent" references
- `09-execute-initiatives.md` — remove ui-review-request.json workaround, remove "Chrome MCP unavailable" section, simplify UX verification (the directive session can't use Chrome MCP regardless — it's CLI, not the main session)

### Task 5: Update Foreman scheduler

- Stop embedding "You are Alex Rivera" in the prompt
- Launch with: `claude -p "/directive {name}" --dangerously-skip-permissions`
- Session will show as a regular directive session in the dashboard

### Task 6: Mark chief-of-staff-pattern superseded

Update project.json with superseded note.

## Out of Scope

- Game UI changes (separate project under game goal)
- Changing how sub-agents spawn sub-sub-agents (still CLI, platform limitation)
- Foreman scheduling logic changes (already works correctly)
- Agent tool nested spawning (platform limitation, not our problem to solve)

## Success Criteria

1. `/directive {lightweight task}` runs inline, completes without Alex
2. `/directive {medium+ task}` outputs a CLI command the CEO can run in a new terminal
3. Foreman-launched directives work end-to-end without Alex
4. Review verification step catches skipped reviews
5. No more stuck sessions
6. alex-cos.md and all hooks deleted
