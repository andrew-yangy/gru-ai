# Data Model — Domain Knowledge

## What This Goal Covers
- Context tree directory structure and conventions
- Entity schemas: goal.json, project.json, directive.json, backlog.json
- Relationships between entities (FK references, filesystem discovery)
- Dashboard read patterns (glob-based direct file reading)
- Migration tooling for schema evolution

## Key Design Decisions
- JSON is the source of truth for state, markdown for content
- Three-tier hierarchy: Goal > Project > Task (no 4th tier)
- Tasks embedded in project.json (no separate task files)
- Projects nested under goals on filesystem: `goals/{id}/projects/{pid}/`
- Directives flat, linked to goals/projects via triage field
- No indexer — dashboard reads source files directly via glob + chokidar
- Context co-located with parent entity (.md files live in entity directories)

## Origin
Consolidates data model work from the original "agent-conductor" catch-all goal. The context tree redesign (2026-03-03) established the definitive schema specification.
