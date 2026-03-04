<!-- Reference: morgan-plan.md | Source: SKILL.md restructure -->

# Morgan Plan JSON Schema

Morgan's output must follow this schema EXACTLY:

```json
{
  "goal": "CEO's goal title",
  "goal_folder": "which .context/goals/ folder this belongs to (existing or new)",
  "challenges": {
    "risks": ["Top 3 risks with this directive — be specific, not generic"],
    "over_engineering_flags": ["Anything in the directive that's scoped too broadly or could be simpler"],
    "recommendation": "Proceed as-is | Simplify (explain how — but still deliver everything)"
  },
  "initiatives": [
    {
      "id": "slug-id",
      "title": "Human-readable title",
      "priority": "P0 | P1 | P2",
      "complexity": "simple | moderate | complex",
      "phases": ["build", "review"],
      "user_scenario": "One sentence: how the user will experience this change when it ships",
      "cast": {
        "auditor": "sarah | priya | riley | jordan | casey (who investigates the codebase — specialists can audit their own domain for simple work; C-suite for complex/cross-cutting)",
        "researcher": "priya | sarah (optional, only for phases including research)",
        "product_spec": "marcus (optional, only when phases include product-spec)",
        "designer": "sarah (optional, when phases include design)",
        "builder": "engineer | riley | jordan | casey | taylor | sam (engineer = generic, named = specialist with domain template)",
        "reviewers": ["sarah | marcus | morgan | priya | riley | jordan | casey | sam — one or more, matched to domain. Prefer specialists for routine code review; reserve C-suite for strategic/cross-cutting review"]
      },
      "scope": "High-level description of what needs to happen and why",
      "verify": "verification command — use `npm run type-check` (NOT lint, which OOMs on large projects)",
      "definition_of_done": ["Concrete, testable acceptance criterion 1", "Criterion 2", "..."]
    }
  ]
}
```
