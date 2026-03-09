<!-- Pipeline doc: 11-completion-gate.md | Source: pipeline-v2 directive -->

## Completion: CEO Completion Gate

After the wrapup step generates the digest and reports to the CEO, the directive enters the completion gate. ALL directives -- including lightweight -- require CEO sign-off before the status changes to `completed`.

### Status Flow

```
executing -> awaiting_completion -> completed
                                 -> reopened (CEO provides feedback, new projects added)
```

### After Wrapup

The wrapup step sets the directive status to `awaiting_completion` (NOT `completed`). This applies to all weight classes:

- **Lightweight**: Wrapup produces a short digest. Status becomes `awaiting_completion`. CEO reviews the digest summary and approves.
- **Medium**: Wrapup produces a full digest. Status becomes `awaiting_completion`. CEO reviews and approves.
- **Heavyweight/Strategic**: Wrapup produces a full digest. Status becomes `awaiting_completion`. CEO reviews digest + git diff + review findings before approving.

### CEO Actions

Present the completion gate to the CEO with:

1. The digest summary (key points, not the full file)
2. `git diff --stat main..directive/$ARGUMENTS` showing this directive's changes
3. Any review findings that need attention
4. Tasks with `failed` or `partial` status (if any) -- with explanations from the digest

Then ask the CEO:

```
Directive {name} is ready for completion review.

- Approve: Mark as completed. All work is satisfactory.
- Reopen: Provide feedback on what's missing. The COO will plan new projects.
```

### Approve Flow

When the CEO approves:

1. Update `.context/directives/{id}/directive.json`:
   - Set `status` to `"completed"`
   - Set `completed` to today's date (`YYYY-MM-DD`)
2. Update all project.json files in the directive's `produced_projects`:
   - If all tasks completed, set project `status` to `"completed"`
3. Log: `[COMPLETED] Directive {name} approved by CEO`

### Reject / Reopen Flow

When the CEO reopens with feedback:

1. Update `.context/directives/{id}/directive.json`:
   - Set `status` to `"reopened"`
   - Increment `revision` counter
   - Add new entry to `iterations[]` with `opened_at` timestamp and CEO feedback
2. Restart the pipeline from the plan step (COO planning) for NEW projects only
   - Existing completed projects are untouched
   - The COO plans additional projects to address CEO feedback
   - Same approval flow applies to new projects
3. Log: `[REOPENED] Directive {name} -- CEO feedback: {summary}`

### Non-Interactive Sessions

When the directive runs as a CLI session (non-interactive):
- Write the digest to `.context/reports/`
- Set status to `awaiting_completion`
- The CEO reviews and approves via a subsequent session or dashboard action
- The directive is NOT done until the CEO explicitly approves

### Update directive.json

Set `current_step: "completion"`. Set `pipeline.completion.status` to `"awaiting_completion"` with the digest path.
