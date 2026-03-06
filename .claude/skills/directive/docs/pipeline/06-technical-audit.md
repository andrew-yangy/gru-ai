<!-- Pipeline doc: 06-technical-audit.md | Source: SKILL.md restructure, updated by redesign-pipeline-steps -->

## Audit: Technical Audit (Two-Agent Flow)

After parsing Morgan's plan, run a two-agent sequential audit: **Sam (Investigation)** (pure data) then **Architect** (design recommendations). This separation prevents investigation findings from anchoring the design.

**Complexity gating:** For projects that touch integration points (data flows between systems, state management, API boundaries) or have moderate/complex scope, use the full two-agent flow. For simple projects with tight scope (single-domain), use the single-agent auditor pattern (skip Sam's investigation, spawn only the named auditor -- defaulting to Sarah -- with the combined prompt from [auditor-prompt.md](../reference/templates/auditor-prompt.md)). Note: single-project directives are often `simple`; projects in multi-project plans may be moderate/complex and should always use the two-agent flow.

### Phase 1: Investigation

Spawn Sam (QA Engineer) in investigation mode to scan the codebase and gather raw data. Sam does NOT recommend approaches — he reports facts only.

**Group projects by scope overlap** -- if multiple projects touch similar areas, send them to a single investigation agent to avoid redundant scanning.

**Investigation spawn rules:**
- `subagent_type: "sam"` — Sam operates in investigation mode when given the investigator prompt
- Spawn as Agent (model: opus)
- `run_in_background: true` if multiple investigation groups exist

**Sam's investigation prompt must include:**
- Morgan's projects (the ones assigned to this investigation group)
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
- Morgan's projects (the ones assigned to this auditor)
- **Sam's full investigation JSON output** — this is the Architect's primary input
- `.context/vision.md` guardrails section — for risk classification reference
- `.context/preferences.md` — CEO standing orders
- `.context/lessons/review-quality.md` — review lessons (for Sarah)
- `.context/lessons/agent-behavior.md` — agent behavior lessons

> See [docs/reference/templates/architect-prompt.md](../reference/templates/architect-prompt.md) for the full Architect prompt template.

> See [docs/reference/schemas/audit-output.md](../reference/schemas/audit-output.md) for the Architect's output JSON schema.

**Parse the Architect's response** as JSON. If it fails to parse, show the error and stop.

### Phase 2b: Design Prototype (UI-Touching Projects Only)

**Trigger:** If any project in the plan touches UI files (`*.tsx`, `*.jsx`, `*.css`, `src/components/`, `src/styles/`, or game canvas code), spawn Quinn (UI/UX Designer) to produce a design prototype.

**Quinn spawn rules:**
- `subagent_type: "quinn"`
- Spawn as Agent (model: opus)
- Only for projects flagged as UI-touching (use file-pattern matching from the audit's `active_files`)

**Quinn's prompt must include:**
- Morgan's projects (the UI-touching ones)
- The Architect's audit output (so she knows the technical constraints)
- `.context/preferences.md` — CEO standing orders
- `.context/lessons/agent-behavior.md` — agent behavior lessons
- Existing UI patterns: have her read the relevant component files from `active_files` to understand current patterns
- Instruction: "Produce a design prototype for each UI-touching project. Include ASCII wireframes, component specs, interaction notes, and responsive breakpoints. Your prototype goes into the plan markdown — builders use it as the visual spec."

**Quinn's output** is a markdown document with design prototypes. Write it to `.context/directives/{id}/design-prototype.md`. This file is:
- Presented to the CEO during the approval step alongside Morgan's plan
- Included in the builder's prompt during the execute step as the visual spec to follow
- Referenced by Quinn during design review (review-gate) to check implementation fidelity

### After All Audit Phases

**Update directive.json:** Set `current_step: "audit"`, `planning.morgan_plan` to the parsed JSON. Update `pipeline.audit` status/agent/output.

**If a project has no active files and all dead code:** Flag it for removal in the CEO presentation.

**Artifact:** Write the combined audit output (investigation data + architect recommendations) to the project directory as `audit-findings.json`. If design prototype was produced, note its path in the directive.json pipeline object.
