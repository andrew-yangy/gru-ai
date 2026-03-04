<!-- Reference: brainstorm-output.md | Source: SKILL.md restructure -->

# Brainstorm Agent Output JSON Schema

## Phase 1: Initial Proposal

All brainstorm participants (C-suite + auditor) output this in both heavyweight and strategic directives.

```json
{
  "agent": "{name}",
  "approach": "Your recommended approach in 3-5 sentences — be specific about what to build/change and in what order",
  "tradeoffs": ["Key trade-off 1", "Key trade-off 2"],
  "avoid": "What approach you'd explicitly NOT take and why",
  "confidence": "high | medium | low — how certain are you this is the right approach?",
  "feasibility_flags": ["Codebase constraints or existing patterns that affect this approach — auditor fills this, others may leave empty"]
}
```

## Phase 2: Rebuttal (Strategic Directives ONLY)

Each agent outputs one rebuttal after seeing all proposals. **Not used for heavyweight directives.**

```json
{
  "agent": "{name}",
  "target_agent": "name of the agent whose proposal is being rebutted",
  "critique": "What's wrong with their approach — specific about what they missed or got wrong",
  "alternative": "What should be done instead, referencing original proposal or a new variation"
}
```

## Collected Output Structure

The orchestrator collects all outputs into a single brainstorm artifact:

```json
{
  "directive": "{directive-name}",
  "weight": "heavyweight | strategic",
  "participants": ["agent names"],
  "proposals": [
    { "agent": "...", "approach": "...", "tradeoffs": [], "avoid": "...", "confidence": "...", "feasibility_flags": [] }
  ],
  "rebuttals": [
    { "agent": "...", "target_agent": "...", "critique": "...", "alternative": "..." }
  ],
  "synthesis": "Synthesis of convergence points, key disagreements, and (for strategic) which critiques landed"
}
```

**Note:** `rebuttals` array is empty for heavyweight directives (no deliberation round).
