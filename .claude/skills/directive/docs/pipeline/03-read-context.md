<!-- Pipeline doc: 03-read-context.md | Source: SKILL.md restructure -->

## Step 2: Read Context

Read ALL of these before spawning the COO:
- `.context/vision.md` — north star + guardrails (agents must respect guardrails)
- `.context/preferences.md` — CEO standing orders (agents must follow these)
- `.context/directives/*/directive.json` — current directives and status
- `.context/lessons/*.md` — project gotchas and patterns (read topic files as needed per agent role)
- `.context/lessons/orchestration.md` — for the COO and orchestration
- `.context/lessons/agent-behavior.md` — for all agents
- `.context/design/*.md` — system design rationale (why the system works the way it does). Read all design docs — they are short and high-signal. Pass relevant ones to agents based on task domain.
- All `.context/directives/*/projects/*/project.json` — current project states and task status
- The C-suite agent personality files (resolve names from `.claude/agent-registry.json`)

### Update directive.json

Set `current_step: "audit"` (the next step). Update `pipeline.context.status` to `"completed"` with output summary listing what was read.
