<!-- Pipeline doc: 00-delegation-and-triage.md | Source: SKILL.md restructure -->

## Step 0b: Triage (Complexity Assessment)

### Pre-flight Cleanup

Before doing anything else, kill orphaned CLI agents from prior runs. These accumulate when a directive session gets killed mid-execution (context limit, timeout, cancellation) and the spawned child processes keep running as zombies. Left unchecked, they saturate API rate limits and cause new spawns to hang indefinitely.

```bash
# Kill orphaned CLI agent processes from prior runs
ps aux | grep "claude.*--agent.*-p" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
# Also kill any orphaned -p (print mode) processes without --agent
ps aux | grep "claude -p" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
# Kill orphaned spawn-agent.ts processes
ps aux | grep "spawn-agent" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
echo "Pre-flight cleanup: killed orphaned agent processes"
```

This is safe — active CLI agents for the current directive haven't been spawned yet, so there's nothing to accidentally kill.

### Classify the Directive

Read the directive, then classify its weight. This determines how much process overhead is needed. Not everything needs the full pipeline.

Read the directive file: `.context/directives/$ARGUMENTS.md`
Read `.context/vision.md` guardrails and `.context/preferences.md`.

### Classification Rules

**Lightweight** — the COO plans, but minimal overhead. No C-suite challenges, no CEO approval:
- Single clear task (fix a bug, delete dead code, update a config)
- All changes are in well-understood files
- No user-facing impact
- No guardrail risk (check vision.md)
- Scope fits in one engineer agent's work

**Medium** — the COO plans, but no C-suite challenges, no CEO approval:
- 2-3 related tasks that need coordination
- Touches multiple files but within one system
- Low-to-medium risk (no revenue/auth/schema impact)
- the COO plans the projects, pipeline executes tasks, CEO gets the summary

**Heavyweight** — Full pipeline with challenges, audit, and CEO approval gate:
- Crosses system boundaries (frontend + backend + infra)
- Touches revenue, auth, user data, or database schema
- Architectural decisions needed
- Violates or tests a guardrail in vision.md
- CEO has explicitly flagged this area as sensitive
- 4+ tasks or multi-day scope

**Security classification examples** (to resolve ambiguity):
- Hardening existing code (fixing injection, removing hardcoded creds, adding input validation to existing routes) = **Medium**
- Changing auth flows, adding new auth mechanisms, modifying access controls, changing session handling = **Heavyweight**

**Strategic** — Full pipeline with brainstorm phase before the COO plans:
- Multiple valid approaches and the directive doesn't prescribe one
- Architectural or process-level change — affects HOW the system works, not just WHAT it does
- Crosses 2+ domain boundaries where C-suite members would have conflicting opinions
- Lasting consequences expensive to reverse — new schemas, API contracts, conventions
- The directive asks a question or states a problem without specifying the solution
- NOT strategic just because it's big — a directive with a clear prescribed approach is heavyweight, not strategic

### Triage Output

State the classification clearly before proceeding:

```
Directive: {name}
Classification: {lightweight | medium | heavyweight | strategic}
Reasoning: {1-2 sentences why}
Process: {what steps will be used}
```

### Lightweight Process

1. Read context files (lessons/ topic files, preferences.md — skip the full context load)
2. Spawn the COO to plan projects (plan) — even for simple work, the COO produces the plan so the CEO session stays clean
3. Spawn auditor for technical baseline (audit) — lightweight audit, not full investigation
4. **No plan-approval gate** — auto-approve
5. Create branch (setup) — worktree only if working directory is dirty
6. Execute tasks (execute)
7. Review verification (review-gate)
8. Generate a short digest to `.context/reports/`
9. Return CEO summary (Done / Changes / Needs CEO Eyes / Next)

No C-suite challenges. No brainstorm. No plan-approval gate. No worktree (unless the CEO has uncommitted changes). No OKR updates. CEO approves completion after the fact (completion step).

**CEO SESSION RULE: The CEO session NEVER plans or builds — it triages, delegates to the COO/agents, and reviews results. This applies to ALL weights including lightweight.**

### Medium Process

1. Read full context (read + context steps)
2. Spawn the COO to plan projects (plan) -- the COO's inline challenge is always included, but skip separate C-suite challengers (challenge step)
3. Spawn auditor for technical baseline (audit)
4. **No plan-approval gate** -- auto-approve the plan based on directive scope and guardrails
5. Create branch (setup) — worktree only if working directory is dirty
6. Execute tasks (execute)
7. Review verification (review-gate)
8. Update OKRs, generate digest, update lessons (wrapup)
9. Output CEO summary

No pause for plan sign-off. The CEO reviews the digest after the fact and approves completion (completion step). If something in the plan looks risky (touches a guardrail), **upgrade to heavyweight**.

### Strategic Process

Same as heavyweight but with an additional deliberation round during brainstorm. The team figures out the approach, debates it, and the CEO answers 2-3 clarifying questions.

1. Read full context (read + context steps)
2. **Brainstorm phase (with deliberation)** — spawn the brainstorm team in parallel using `run_in_background: true`. The brainstorm team includes:
   - **2-3 relevant C-suite agents** (the CTO for architecture, the CPO for product, the CMO for growth — pick based on directive domain)
   - **The named auditor** from the project cast (defaulting to the CTO if none assigned) -- grounds proposals in codebase reality

   Each agent gets:
   - Their personality from `.claude/agents/{name}.md`
   - The directive text
   - `.context/vision.md` and `.context/preferences.md`
   - The Phase 1 prompt from the brainstorm prompt template
   - `model: "sonnet"` (cheap, fast -- this is approach exploration, not code)

   ```
   Agent tool call (per brainstorm agent):
     subagent_type: "{agent_name}"
     model: "sonnet"
     run_in_background: true
     prompt: |
       {Phase 1 brainstorm prompt from template}
   ```

   **Collect results** — after spawning all brainstorm agents, collect results using TaskOutput for each agent ID. Wait for all background agents to return before synthesizing.

   **Error handling** — if a brainstorm agent fails or times out, log the error and continue with the remaining proposals. If ALL brainstorm agents fail, skip the brainstorm synthesis and proceed to the COO planning with a note: "brainstorm phase failed — the COO must derive the approach independently."

3. **Deliberation round (strategic only)** — after collecting all Phase 1 proposals, spawn each agent again with all proposals visible. Each agent writes ONE rebuttal targeting the proposal they most disagree with. Use the Phase 2 prompt from the brainstorm prompt template.

   ```
   Agent tool call (per brainstorm agent, round 2):
     subagent_type: "{agent_name}"
     model: "sonnet"
     run_in_background: true
     prompt: |
       {Phase 2 deliberation prompt from template, with all Phase 1 outputs included}
   ```

   **Collect rebuttals** — same collection pattern as Phase 1. If a rebuttal agent fails, continue without it.

4. **Synthesize** — collect all proposals AND rebuttals. Identify which critiques landed, which proposals survived challenge. Write synthesis to `.context/directives/{directive-id}/brainstorm.md`
5. **CEO clarification** — write 2-3 clarifying questions based on unresolved disagreements from the deliberation. STOP and return to CEO: "This directive is strategic. The team brainstormed N approaches and debated. Here are questions before we proceed: [questions]"
6. **After CEO answers** — feed brainstorm synthesis + CEO answers into the COO's prompt as additional context. Continue as heavyweight from the plan step onward.

> See [docs/reference/templates/brainstorm-prompt.md](../reference/templates/brainstorm-prompt.md) for the full brainstorm agent prompt template (Phase 1 + Phase 2).

> See [docs/reference/schemas/brainstorm-output.md](../reference/schemas/brainstorm-output.md) for the brainstorm agent output JSON schema (proposals + rebuttals).

### Heavyweight Process

Full pipeline: triage → read → context → challenge → **Brainstorm** → plan → audit → approve → project-brainstorm → setup → execute → review-gate → wrapup → completion.

**Brainstorm phase (mandatory for heavyweight):** Before the COO plans, spawn the brainstorm team in parallel using `run_in_background: true`. The brainstorm team includes:
- **2-3 relevant C-suite agents** (the CTO for architecture, the CPO for product, the CMO for growth — pick based on directive domain)
- **The named auditor** from the project cast (defaulting to the CTO if none assigned) -- grounds proposals in codebase reality

Each agent gets the **Phase 1 prompt only** from the brainstorm prompt template. No deliberation round for heavyweight — proposals only, then synthesis.

```
Agent tool call (per brainstorm agent):
  subagent_type: "{agent_name}"
  model: "sonnet"
  run_in_background: true
  prompt: |
    {Phase 1 brainstorm prompt from template}
```

**Collect results** using TaskOutput for each agent ID. Wait for all background agents to return before synthesizing.

**Error handling** — if a brainstorm agent fails or times out, log the error and continue with the remaining proposals. If ALL brainstorm agents fail, skip the brainstorm synthesis and proceed to the COO planning with a note: "brainstorm phase failed — the COO must derive the approach independently."

**Synthesize** — collect all proposals (NO rebuttals for heavyweight). Identify convergence points and key disagreements. Write synthesis to `.context/directives/{directive-id}/brainstorm.md`. CEO clarification questions are included in the plan-for-approval artifact rather than as a separate STOP gate. This ensures the team thinks through the approach before the COO plans, without adding a separate round-trip to the CEO.

> See [docs/reference/templates/brainstorm-prompt.md](../reference/templates/brainstorm-prompt.md) for the full brainstorm agent prompt template.

> See [docs/reference/schemas/brainstorm-output.md](../reference/schemas/brainstorm-output.md) for the brainstorm agent output JSON schema.

For the CEO approval gate (approve step): write the plan to `.context/directives/{directive-id}/plan-for-approval.md` and STOP. Output a summary asking the CEO to approve. Include brainstorm synthesis and any clarifying questions alongside the COO's plan. After CEO approval, continue execution from the setup step.
