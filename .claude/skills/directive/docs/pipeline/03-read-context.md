<!-- Pipeline doc: 03-read-context.md | Source: SKILL.md restructure -->

## Step 2: Read Context

Read ALL of these before spawning the COO:
- `.context/vision.md` — north star + guardrails (agents must respect guardrails)
- `.context/preferences.md` — CEO standing orders (agents must follow these)
- `.context/directives/*/directive.json` — current directives and status
- `.context/lessons/*.md` — project gotchas and patterns (read topic files as needed per agent role)
- `.context/lessons/orchestration.md` — for the COO and orchestration
- `.context/lessons/agent-behavior.md` — for all agents
- All `.context/directives/*/projects/*/project.json` — current project states and task status
- The C-suite agent personality files (resolve names from `.claude/agent-registry.json`)
