# Game HUD Tabs Improvement

Make the game side-panel tabs actually useful. Currently they're mostly placeholder-quality.

## Problems

1. **Inbox is empty when it shouldn't be** — only shows sessions with waiting-approval/error/waiting-input status. Doesn't surface directive `awaiting_completion` state or backlog P0 items that need CEO attention.

2. **Intel tab is confusing** — name suggests scout intelligence but shows active directive + reports. Should show directive history, not just the active one. Reports could be richer.

3. **Wiki only shows lessons** — 6 hardcoded lesson files. Should surface more knowledge: vision.md, agent profiles, goal context files. Make it a real knowledge browser.

4. **Projects tab missing backlog** — Good drill-down for goals/projects/tasks but doesn't show backlog items under goals.

## Available Data (already in store, not surfaced)

- `workState.backlogs` — prioritized backlog items with P0/P1/P2
- `workState.conductor.directives` — full directive history
- `workState.conductor.discussions` / `research` — additional artifacts
- `directiveState.pipelineSteps[].needsAction` — actionable pipeline steps
- `events` — hook events

## Goal

Each tab should provide genuine value to the CEO. A CEO should be able to manage their AI company through these 5 tabs.
