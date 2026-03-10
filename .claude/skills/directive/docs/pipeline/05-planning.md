<!-- Pipeline doc: 05-planning.md | Source: SKILL.md restructure -->

## Plan: Spawn the COO (Strategic Planning)

Spawn the COO as an Agent (model: opus, subagent_type: COO's ID from registry).

### Step Entry — Update directive.json immediately

Before spawning the COO, write `pipeline.plan` to directive.json with `"status": "active"` and `"agent"` set to the COO's first name (lowercase). This triggers the dashboard game to route the COO character to the meeting room.

**The COO's prompt must include:**
- The CEO directive text (personality is auto-loaded via the `subagent_type`)
- The goals index, lessons, and agent summaries from the context step
- **Audit findings** (from the audit step) -- the COO receives these as input. If the audit reveals complexity exceeding the triage estimate, the COO should flag it in `challenges.risks` and adjust project decomposition accordingly.
- **Brainstorm synthesis** from `.context/directives/{directive-id}/brainstorm.md` -- the team's approach proposals, trade-offs, and (for heavyweight/strategic) challenge critiques. The COO should use this to inform project decomposition rather than re-deriving the approach from scratch.
- **Verified intent** from the clarification step (`pipeline.clarification.output.verified_intent` in directive.json) -- this is the CEO-confirmed goal, constraints, quality bar, acceptance scenarios, and out-of-scope items. Inject it into the planner prompt at the `{verified_intent}` placeholder. If the clarification step was auto-approved or skipped, pass the synthesized intent (which still contains extracted constraints and scenarios).
- These explicit instructions:

> See [docs/reference/templates/planner-prompt.md](../reference/templates/planner-prompt.md) for the full COO planning prompt.

> See [docs/reference/schemas/plan-schema.md](../reference/schemas/plan-schema.md) for the COO's output JSON schema.

> See [docs/reference/rules/casting-rules.md](../reference/rules/casting-rules.md) for full casting rules.

> See [docs/reference/rules/phase-definitions.md](../reference/rules/phase-definitions.md) for phase composable building blocks.

> See [docs/reference/rules/scope-and-dod.md](../reference/rules/scope-and-dod.md) for scope format rules, Definition of Done rules, and user scenario rules.

**Additional instruction for the COO:** "The team has brainstormed approach options and the CTO has audited the codebase. Use the brainstorm synthesis, CEO's clarification answers, and audit findings to inform your plan -- focus on execution planning, not strategy re-derivation."

**Parse the COO's response** as JSON. Extract the JSON object from the response (find the first `{` and last `}`). If it fails to parse, show the error and stop.

### Save the COO's plan (DO NOT create project.json yet)

Save the COO's parsed JSON plan to `.context/directives/{directive-id}/plan.json` for reference. The directive directory should already exist from the read step.

**Do NOT create project.json at this step.** The project.json is created in the approve step (after CEO approval) so that CEO modifications to the plan are reflected in the source of truth. Creating it before approval causes plan/project drift when the CEO requests changes.

### Handle Multi-Project Plans

If the COO's plan contains a `projects` array (triggered when genuinely complex work can't be decomposed into simple tasks):

1. **Verify projects are independent or use depends_on** — if project B depends on project A's output (shared code, shared data structures, one builds on the other), either merge into a single project with ordered tasks, or set `depends_on: ["project-a"]` in the COO plan to enforce execution order. For tightly coupled work sharing code dependencies, prefer merging into ONE project.
2. **Create a separate project directory and project.json for each independent project** in the approve step (after CEO approval)
3. **Each project gets its own brainstorm** (2-3 agents + deliberation) before build
4. **Each project gets its own execution cycle** in the execute step: brainstorm -> audit -> build -> review -> verify
5. **Projects execute sequentially by priority tier** (all P0 projects before P1)
6. **Project directories**: `.context/directives/{directive-id}/projects/{project-id}/` (use the project's `id`, not the directive name)

Most directives should use a single project with simple tasks. Multi-project is the exception for genuinely complex AND independent work.

**Validate the cast** — pipe the parsed JSON through `validate-cast.sh` to mechanically check casting rules:

```bash
echo "$PLAN_JSON" | .claude/hooks/validate-cast.sh
```

The script checks:
1. Every project has at least one reviewer assigned
2. Builder (agent[]) is not in the reviewers array (conflict of interest)
3. Complex or moderate projects have at least one C-suite reviewer
4. Agents don't review changes to their own behavior/prompts
5. `depends_on` references point to existing project IDs
6. No circular dependencies in the `depends_on` graph

If validation fails (`valid: false`), log the violations and either:
- **Auto-fix** if the violation is clear (e.g., swap a conflicting reviewer for the next-best match per casting rules)
- **Block** and re-prompt the COO with the violations if auto-fix isn't possible

> See `.claude/hooks/validate-cast.sh` for the validation script (copied to consumer project by `/gruai-config`).

### Update directive.json

Set `current_step: "approve"` (the next step). Update `pipeline.plan.status` to `"completed"` with `agent: ["morgan"]`, output summary including the plan goal and project count, and `artifacts: [".context/directives/{id}/plan.json"]`.

**Next step:** Proceed to [07-plan-approval.md](07-plan-approval.md) (approve) to present the combined plan to the CEO.
