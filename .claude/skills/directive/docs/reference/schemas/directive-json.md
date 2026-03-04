<!-- Reference: directive-json.md | Source: SKILL.md restructure -->

# directive.json Companion File Schema

This companion JSON provides structured metadata for the indexer and cross-reference system. Created alongside the directive .md file.

```json
{
  "id": "$ARGUMENTS",
  "title": "{extracted from first heading of the .md}",
  "status": "in_progress",
  "created": "{today's date YYYY-MM-DD}",
  "completed": null,
  "weight": "{classification from Step 0b: lightweight | medium | heavyweight | strategic}",
  "goal_ids": ["{goal IDs from directive content — parse 'Goal alignment:' or infer from directive name}"],
  "produced_features": [],
  "report": null,
  "backlog_sources": []
}
```

**Extracting `goal_ids`** from the directive .md content:
- Look for `**Goal alignment**: {goal-id}` in the directive text
- If not found, infer from the directive name (e.g., `sellwisely-*` -> `sellwisely-revenue`, `conductor-*` -> `agent-conductor`)
- If uncertain, leave as empty array — it will be populated during Step 6

**On completion (Step 6f):**
- Set `status` to `"completed"`
- Set `completed` to today's date (`YYYY-MM-DD`)
- Set `report_summary` to the digest filename

Directives stay in `directives/` — status is tracked in JSON, not by directory location.
