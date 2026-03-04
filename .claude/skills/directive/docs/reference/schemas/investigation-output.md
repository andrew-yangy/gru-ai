<!-- Reference: investigation-output.md | Source: redesign-pipeline-steps -->

# Investigation Output JSON Schema

Output from the Investigator agent (first phase of the two-agent audit flow). Contains pure data -- no recommendations, no risk classifications, no follow-ups.

The Architect agent receives this output as input when producing design recommendations.

```json
{
  "initiatives": [
    {
      "id": "slug matching Morgan's initiative id",
      "baseline": "Real measured baseline (e.g., '4 endpoints use string interpolation for SQL')",
      "active_files": ["files that are in use and need work"],
      "dead_code": ["files that exist but aren't actively used"],
      "findings": "What was found in the codebase — specific, factual, no recommendations",
      "constraints": ["Codebase patterns, conventions, or technical debt that affect this scope"]
    }
  ]
}
```

## Field Definitions

- **id**: Matches the initiative slug from Morgan's plan.
- **baseline**: Exact measurements. Numbers, not vague qualifiers. "4 endpoints" not "several endpoints."
- **active_files**: Files that exist, are actively imported/used, and need modification for this initiative.
- **dead_code**: Files that exist but have no active imports, route references, or usage. Candidates for cleanup.
- **findings**: Factual observations about the codebase state. What patterns exist, what conventions are used, what state things are in. No recommendations.
- **constraints**: Technical debt, naming conventions, architectural patterns, or existing abstractions that would affect how this initiative is implemented. The Architect uses these to make informed design decisions.

## What This Schema Does NOT Include

- `recommended_approach` — that's the Architect's job (see audit-output.md)
- `follow_ups` — the Architect produces these
- `risk` classifications — the Architect classifies risk informed by these findings
