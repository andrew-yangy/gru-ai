<!-- Reference: phase-definitions.md | Source: SKILL.md restructure -->

# Phase Definitions — Composable Building Blocks

Instead of picking from a fixed process type taxonomy, specify the exact phases each task needs as an ordered array. Available phases:

- "research" — investigation, analysis, competitive intel (researcher agent)
- "product-spec" — product requirements + acceptance criteria (Marcus)
- "design" — technical approach document (Sarah)
- "keyword-research" — SEO keyword analysis (Priya, for content work)
- "outline" — content structure and plan (Priya, for content work)
- "clarification" — pre-build Q&A between engineer and designer/auditor (auto-added for complex work)
- "build" — implementation (engineer agent)
- "draft" — content writing (engineer, for content work)
- "seo-review" — SEO quality review (Priya, for content work)
- "code-review" — independent review using cast reviewers with full files + diff but no builder reasoning (fresh eyes catch bugs)
- "review" — code/quality review (reviewer agents from cast — checks DOD, user perspective, corrections)
- "tech-review" — architecture review (Sarah, for complex work)
- "product-review" — product spec verification (Marcus, for complex work)

## Common Phase Patterns (guidance, not rigid rules)

- Simple fix: ["build", "review"]
- Integration-touching fix: ["build", "code-review", "review"]
- Complex project task: ["design", "clarification", "build", "code-review", "review"] (only within multi-project plans)
- Research only: ["research"] (no build — produces a report)
- Migration: ["research", "design", "clarification", "build", "review"] (build is incremental)
- Content: ["keyword-research", "outline", "draft", "seo-review", "review"]

## Code-Review Phase Rules

- Include "code-review" between "build" and "review" when the task touches integration points (data flows between systems, state management, API boundaries) or has >3 DOD criteria
- Skip for trivial fixes (rename, config change, single-file edit with 1-2 DOD criteria)
- The code-review phase uses the SAME reviewers from the cast, but with full files + diff and NO builder reasoning/design docs. Fresh eyes catch bugs that contextual reviewers miss.
- If the builder is also in the reviewers list, they are skipped for code-review (conflict of interest).
- For moderate/complex tasks inside projects: always include code-review.

## Clarification Phase Rules

- Auto-add "clarification" before "build" when the task has "design", "research", or "product-spec" phases
- Skip clarification for simple ["build", "review"] tasks — scope is tight enough
- Skip for ["research"] only tasks — no build phase to clarify
