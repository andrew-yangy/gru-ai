<!-- Reference: current-json.md | Source: SKILL.md restructure -->

# Dashboard current.json Schema (Directive State)

The directive state file for dashboard tracking. Written to `~/.claude/directives/current.json`.

```json
{
  "directiveName": "$ARGUMENTS",
  "status": "in_progress",
  "totalInitiatives": N,
  "currentInitiative": 0,
  "currentPhase": "starting",
  "initiatives": [
    {"id": "slug", "title": "Human-readable", "status": "pending", "phase": null}
  ],
  "startedAt": "ISO timestamp",
  "lastUpdated": "ISO timestamp"
}
```

**Update this file before each initiative and phase change** throughout Step 5. The conductor dashboard watches this file via chokidar for real-time progress display.

At Step 7 (completion), update status to `"completed"` or `"failed"`.
