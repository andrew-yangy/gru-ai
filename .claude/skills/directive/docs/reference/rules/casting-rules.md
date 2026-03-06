<!-- Reference: casting-rules.md | Source: SKILL.md restructure -->

# Casting Rules

## Delegation Principle

C-suite agents (Sarah, Marcus, Morgan, Priya) focus on STRATEGY — planning, auditing, challenging, and cross-cutting reviews. Specialists (Riley, Jordan, Casey, Taylor, Sam, Devon, Quinn) handle EXECUTION — building AND routine domain-specific reviews. Do NOT have C-suite do work that a specialist can handle. The orchestrator (directive session) delegates but does NOT build, review, or audit.

## Auditing

- Security/architecture audits → Sarah
- User-facing/product audits → Marcus or Sarah
- Growth/marketing audits → Priya
- Routine codebase audits for simple tasks → specialists can audit their own domain (Riley audits frontend, Jordan audits backend, Casey audits data pipelines)

## Reviewing

- Simple frontend work → Riley reviews (not Sarah, unless security-sensitive)
- Simple backend work → Jordan reviews (not Sarah, unless architecture-sensitive)
- Simple data/pipeline work → Casey reviews
- QA/testing/validation → Sam reviews
- UI design and visual quality → Quinn reviews (design review for any UI-touching task)
- Cross-cutting or architecture-sensitive work → Sarah reviews
- User-facing product/UX decisions → Marcus reviews
- Process/pipeline/operational changes → Morgan reviews
- Growth/SEO/content quality → Priya reviews
- Complex or risky work → C-suite reviewer + specialist reviewer (dual review)

## General

- Simple work (1-2 phases) → specialist builder + specialist reviewer (same domain, different person if possible; same person OK if solo domain)
- Moderate work (3-4 phases) → specialist builder + C-suite reviewer (for strategic oversight)
- Complex work (5+ phases) → full team: C-suite designs/audits, specialist builds, C-suite + specialist review
- Every project MUST have an auditor — this is who scans the codebase in the audit step
- Match reviewers to the domain being changed — don't default to Sarah for everything
- Never have the builder review their own build (conflict of interest)
- Never have an agent review changes to its own behavior/prompts (conflict of interest)

## Specialist Builder Assignment (file-pattern matching)

When the audit reveals which files an task will touch, assign the matching specialist:
- Files in `src/components/`, `*.tsx`, `*.jsx`, or UI/styling work → `"agent": ["riley"]` (Frontend Developer)
- Files in `server/`, API routes, WebSocket, watchers, or backend logic → `"agent": ["jordan"]` (Backend Developer)
- Files in `scripts/`, `server/parsers/`, `server/state/`, data pipelines, or indexing → `"agent": ["casey"]` (Data Engineer)
- Files in `.context/`, `*.md`, `*.mdx`, documentation, or content creation → `"agent": ["taylor"]` (Content Builder)
- Testing, verification, type-checking, or QA-focused work → `"agent": ["sam"]` (QA Engineer)
- When scope crosses domains, use the DOMINANT domain's specialist
- When no clear domain match or scope is very broad, use `"agent": ["devon"]` (Full-Stack Engineer)
- Devon handles cross-domain work that doesn't clearly belong to a single specialist

## Reviewer-Type Definitions

When casting reviewers, each type focuses on their domain:

### C-Suite reviewers (strategic/cross-cutting — use for complex, risky, or multi-domain work):
- **Sarah (architecture/security)**: Code patterns, type safety, security vulnerabilities, performance, schema correctness, dependency risks. Use when work is security-sensitive, touches data models, or crosses system boundaries.
- **Marcus (product/UX)**: User workflow completeness, product spec alignment, dead-end UI, first-impression clarity, CEO-intent match. Use when work affects what the CEO sees or touches.
- **Morgan (operations/process)**: Conductor process compliance, operational correctness, sequencing logic, casting rule adherence, checkpoint integrity. Use when work changes how the pipeline operates.
- **Priya (growth/content)**: SEO preservation, content quality, keyword targeting, internal linking, growth metric impact. Use when work affects public content or growth metrics.

### Specialist reviewers (domain-specific — use for routine, single-domain work):
- **Riley (frontend)**: Component patterns, Tailwind conventions, state management, UI consistency, responsive behavior, accessibility. Use for routine frontend builds.
- **Quinn (design)**: Layout fidelity, visual consistency, usability, responsiveness, polish. Use as design reviewer on any UI-touching task. During planning, collaborates with Sarah to produce design prototypes.
- **Jordan (backend)**: API patterns, error handling, WebSocket correctness, watcher logic, server performance. Use for routine backend builds.
- **Casey (data)**: Parser correctness, indexer logic, state file integrity, data pipeline accuracy. Use for data/pipeline builds.
- **Sam (QA)**: Type safety, build validation, test coverage, verification completeness, regression risk. Use as a second reviewer on any build for quality assurance.

## Multi-Reviewer Casting Guidance

- Simple frontend work → Riley reviews (Sarah only if security-sensitive)
- Simple backend work → Jordan reviews (Sarah only if architecture-sensitive)
- Simple data work → Casey reviews
- UI-touching tasks that affect CEO workflow → Riley builds + Quinn design-reviews + Marcus reviews
- Complex/risky work → specialist builds + C-suite reviews (dual layer)
- Process/conductor changes → Morgan reviews (she owns the pipeline)
- Content/SEO work → Priya reviews + Taylor builds
- Any task → optionally add Sam as second reviewer for QA coverage
- Default: single specialist reviewer is fine for simple, single-domain work. Escalate to C-suite reviewer when the work is risky, cross-cutting, or user-facing.
