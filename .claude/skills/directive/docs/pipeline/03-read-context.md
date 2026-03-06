<!-- Pipeline doc: 03-read-context.md | Source: SKILL.md restructure -->

## Step 2: Read Context

Read ALL of these before spawning Morgan:
- `.context/vision.md` — north star + guardrails (agents must respect guardrails)
- `.context/preferences.md` — CEO standing orders (agents must follow these)
- `.context/goals/*/goal.json` — current goals and priorities
- `.context/lessons/*.md` — project gotchas and patterns (read topic files as needed per agent role)
- `.context/lessons/orchestration.md` — for Morgan and orchestration
- `.context/lessons/agent-behavior.md` — for all agents
- All `.context/goals/*/backlog.json` files — so Morgan doesn't plan work that's already queued
- All `.context/goals/*/projects/*/project.json` — current project states and task status
- The agent personality files Morgan may cast:
  - `.claude/agents/sarah-cto.md`
  - `.claude/agents/marcus-cpo.md`
  - `.claude/agents/priya-cmo.md`

Also note the goal.json `okrs` field if populated — this goes to the auditor in the audit step, not Morgan.
