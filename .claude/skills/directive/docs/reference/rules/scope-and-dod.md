<!-- Reference: scope-and-dod.md | Source: SKILL.md restructure -->

# Scope Format, Definition of Done, and User Scenario Rules

## User Scenario Rules

- Every task must include a `user_scenario` — one sentence describing the user experience after this ships
- Good: "The CEO runs /directive and sees a telemetry summary with token costs and wall times at the end of the digest"
- Bad: "Improves the system" (too vague — what does the user actually experience?)
- Reviewers walk this scenario during review to verify the work delivers the promised experience

## Scope Format

Write 2-4 sentences describing what needs to happen. Focus on the outcome and approach, not specific files or line numbers. Example: "All API endpoints that accept user input need input validation and parameterized queries. Currently using string interpolation for SQL. Switch to Prisma parameterized queries and add Zod validation schemas."

## Definition of Done Rules

- Each task must include 3-5 specific, testable acceptance criteria in `definition_of_done`
- These are what the reviewer will verify — concrete conditions, not vague outcomes
- Good DOD: "Every /api/* route has a Zod schema and type-check passes"
- Bad DOD: "Security is improved" (too vague to verify)
- DOD should cover: functional correctness, scope completeness, and CEO-intent alignment
- If the directive has explicit success criteria, each criterion should map to at least one DOD item

Also from the first DOD block in Morgan's prompt:
- Every task MUST have a definition_of_done array with 2-5 concrete, testable criteria
- Each criterion must be verifiable (not vague like "improve quality")
- DOD is what the CEO reviews to approve/reject the task's result
- Examples of good DOD: "All 16 goal folders have goal.json", "Indexer reads goal.json and populates category field", "Type-check passes"
- Examples of bad DOD: "Improve goal structure", "Make it work", "Better code quality"
