<!-- Reference: checkpoint.md | Source: SKILL.md restructure -->

# Checkpoint JSON Schema

Checkpoints allow a directive to pause mid-execution and resume after context exhaustion. A single JSON file is overwritten atomically at each transition point.

**Checkpoint file:** `.context/directives/checkpoints/{directive-name}.json`
**Artifact files:** Write to the project directory: `.context/goals/{goal}/projects/{project}/{phase}.md`

```json
{
  "version": 1,
  "directive_name": "string",
  "directive_path": ".context/directives/{name}.md",
  "started_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "current_step": "step-3 | step-4 | step-4b | step-4c | step-5 | step-6 | step-7",
  "planning": {
    "morgan_plan": {},
    "ceo_approval": { "status": "approved|rejected", "modifications": [] },
    "worktree_path": "string | null"
  },
  "initiatives": [
    {
      "id": "string",
      "status": "pending | in_progress | completed | partial | skipped | failed",
      "phases": ["design", "build", "review"],
      "phases_completed": ["design", "build"],
      "current_phase": "review | null",
      "artifact_paths": { "research": "path | null", "product-spec": "path | null", "design": "path | null", "clarification": "path | null", "build": "path | null", "review": "path | null", "tech-review": "path | null", "product-review": "path | null", "keyword-research": "path | null", "outline": "path | null", "draft": "path | null", "seo-review": "path | null" },
      "review_findings": [],
      "dod_verification": {
        "criteria": [
          {
            "criterion": "DOD text from Morgan's plan",
            "met": true,
            "evidence": "What the reviewer observed that confirms or denies this criterion"
          }
        ],
        "all_met": true
      }
    }
  ],
  "wrapup": {
    "okrs_persisted": false,
    "follow_ups_processed": false,
    "digest_path": null,
    "lessons_updated": false
  }
}
```

**Write mechanism:** Use the Write tool to overwrite the entire checkpoint file. Always update `updated_at` to the current ISO timestamp. Create parent directories with `mkdir -p` on first write.

**Artifact writes:** After each phase completes in Step 5, write the phase output (design doc, build report, review JSON) to the project directory (`.context/goals/{goal}/projects/{project}/{phase}.md`). These survive context exhaustion and allow resumed runs to provide context to downstream phases.

### DOD Verification Field

The `dod_verification` field is written to the checkpoint by the review phase (Step 5) after each initiative's reviewer(s) complete their review. Step 5b (Review Verification) checks this field to enforce DOD compliance.

**When to write:** After the review phase for an initiative completes and the initiative status is set to `completed`, copy the reviewer's `dod_verification` output into the checkpoint's initiative entry.

**Schema:**
- `criteria[]`: Array of DOD items from Morgan's `definition_of_done`, each with `met` (boolean) and `evidence` (string from reviewer).
- `all_met`: Boolean. True only if every criterion has `met: true`. The Stop hook checks this field.

**Enforcement:** The Stop hook blocks completion if any completed initiative:
1. Has no `dod_verification` field (reviewer didn't write it)
2. Has `all_met: false` (one or more DOD criteria not satisfied)

The violation message specifies which initiative and which criteria are unverified, so the orchestrator knows exactly what to fix.
