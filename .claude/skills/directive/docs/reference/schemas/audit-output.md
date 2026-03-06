<!-- Reference: audit-output.md | Source: SKILL.md restructure, updated by redesign-pipeline-steps -->

# Audit Output JSON Schema (Architect)

This is the **Architect's** output schema — the second phase of the two-agent audit flow. The Architect receives the Investigator's raw data (see [investigation-output.md](investigation-output.md)) and Morgan's plan, then produces design recommendations.

For the Investigator's output schema (pure data, no recommendations), see [investigation-output.md](investigation-output.md).

```json
{
  "projects": [
    {
      "id": "slug matching Morgan's project id",
      "baseline": "Carried forward from investigation data",
      "active_files": ["Carried forward from investigation data"],
      "dead_code": ["Carried forward from investigation data"],
      "findings": "Investigation findings + additional design-relevant observations",
      "recommended_approach": "How to implement this, referencing real patterns and files from the investigation",
      "follow_ups": [
        {
          "action": "Short description of what to do",
          "risk": "low | medium | high",
          "rationale": "Why this risk level — what could go wrong?",
          "files": ["affected files, if known"]
        }
      ]
    }
  ]
}
```

## Two-Agent Audit Flow

1. **Investigator** scans the codebase and produces investigation-output.md (pure data)
2. **Architect** reads investigation data + Morgan's plan and produces this schema (design recommendations)

The separation prevents investigation findings from anchoring the design — the Architect sees raw data and forms independent recommendations.

## Field Definitions

- **baseline, active_files, dead_code**: Carried forward from the Investigator's output for downstream reference.
- **findings**: Investigation findings plus any additional observations the Architect makes about design implications.
- **recommended_approach**: Specific implementation recommendation referencing real files and patterns discovered by the Investigator. This field is passed verbatim to the builder as implementation context and to the code-reviewer for deviation checking. Be concrete — name files, functions, and patterns.
- **follow_ups**: Actions discovered during design, each with a risk classification (low/medium/high). The Investigator does not produce follow-ups — only the Architect does.
