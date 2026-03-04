<!-- Reference: phase-definitions.md | Source: SKILL.md restructure -->

# Phase Definitions — Composable Building Blocks

Instead of picking from a fixed process type taxonomy, specify the exact phases each initiative needs as an ordered array. Available phases:

- "research" — investigation, analysis, competitive intel (researcher agent)
- "product-spec" — product requirements + acceptance criteria (Marcus)
- "design" — technical approach document (Sarah)
- "keyword-research" — SEO keyword analysis (Priya, for content work)
- "outline" — content structure and plan (Priya, for content work)
- "clarification" — pre-build Q&A between engineer and designer/auditor (auto-added for complex work)
- "build" — implementation (engineer agent)
- "draft" — content writing (engineer, for content work)
- "seo-review" — SEO quality review (Priya, for content work)
- "review" — code/quality review (reviewer agents from cast)
- "tech-review" — architecture review (Sarah, for complex work)
- "product-review" — product spec verification (Marcus, for complex work)

## Common Phase Patterns (guidance, not rigid rules)

- Simple fix: ["build", "review"]
- Feature with design: ["design", "clarification", "build", "review"]
- Research-driven feature: ["research", "design", "clarification", "build", "review"]
- Full complex feature: ["product-spec", "design", "clarification", "build", "tech-review", "product-review"]
- Research only: ["research"] (no build — produces a report)
- Migration: ["research", "design", "clarification", "build", "review"] (build is incremental)
- Content: ["keyword-research", "outline", "draft", "seo-review", "review"]

## Clarification Phase Rules

- Auto-add "clarification" before "build" when the initiative has "design", "research", or "product-spec" phases
- Skip clarification for simple ["build", "review"] initiatives — scope is tight enough
- Skip for ["research"] only initiatives — no build phase to clarify
