# Lessons: Review Quality

> How reviews work, what makes them effective, common review pitfalls.
> Relevant to: Sarah (review), Marcus (product review), Morgan (process review)

## Reviewer Effectiveness

- **Domain-matched reviewers catch more than single-reviewer defaults.** Morgan reviewing process changes and Marcus reviewing CEO-facing changes both found gaps that a single Sarah review would have missed (DOD not in engineer prompt, stale template count, missing audit coverage checklist item). Match reviewer to what's being changed.
- **Never assign an agent to review changes to its own behavior.** Sarah reviewing changes to Sarah's review persona is a conflict of interest — the exact blind spot the review is supposed to catch. Same applies to Morgan reviewing changes to Morgan's planning.
- **Standing Corrections must be in a distributable file, not session memory.** MEMORY.md CRITICAL section was completely invisible to spawned agents (session-scoped). Moving corrections to preferences.md (which all agents receive) made them enforceable.
- **DOD must flow to both builder AND reviewer.** Initially only the reviewer received DOD items — the engineer was building blind to acceptance criteria. Include definition_of_done in the engineer's spawn prompt so they know what "done" looks like before starting.

## Build Regressions

- **Engineers remove existing sections when adding new ones nearby.** When an engineer adds a new section to a template file (e.g., report SKILL.md), they may accidentally delete adjacent sections. The Autopilot section was entirely removed while adding Corrections Caught. Multi-reviewer caught it — single-reviewer likely wouldn't have. Always diff the full file after edits to template files, not just the new additions.

## Risk Classification

- **When in doubt, classify UP.** A misclassified low-risk action that breaks something erodes trust faster than a medium-risk action that got CEO approval.
- **Guardrail violations are automatically high risk.** Any action that would violate a guardrail in `vision.md` requires CEO sign-off regardless of how "simple" it seems.
- **Dead code deletion is genuinely low risk.** If the auditor confirms files are dead (no imports, no route usage), deleting them is safe to auto-execute.

## Incomplete "Done" Items

- **"Done" in the backlog != actually wired in.** Integration work was once marked Done (files created, lessons documented, SKILL.md updated) but the skill was never modified to actually use the new pattern. The pieces existed but the integration point was missing. Root cause: the backlog checked off deliverables (files created) without checking the user-facing behavior (does the feature actually work end-to-end?). Fix: DOD for integration work must include "invoke the feature and verify end-to-end" — not just "files exist."
- **Backlog items should have a "verify" step.** Like the verify command for code (`npm run type-check`), process changes need a verification action: "Run `/directive test` and confirm the pipeline executes end-to-end." Without this, reviewers check the files but not the flow.

## Reachability Verification

- **"Code exists" is not "code is reachable."** Three agents reviewed a panel overhaul. All verified "component exists, switch case exists." None traced the full path from user action to rendered output. Result: 4 components were dead code — correct in isolation, but no user action could reach them. The wiring between layers was wrong.
- **Every new artifact must have a reachability path.** After building anything — UI component, API endpoint, config option, state field, event handler, CLI command — the reviewer must trace: (1) what triggers/calls it, (2) through what layers, (3) to what outcome. If there's no path from a user action to the thing you built, it's dead code regardless of how correct it is.
- **Classify by user impact, not crash risk.** "Dead code, no runtime impact" is still a bug if the code was supposed to be live. A feature that silently doesn't exist is worse than a feature that crashes — at least the crash gets noticed. An API endpoint that compiles but nothing calls is the same class of bug as a button that doesn't work.

## Agent Self-Triage

- **Agents must not downgrade instructions.** When told "fix ALL bugs," an agent classified 4 as "low severity — documented only" and skipped them. This is the agent deciding priorities the CEO didn't delegate. Applies to all agent types — builders who skip "minor" scope items, reviewers who wave through "low severity" findings, QA who documents instead of fixing. If the instruction says "all," it means all.
- **The orchestrator must not accept partial compliance.** When any agent returns "found N issues, fixed M, skipped K," the orchestrator should push back on the K immediately. The cost of asking "why not?" is low; the cost of shipping known issues is high. "Documented but not fixed" is not a valid completion state unless the CEO explicitly deprioritized it.

## Verify artifact_paths

- **Verify artifact_paths schema covers all process types.** The checkpoint-resume directive created artifact_paths with only 4 keys, but 7 process types produce 12 distinct artifact files. Sarah's review caught this during request-clarify-loops — always expand schema examples to match all known variants.

## Visual Features Require Visual Verification

- **TypeScript compiling is NOT verification for UI work.** Phase 3 Living Office marked all 9 initiatives "completed" with `npm run type-check && npm run build` as the only verify step. Zero visual verification was done. Result: z-sort was completely broken (characters cover desks/chairs), agent status binding showed all agents "offline" (scanner had 2MB limit, subagents were filtered out). Type-check catches syntax errors, not visual/functional correctness.
- **Game/canvas features MUST be browser-tested.** The project had `browser_test: true` in project.json but this flag was ignored — no one opened a browser. DOD criteria like "visually verified" were rubber-stamped without screenshots or human review.
- **End-to-end data flow must be tested with real data.** The agent binding initiative claimed "agent sprites reflect real session state" but never checked whether sessions actually HAD agentName populated. The frontend code was correct, the data pipeline was broken (2MB scan limit + isSubagent filter). A single API call (`curl /api/state | jq '.sessions[].agentName'`) would have caught this instantly.
- **DOD "met: true" without evidence is a lie.** If a DOD criterion says "All 25 seats visually verified" and no screenshot or browser session exists, it wasn't verified. Require evidence artifacts (screenshots, console output) for visual/functional DOD criteria, not just type-check passes.
