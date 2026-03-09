<!-- Pipeline doc: 06-technical-audit.md | Source: SKILL.md restructure, updated by redesign-pipeline-steps -->

## Audit: Technical Audit (Two-Agent Flow)

After parsing the COO's plan, run a two-agent sequential audit: **the QA engineer (Investigation)** (pure data) then **Architect** (design recommendations). This separation prevents investigation findings from anchoring the design.

**Complexity gating:** For projects that touch integration points (data flows between systems, state management, API boundaries) or have moderate/complex scope, use the full two-agent flow. For simple projects with tight scope (single-domain), use the single-agent auditor pattern (skip the QA engineer's investigation, spawn only the named auditor -- defaulting to the CTO -- with the combined prompt from [auditor-prompt.md](../reference/templates/auditor-prompt.md)). Note: single-project directives are often `simple`; projects in multi-project plans may be moderate/complex and should always use the two-agent flow.

### Phase 1: Investigation

Spawn the QA engineer in investigation mode to scan the codebase and gather raw data. The QA engineer does NOT recommend approaches -- they report facts only.

**Group projects by scope overlap** -- if multiple projects touch similar areas, send them to a single investigation agent to avoid redundant scanning.

**Investigation spawn rules:**
- `subagent_type`: the QA engineer's ID from the registry -- operates in investigation mode when given the investigator prompt
- Spawn as Agent (model: opus)
- `run_in_background: true` if multiple investigation groups exist

**The QA engineer's investigation prompt must include:**
- The COO's projects (the ones assigned to this investigation group)
- `.context/vision.md` guardrails section — for constraint awareness
- `.context/preferences.md` — CEO standing orders
- `.context/lessons/agent-behavior.md` — agent behavior lessons
- Explicit instruction: "You are operating in INVESTIGATION MODE. Pure data gathering — scan, measure, report. Do NOT recommend approaches."

> See [docs/reference/templates/investigator-prompt.md](../reference/templates/investigator-prompt.md) for the full investigation prompt template.

> See [docs/reference/schemas/investigation-output.md](../reference/schemas/investigation-output.md) for the investigation output JSON schema.

**Parse the QA engineer's response** as JSON. If it fails to parse, show the error and stop.

### Phase 2: Architecture (Design Recommendations)

Spawn the Architect to read the Investigator's data + the COO's plan and recommend technical approaches.

**The Architect role is filled by the named auditor from the COO's cast** -- not a separate agent definition. This ensures domain expertise informs the design.

**Architect spawn rules:**
- Use the auditor's `id` from the registry as the `subagent_type`
- If no named auditor is assigned, default to the CTO (handles unassigned audits)
- Spawn as Agent (model: opus)

**Architect's prompt must include:**
- Their personality file (for named agents — auto-loaded via `subagent_type`)
- The COO's projects (the ones assigned to this auditor)
- **The QA engineer's full investigation JSON output** — this is the Architect's primary input
- `.context/vision.md` guardrails section — for risk classification reference
- `.context/preferences.md` — CEO standing orders
- `.context/lessons/review-quality.md` — review lessons (for the CTO)
- `.context/lessons/agent-behavior.md` — agent behavior lessons

> See [docs/reference/templates/architect-prompt.md](../reference/templates/architect-prompt.md) for the full Architect prompt template.

> See [docs/reference/schemas/audit-output.md](../reference/schemas/audit-output.md) for the Architect's output JSON schema.

**Parse the Architect's response** as JSON. If it fails to parse, show the error and stop.

### After All Audit Phases

**Update directive.json:** Set `current_step: "audit"`, `planning.coo_plan` to the parsed JSON. Update `pipeline.audit` status/agent/output.

**If a project has no active files and all dead code:** Flag it for removal in the CEO presentation.

**Artifact:** Write the combined audit output (investigation data + architect recommendations) to the project directory as `audit-findings.json`. If design prototype was produced, note its path in the directive.json pipeline object.
