<!-- Pipeline doc: 06-technical-audit.md | Source: SKILL.md restructure, updated by redesign-pipeline-steps -->

## Step 3b: Technical Audit (Two-Agent Flow)

After parsing Morgan's plan, run a two-agent sequential audit: **Sam (Investigation)** (pure data) then **Architect** (design recommendations). This separation prevents investigation findings from anchoring the design.

**Complexity gating:** For **moderate+ complexity** initiatives, use the full two-agent flow. For **simple** initiatives (1-2 phases), use the single-agent auditor pattern (skip Sam's investigation, spawn only the named auditor — defaulting to Sarah — with the combined prompt from [auditor-prompt.md](../reference/templates/auditor-prompt.md)).

### Phase 1: Investigation

Spawn Sam (QA Engineer) in investigation mode to scan the codebase and gather raw data. Sam does NOT recommend approaches — he reports facts only.

**Group initiatives by scope overlap** — if multiple initiatives touch similar areas, send them to a single investigation agent to avoid redundant scanning.

**Investigation spawn rules:**
- `subagent_type: "sam"` — Sam operates in investigation mode when given the investigator prompt
- Spawn as Agent (model: opus)
- `run_in_background: true` if multiple investigation groups exist

**Sam's investigation prompt must include:**
- Morgan's initiatives (the ones assigned to this investigation group)
- Existing OKRs from `.context/goals/{goal_folder}/goal.json` `okrs` field (if populated) — so they avoid re-investigating solved problems
- `.context/vision.md` guardrails section — for constraint awareness
- `.context/preferences.md` — CEO standing orders
- `.context/lessons/agent-behavior.md` — agent behavior lessons
- Explicit instruction: "You are operating in INVESTIGATION MODE. Pure data gathering — scan, measure, report. Do NOT recommend approaches."

> See [docs/reference/templates/investigator-prompt.md](../reference/templates/investigator-prompt.md) for the full investigation prompt template.

> See [docs/reference/schemas/investigation-output.md](../reference/schemas/investigation-output.md) for the investigation output JSON schema.

**Parse Sam's response** as JSON. If it fails to parse, show the error and stop.

### Phase 2: Architecture (Design Recommendations)

Spawn the Architect to read the Investigator's data + Morgan's plan and recommend technical approaches.

**The Architect role is filled by the named auditor from Morgan's cast** (e.g., `"sarah"`, `"priya"`, `"riley"`) — not a separate agent definition. This ensures domain expertise informs the design.

**Architect spawn rules:**
- Use the auditor's named `subagent_type` from the cast (e.g., `"sarah"`, `"riley"`, `"jordan"`)
- If no named auditor is assigned, default to `subagent_type: "sarah"` (CTO handles unassigned audits)
- Spawn as Agent (model: opus)

**Architect's prompt must include:**
- Their personality file (for named agents — auto-loaded via `subagent_type`)
- Morgan's initiatives (the ones assigned to this auditor)
- **Sam's full investigation JSON output** — this is the Architect's primary input
- `.context/vision.md` guardrails section — for risk classification reference
- `.context/preferences.md` — CEO standing orders
- `.context/lessons/review-quality.md` — review lessons (for Sarah)
- `.context/lessons/agent-behavior.md` — agent behavior lessons

> See [docs/reference/templates/architect-prompt.md](../reference/templates/architect-prompt.md) for the full Architect prompt template.

> See [docs/reference/schemas/audit-output.md](../reference/schemas/audit-output.md) for the Architect's output JSON schema.

**Parse the Architect's response** as JSON. If it fails to parse, show the error and stop.

### After Both Phases

**Checkpoint:** Write checkpoint with `current_step: "step-3"`, `planning.morgan_plan` set to the parsed JSON, and `initiatives` array initialized from the plan (all `status: "pending"`).

**If an initiative has no active files and all dead code:** Flag it for removal in the CEO presentation.

**Artifact:** Write the combined audit output (investigation data + architect recommendations) to the project directory as `audit-findings.json`.
