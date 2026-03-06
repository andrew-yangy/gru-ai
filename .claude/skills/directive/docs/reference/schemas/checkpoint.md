<!-- Reference: checkpoint.md — DEPRECATED, merged into directive-json.md -->

# Checkpoint Schema — MERGED INTO directive.json

**There is no separate checkpoint file.** All checkpoint data lives in `directive.json`.

See [directive-json.md](directive-json.md) for the full schema including:
- `pipeline{}` — per-step status, agent, output, artifacts
- `current_step` — for resume
- `tasks[]` — with phases, artifact_paths, dod_verification
- `planning{}` — morgan_plan, ceo_approval, worktree_path
- `wrapup{}` — digest_path, lessons_updated, follow_ups_processed

**Resume:** Read `.context/directives/{name}/directive.json` and check `current_step`.

**Write protocol:** Overwrite directive.json at each step transition. Always update `updated_at`.

**DOD Verification:** Written by the review phase into `tasks[].dod_verification`. The review-gate checks this field.
