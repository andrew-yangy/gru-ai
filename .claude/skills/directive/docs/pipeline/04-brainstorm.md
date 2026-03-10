<!-- Pipeline doc: 04-brainstorm.md | Step: brainstorm -->

## Brainstorm: Approach Exploration (Heavyweight/Strategic Only)

**Lightweight and medium directives skip this step entirely.** Advance to the next step.

For heavyweight and strategic directives, this step spawns brainstorm agents to explore approaches before the COO plans. The audit has already run -- audit findings feed into every proposal so approaches are grounded in codebase reality.

### Participants

Spawn 2-3 C-suite agents + the auditor (CTO or architect) from the agent registry. Select participants based on the directive's domain:

- **Technical / architecture / debt** -- CTO + relevant builder
- **User-facing / product** -- CPO + CTO
- **Growth / SEO / marketing** -- CMO + CPO
- **Cross-domain** -- CTO + CPO + the most relevant third (CMO or a domain specialist)

The auditor who ran the technical audit step always participates -- they ground proposals in codebase reality.

### Step Entry — Update directive.json immediately

Before spawning any agents, write `pipeline.brainstorm` to directive.json with `"status": "active"` and `"agent"` set to the array of selected participant first names (lowercase). The agent list must match whoever you chose from the Participants section above — it is NOT a fixed set. This update triggers the dashboard game to route those characters to the meeting room.

### Process

**Phase 1 -- Proposals (+ Challenge)**

Spawn each participant in parallel using `run_in_background: true` with the brainstorm prompt template.

> See [brainstorm-prompt.md](../reference/templates/brainstorm-prompt.md) for the full prompt template. The template includes a `{challenge_instruction}` block that fires for heavyweight/strategic -- each agent critically evaluates the directive before proposing their approach.

> See [brainstorm-output.md](../reference/schemas/brainstorm-output.md) for the output JSON schema.

Each agent produces:
- A concrete approach proposal (3-5 sentences)
- Tradeoffs and what to avoid
- A **challenge assessment** (heavyweight/strategic only) -- risks, scope concerns, alternatives
- Feasibility flags grounded in audit findings (auditor agent)

**Phase 2 -- Deliberation (Strategic ONLY)**

For strategic directives only: after collecting all Phase 1 proposals, share them with each agent for one rebuttal round. Each agent sees all proposals and writes one targeted critique. See the brainstorm-prompt.md Phase 2 section for the rebuttal prompt.

Heavyweight directives skip Phase 2 -- proposals and challenge assessments are sufficient.

**Synthesis**

After collecting all outputs, synthesize into a brainstorm artifact:
- Identify convergence points across proposals
- Surface key disagreements and unresolved concerns from challenge assessments
- For strategic: note which critiques landed and which proposals survived challenge
- Extract 1-3 CEO clarification questions from unresolved concerns (used in the clarification step)

Write the synthesis to `.context/directives/{id}/brainstorm.md`.

### Spawn Pattern

```
Agent tool call (per participant):
  subagent_type: "{agent_id from registry}"
  model: "sonnet"
  run_in_background: true
  prompt: |
    {brainstorm prompt from brainstorm-prompt.md, with challenge_instruction included}
```

Collect results using TaskOutput for each agent ID. Wait for all to return.

### Error Handling

If a background agent fails or times out, log the error and continue. Brainstorm is advisory -- a failed participant does not block the pipeline. If ALL agents fail, note "brainstorm phase unavailable" and proceed.

### Update directive.json

Set `current_step: "clarification"` (the next step). Update `pipeline.brainstorm.status` to `"completed"` with `agent` (the participant first names array, same as the step entry), output summary including the brainstorm synthesis and any challenge assessments, and `artifacts: [".context/directives/{id}/brainstorm.md"]` if a brainstorm artifact was written.

**Next step:** Proceed to [04b-clarification.md](04b-clarification.md) (clarification) to verify directive intent with the CEO before the COO plans.
