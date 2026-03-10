<!-- Pipeline doc: 04b-clarification.md | Source: enrich-agent-behaviors directive -->

## Clarification: Verify Directive Intent with CEO

After the brainstorm completes, the pipeline has three sources of intent:
the CEO brief (directive.md), audit findings, and brainstorm proposals.
These sources often conflict or leave gaps. This step synthesizes them
into a structured intent block and verifies it with the CEO before the
COO plans against it.

**Why this exists:** The COO plans against whatever intent it receives.
If intent is ambiguous, the COO guesses -- and the entire downstream
pipeline (tasks, DOD, builds, reviews) inherits that guess. Catching
misalignment here costs one CEO interaction. Catching it after execution
costs a full reopen cycle.

---

### Step Entry — Update directive.json immediately

Before reading inputs, write `pipeline.clarification` to directive.json with `"status": "active"` and `"agent"` set to the participants. For heavyweight/strategic, include the brainstorm participants who contributed to the synthesis alongside the CEO. For lightweight/medium, set to `["pipeline"]` (auto-approved). This triggers the dashboard game to route characters to the meeting room.

### Inputs

| Source | File | What to extract |
|--------|------|-----------------|
| CEO brief | `.context/directives/{id}/directive.md` | Original goals, constraints, quality expectations |
| Directive DOD | `.context/directives/{id}/directive.json` → `dod` | Best-effort DOD extracted in the read step |
| Audit findings | `.context/directives/{id}/audit.md` | Technical constraints, complexity flags, dead code |
| Brainstorm output | `.context/directives/{id}/brainstorm.md` | Approach proposals, trade-offs, feasibility flags |

Read all four sources. If any file is missing (e.g., audit skipped for
lightweight), proceed with what is available.

---

### Step 1: Synthesize Intent

Extract a `verified_intent` object from the combined sources:

```json
{
  "goal": "One sentence: what the directive achieves when done",
  "constraints": [
    "Technical or process constraint derived from brief + audit",
    "e.g., 'Must not break existing session scanner detection'",
    "e.g., 'Budget: no new dependencies'"
  ],
  "quality_bar": "The minimum acceptable standard in one sentence -- derived from brief + audit baseline",
  "acceptance_scenarios": [
    {
      "scenario": "Short label for the scenario",
      "given": "Starting state or precondition",
      "when": "Action or trigger",
      "then": "Observable outcome that proves success"
    }
  ],
  "out_of_scope": [
    "Explicitly excluded work -- derived from brief + brainstorm 'avoid' fields",
    "e.g., 'Schema changes in work-item-types.ts (handled by separate directive)'"
  ]
}
```

**Extraction rules:**

1. **goal** -- Synthesize from the CEO brief's first paragraph + brainstorm
   convergence points. One sentence, active voice, concrete outcome.
2. **constraints** -- Merge technical constraints from the audit (active file
   counts, dependency limits, pattern requirements) with process constraints
   from the brief ("no regressions", "backward compatible"). One entry per
   constraint.
3. **quality_bar** -- Use `directive.json.dod.quality_bar` if populated. If
   empty, derive from the brief's language about acceptable outcomes. If the
   brief gives no quality signal, set to `""` and flag for CEO input.
4. **acceptance_scenarios** -- Convert `directive.json.dod.success_looks_like`
   entries into given/when/then format. Add scenarios from the brainstorm's
   feasibility flags (negative cases the audit surfaced). Aim for 2-5
   scenarios.
5. **out_of_scope** -- Collect from brainstorm `avoid` fields, audit dead code
   flags, and any explicit exclusions in the brief. One entry per exclusion.

---

### Step 2: CEO Verification (weight-dependent)

#### Test Mode Auto-Approve

If `directive.json` has `test_mode: true`, skip the weight-dependent CEO verification
and auto-approve immediately:

1. Step 1 (Synthesize Intent) MUST have already run fully -- this is the whole point
   of Option B gate simulation
2. Auto-approve the synthesized `verified_intent` as-is, regardless of directive weight
3. Log: `[TEST_MODE] Auto-approved clarification for {directive-name}`
4. Continue directly to Step 3 (Store Verified Intent) -- set `"agent": "pipeline"`,
   `"auto_approved": true`, `"modifications": []`

This is used by the `/smoke-test` skill for pipeline E2E testing. **NEVER** set
`test_mode: true` on a real directive -- it bypasses the CEO's intent verification.

If `test_mode` is not set, proceed to the weight-dependent logic below.

#### Heavyweight / Strategic: STOP gate -- CEO must verify

Present each field of the `verified_intent` to the CEO for piece-by-piece
confirmation. Use this format:

```
## Intent Verification

I've synthesized the directive intent from your brief, the technical
audit, and the team brainstorm. Please verify each item.

### Goal
> {goal}
Confirm / Modify?

### Constraints
1. {constraint_1} -- Confirm / Modify / Remove?
2. {constraint_2} -- Confirm / Modify / Remove?
   ...

### Quality Bar
> {quality_bar}
Confirm / Modify?

### Acceptance Scenarios
1. **{scenario}**: Given {given}, when {when}, then {then}
   Confirm / Modify / Remove?
2. ...

### Out of Scope
1. {item_1} -- Confirm / Modify / Remove?
2. ...

### Anything Missing?
Are there constraints, scenarios, or exclusions not captured above?
```

Wait for the CEO to respond. Process each response:

- **Confirm** -- keep the item as-is
- **Modify** -- replace with the CEO's revised text
- **Remove** -- delete from the intent block
- **Add** -- append new items the CEO provides

If the CEO modifies the goal or quality bar, re-check whether existing
acceptance scenarios still align. Flag any that no longer match.

If the quality_bar was empty and the CEO does not provide one, set a
default: `"All DOD criteria met; code review passes on first cycle"` and
note it in the output summary.

#### Lightweight / Medium: Auto-approve with log

Do NOT present to the CEO. Instead:

1. Synthesize the `verified_intent` as described in Step 1
2. Log: `[CLARIFICATION] Auto-approved intent for {weight} directive`
3. Log the synthesized goal and constraint count for traceability
4. Continue to the next step immediately

---

### Step 3: Store Verified Intent

Write the verified intent into directive.json at
`pipeline.clarification.output.verified_intent`:

```json
{
  "pipeline": {
    "clarification": {
      "status": "completed",
      "agent": "CEO",
      "output": {
        "summary": "CEO verified intent: {1-sentence summary of changes}",
        "verified_intent": {
          "goal": "...",
          "constraints": ["..."],
          "quality_bar": "...",
          "acceptance_scenarios": [
            { "scenario": "...", "given": "...", "when": "...", "then": "..." }
          ],
          "out_of_scope": ["..."]
        },
        "modifications": ["List of items the CEO modified, if any"],
        "auto_approved": false
      }
    }
  }
}
```

For auto-approved (lightweight/medium), set `"agent": "pipeline"`,
`"auto_approved": true`, and `"modifications": []`.

Also update `directive.json.dod` with the verified values:
- `dod.quality_bar` = `verified_intent.quality_bar`
- `dod.success_looks_like` = one entry per acceptance scenario's `then` field
- `dod.failure_looks_like` = inverse of each constraint (if constraint is
  "no regressions", failure is "regressions introduced")

This keeps `dod` in sync with verified intent for downstream consumers
(project-brainstorm, review-gate) that read `dod` directly.

---

### Update directive.json

Set `current_step: "plan"` (the next step).

Set `pipeline.clarification.status` to `"completed"` with the output
block described above. Include `artifacts: []` (no separate file -- the
verified intent lives inside directive.json).

Update `updated_at` to the current ISO timestamp.

**Next step:** Proceed to [05-planning.md](05-planning.md) (plan). The
COO receives `pipeline.clarification.output.verified_intent` as a
primary input for planning.
