<!-- Pipeline doc: 04-challenge.md | Source: SKILL.md restructure -->

## Step 2b: C-Suite Challenge (Heavyweight Directives Only)

**Default behavior:** Challenge is INLINED into Morgan's planning prompt (see Step 3). Morgan identifies the top 3 risks and flags over-engineering concerns as part of her planning output.

**Separate challenger agents are only spawned when:**
- The CEO explicitly flags the directive as controversial
- The directive is heavyweight AND crosses multiple domains (e.g., touches revenue + auth + UI)

When separate challengers ARE needed, spawn 1-2 relevant C-suite members:
- Security / architecture / technical debt → **Sarah**
- User-facing features / product changes → **Marcus**
- Growth / SEO / marketing / positioning → **Priya**
- Operational / process / resource changes → spawn **two** of the above (most relevant pair)

> See [docs/reference/templates/challenger-prompt.md](../reference/templates/challenger-prompt.md) for the full challenger prompt template.

> See [docs/reference/schemas/challenger-output.md](../reference/schemas/challenger-output.md) for the challenger JSON output schema.

**Spawn challengers in parallel** using `run_in_background: true`. Each is a lightweight agent call — use the agent's named `subagent_type` (e.g., `"sarah"`, `"marcus"`, `"priya"`), `model: "sonnet"` (fast, cheap — this is a gut check, not deep analysis).

```
Agent tool call (per challenger):
  subagent_type: "{agent_name}"
  model: "sonnet"
  run_in_background: true
  prompt: |
    {challenger prompt from template}
```

**Collect results** — after spawning all challengers, collect results using TaskOutput for each agent ID. Wait for all background agents to return before proceeding.

**Error handling** — if a background agent fails or times out, log the error and continue. Challenge is advisory — a failed challenger does not block the pipeline. If ALL challengers fail, note "challenge phase unavailable" and proceed to Morgan planning.

**Parse responses** as JSON. If any fail to parse, log the error and continue.

**Store challenges** — they get presented alongside Morgan's plan in Step 4.
