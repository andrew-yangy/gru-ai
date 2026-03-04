<!-- Pipeline doc: 05-morgan-planning.md | Source: SKILL.md restructure -->

## Step 3: Spawn Morgan (Strategic Planning)

Spawn Morgan as an Agent (model: opus, subagent_type: "morgan").

**Morgan's prompt must include:**
- The CEO directive text (personality is auto-loaded via `subagent_type: "morgan"`)
- The goals index, lessons, and agent summaries from Step 2
- These explicit instructions:

> See [docs/reference/templates/morgan-prompt.md](../reference/templates/morgan-prompt.md) for the full Morgan planning prompt.

> See [docs/reference/schemas/morgan-plan.md](../reference/schemas/morgan-plan.md) for Morgan's output JSON schema.

> See [docs/reference/rules/casting-rules.md](../reference/rules/casting-rules.md) for full casting rules.

> See [docs/reference/rules/phase-definitions.md](../reference/rules/phase-definitions.md) for phase composable building blocks.

> See [docs/reference/rules/scope-and-dod.md](../reference/rules/scope-and-dod.md) for scope format rules, Definition of Done rules, and user scenario rules.

**If this directive was classified as strategic**, also include in Morgan's prompt:
- The brainstorm synthesis from `.context/goals/{goal}/projects/{project}/{directive_name}/brainstorm.md`
- CEO's clarification answers
- Additional instruction to Morgan: "The team has brainstormed approach options for this directive. Use the brainstorm synthesis and CEO's answers to inform your plan — you don't need to re-derive the approach from scratch. Focus on execution planning, not strategy."

**Parse Morgan's response** as JSON. Extract the JSON object from her response (find the first `{` and last `}`). If it fails to parse, show the error and stop.

### Save Morgan's plan (DO NOT create project.json yet)

Save Morgan's parsed JSON plan to `.context/goals/{goal_folder}/projects/{directive-name}/morgan-plan.json` for reference. Create the directory if needed: `mkdir -p .context/goals/{goal_folder}/projects/{directive-name}/`

**Do NOT create project.json at this step.** The project.json is created in Step 4 (after CEO approval) so that CEO modifications to the plan are reflected in the source of truth. Creating it before approval causes plan/project drift when the CEO requests changes.

**Validate the cast** — pipe the parsed JSON through `validate-cast.sh` to mechanically check casting rules:

```bash
echo "$MORGAN_PLAN_JSON" | .claude/hooks/validate-cast.sh
```

The script checks:
1. Every initiative has an auditor assigned
2. Builder is not in the reviewers array (conflict of interest)
3. Complex initiatives (5+ phases) have at least one C-suite reviewer
4. Agents don't review changes to their own behavior/prompts

If validation fails (`valid: false`), log the violations and either:
- **Auto-fix** if the violation is clear (e.g., swap a conflicting reviewer for the next-best match per casting rules)
- **Block** and re-prompt Morgan with the violations if auto-fix isn't possible

> See [.claude/hooks/validate-cast.sh](../../../../.claude/hooks/validate-cast.sh) for the validation script.
