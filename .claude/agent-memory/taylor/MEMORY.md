# Taylor Chen -- Content Builder Memory

## Pipeline v2 Terminology (2026-03-06)
- **Directive > Project(s) > Task(s)** -- the official hierarchy
- Morgan outputs `projects[]` (not `initiatives[]` or `tasks[]`)
- Task decomposition happens in Step 3c (07b-project-brainstorm.md) by Sarah + builder
- Morgan does NOT output tasks or DOD per project -- only scope, cast, priority
- `09-execute-projects.md` (was `09-execute-initiatives.md`)
- `11-completion-gate.md` -- new Step 8, all weights get `awaiting_completion`
- Schemas dir excluded from terminology cleanup (handled by separate project)

## Content Patterns
- When replacing terminology across many files, verify with `grep -ri` after ALL changes
- Historical narrative in lessons files should NOT be updated -- only prescriptive guidance
- Vision.md uses "initiatives" to mean business proposals (not pipeline items) -- that usage is correct
- Agent description fields in YAML frontmatter need updating too (easy to miss)
