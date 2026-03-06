# Evaluation: Claude Code Execution Primitives for Parallel Builds

## Summary

We evaluated four Claude Code (CC) execution primitives for running parallel builds in the directive pipeline. The recommendation is to continue using **CLI spawns** (`claude -p --agent`) as the primary build primitive, with Agent tool background for research/review and `/batch` reserved for large-scale mechanical changes. Agent teams are parked pending CC stabilization.

---

## Primitives Compared

| Dimension | CLI Spawns (`claude -p --agent`) | Agent Tool (background) | `/batch` | Agent Teams |
|---|---|---|---|---|
| **Status** | Production-ready | Production-ready | Available | Non-functional (parked) |
| **Shell access** | Full Bash | Auto-rejected | Full (isolated worktree) | Unknown (goes idle) |
| **Isolation** | Shared worktree (same repo) | In-process (no Bash) | Separate git worktree per unit | Shared session context |
| **Parallelism** | Manual (CHILD_PIDS + trap) | Native (run_in_background) | Native (5-30 units) | Native (teammates) |
| **Output** | JSONL session files | Agent tool response | One PR per unit | SendMessage/TaskUpdate |
| **Coupled tasks** | Yes (shared filesystem) | N/A (no file writes) | No (isolated worktrees) | Untested |
| **Progress tracking** | Poll session files | Await completion | CC-managed | N/A |
| **Max concurrency** | Limited by system resources | Limited by CC internals | 5-30 units | Configured teammate count |
| **Custom agent support** | Yes (.claude/agents/*.md) | Yes (.claude/agents/*.md) | No | Yes (.claude/agents/*.md) |
| **Skill/hook support** | Full | Full | Limited | Full (in theory) |

---

## Detailed Findings

### 1. CLI Spawns (`claude -p --agent {name}`)

**How it works:** The orchestrator launches child `claude` processes via Bash, each running with a named agent persona. Processes are tracked in a `CHILD_PIDS` array with `trap` cleanup on EXIT to prevent orphans.

**Capabilities:**
- Full Bash access -- can run builds, tests, type-checks, git operations
- Reads `.claude/agents/*.md` for agent persona and instructions
- Each spawn gets its own session with full tool access
- Can write to shared filesystem (same repo checkout)
- Session output captured as JSONL for post-hoc analysis

**Limitations:**
- No built-in inter-process communication; tasks must be independent or coordinate via filesystem
- Merge conflicts possible when multiple spawns edit overlapping files
- Process management is manual (PID tracking, polling for completion)
- Each spawn consumes a full CC session (API cost)

**When to use:** Parallel builds where tasks need shell access and operate on non-overlapping files. This is the primary execution primitive for the directive pipeline.

**Current usage:** `09-execute-projects.md` uses this for all build tasks.

---

### 2. Agent Tool (run_in_background: true)

**How it works:** The orchestrator uses CC's built-in Agent tool to spawn a subagent that runs asynchronously. The parent continues working and is notified when the background agent completes.

**Capabilities:**
- Native async execution within the same CC session
- Can read files, search code, analyze content
- Supports custom agent personas via `.claude/agents/*.md`
- Good for tasks that are purely analytical (no shell needed)

**Limitations:**
- **Bash permission is auto-rejected** for background agents -- this is a CC platform constraint, not a bug
- Cannot run builds, tests, or any shell commands
- Cannot write files via Bash (can use Write tool but not compile/test)
- Subagents cannot spawn sub-subagents (confirmed via testing + GitHub issue #4182)

**When to use:** Research, code review, analysis, documentation review -- any task that needs to read and reason about code but not execute anything.

**Not suitable for:** Any task requiring shell access (builds, tests, linting, git operations).

---

### 3. /batch

**How it works:** CC's built-in `/batch` skill decomposes a task into 5-30 independent units. Each unit runs in an isolated git worktree and opens its own PR when complete.

**Capabilities:**
- Automatic work decomposition and parallelization
- Full git isolation per unit (no merge conflicts during execution)
- Full Bash access within each worktree
- Good for mass renames, refactors, or repetitive changes across many files

**Limitations:**
- **Each unit opens a separate PR** -- not suitable for coordinated feature work that should land as one commit
- Units are isolated and cannot see each other's changes during execution
- Not designed for coupled tasks where Task B depends on Task A's output
- Work decomposition is automated by CC, not controllable by the pipeline
- No custom agent persona support

**When to use:** Large-scale mechanical changes: renaming a symbol across 50 files, applying a pattern fix across many modules, updating imports after a restructure.

**Not suitable for:** Feature development, coupled tasks, or any work where changes need to be coordinated across files in a single commit.

---

### 4. Agent Teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)

**How it works:** An experimental CC feature where multiple "teammates" are configured and can be messaged via `SendMessage` and coordinated via `TaskUpdate`. Teammates share session context and can collaborate on tasks.

**Testing results:**
- Teammates spawn but **go idle without processing messages**
- `SendMessage` and `TaskUpdate` tools do not trigger teammate activity
- Multiple nudge attempts (re-sending messages, explicit wake-up prompts) all fail
- The feature appears to require a fresh CLI session to function -- it does not work when invoked from within an Agent tool subagent or an existing session

**Discovered subagent frontmatter fields** (may be relevant when teams stabilize):
- `permissionMode` -- control permission prompts
- `hooks` -- lifecycle hooks
- `skills` -- available skills
- `memory` -- persistent memory config
- `isolation: worktree` -- git worktree isolation
- `maxTurns` -- turn limit
- `background: true` -- background execution

**Status:** PARKED. The feature is experimental and non-functional in our usage pattern. We will re-evaluate when CC stabilizes agent teams for use within existing sessions.

**When to use (future):** If stabilized, agent teams could replace CLI spawns for tightly-coupled parallel work where teammates need to communicate mid-task.

---

## Recommendation

### Primary: CLI Spawns for Parallel Builds

The directive pipeline should continue using `claude -p --agent {name}` as the primary execution primitive for parallel builds. It is the only primitive that provides:

1. Full Bash access (builds, tests, type-checks)
2. Shared filesystem access (tasks can see the same repo state)
3. Custom agent personas (specialist casting via `.claude/agents/*.md`)
4. Proven reliability (currently in production in `09-execute-projects.md`)

### Secondary: Agent Tool Background for Research/Review

Use Agent tool with `run_in_background: true` for parallelizing non-build tasks:
- Code review (reading files, checking patterns, validating conventions)
- Research (analyzing codebase structure, finding dependencies)
- Documentation analysis

### Tertiary: /batch for Mechanical Mass Changes

Reserve `/batch` for rare large-scale mechanical operations:
- Cross-codebase renames
- Pattern-based refactors
- Import path updates after restructuring

### Parked: Agent Teams

Do not invest further in agent teams until CC ships a stable version. Re-evaluate when the experimental flag is removed or CC documents reliable usage from within existing sessions.

---

## Risk Mitigation for CLI Spawns

Since CLI spawns operate on a shared filesystem, the pipeline must guard against merge conflicts:

1. **Wave analysis** -- group tasks by file overlap; tasks touching the same files run sequentially
2. **Global sequential files** -- files like `package.json`, `tsconfig.json`, `prisma/schema.prisma` force sequential execution
3. **Post-wave diff check** -- after each wave, verify actual changed files match predicted `active_files`
4. **Process cleanup** -- `CHILD_PIDS` array with `trap` on EXIT prevents orphaned processes

These mitigations are covered by the `wave-analysis-algorithm` and `parallel-build-execution` tasks in this project.
