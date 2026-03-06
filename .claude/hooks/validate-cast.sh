#!/usr/bin/env bash
# validate-cast.sh — Mechanical casting validation for Morgan's plan JSON
#
# Validates that Morgan's project cast follows the casting rules:
# 1. Every project must have at least one reviewer
# 2. Builder (agent) must not be in the reviewers array
# 3. Complex projects (5+ tasks) must have at least one C-suite reviewer
# 4. Agents don't review changes to their own behavior/prompts
# 5. depends_on references must point to existing project IDs
# 6. No circular dependencies in depends_on graph
#
# Usage: cat morgan-plan.json | ./validate-cast.sh
#    or: ./validate-cast.sh < morgan-plan.json
#    or: ./validate-cast.sh /path/to/morgan-plan.json
#
# Output: JSON with valid/invalid status and violation list
# Exit 0 always (output contains the pass/fail decision)

set -euo pipefail

# Guard: jq is required
command -v jq >/dev/null 2>&1 || {
  echo '{"valid": false, "violations": [{"project_id": "_system", "rule": "dependency", "message": "jq is required but not installed"}]}'
  exit 0
}

# Read input: from file argument or stdin
if [[ $# -ge 1 ]] && [[ -f "$1" ]]; then
  PLAN_JSON=$(cat "$1")
else
  PLAN_JSON=$(cat)
fi

# Validate JSON is parseable
if ! echo "$PLAN_JSON" | jq empty 2>/dev/null; then
  echo '{"valid": false, "violations": [{"project_id": "_system", "rule": "json_parse", "message": "Input is not valid JSON"}]}'
  exit 0
fi

# Resolve path relative to script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY="$SCRIPT_DIR/../agent-registry.json"

# Fail gracefully if registry not found
if [[ ! -f "$REGISTRY" ]]; then
  echo '{"valid": false, "violations": [{"project_id": "_system", "rule": "registry", "message": "agent-registry.json not found at '"$REGISTRY"'"}]}'
  exit 0
fi

# C-suite agent names, excluding CEO (for complex project reviewer check)
CSUITE=$(jq -c '[.agents[] | select(.isCsuite == true and .id != "ceo") | .id]' "$REGISTRY")

# Agent-to-file mapping, excluding CEO and agents without agentFile (for self-review detection)
AGENT_FILES=$(jq -c '[.agents[] | select(.agentFile != null) | {(.id): .agentFile}] | add' "$REGISTRY")

VIOLATIONS=$(echo "$PLAN_JSON" | jq -r --argjson csuite "$CSUITE" --argjson agent_files "$AGENT_FILES" '
  # Build project list from .projects[] array
  (.projects // []) as $all_projects |
  ($all_projects | map(.id)) as $all_ids |
  [ $all_projects[] | . as $proj |

    # Rule 1: Every project must have at least one reviewer
    (if (.reviewers // [] | length) == 0 then
      {project_id: $proj.id, rule: "reviewer_required", message: "Project \($proj.id) has no reviewers assigned"}
    else empty end),

    # Rule 2: No builder (agent[]) should also be in reviewers array
    (($proj.reviewers // []) as $revs |
      ($proj.agent // [])[] | . as $builder |
      if ($revs | any(. == $builder)) then
        {project_id: $proj.id, rule: "builder_not_reviewer", message: "Project \($proj.id): builder \($builder) is also a reviewer (conflict of interest)"}
      else empty end
    ),

    # Rule 3: Complex/moderate projects must have at least one C-suite reviewer
    (if (.complexity // "simple") == "complex" or (.complexity // "simple") == "moderate" then
      if (.reviewers // []) | any(. as $r | $csuite | any(. == $r)) | not then
        {project_id: $proj.id, rule: "complex_csuite_reviewer", message: "Project \($proj.id) has complexity \(.complexity) but no C-suite reviewer. Reviewers: \(.reviewers // [] | join(", "))"}
      else empty end
    else empty end),

    # Rule 4: Agents should not review changes to their own behavior/prompts
    ((.reviewers // [])[] | . as $reviewer |
      ($agent_files[$reviewer] // null) as $agent_file |
      if $agent_file != null then
        if ($proj.scope_summary // "" | test($agent_file)) then
          {project_id: $proj.id, rule: "self_review", message: "Project \($proj.id): reviewer \($reviewer) is reviewing changes that include their own agent file (\($agent_file))"}
        else empty end
      else empty end
    ),

    # Rule 5: depends_on references must point to existing project IDs
    ((.depends_on // [])[] | . as $dep |
      if ($all_ids | any(. == $dep)) | not then
        {project_id: $proj.id, rule: "dangling_depends_on", message: "Project \($proj.id): depends_on references \"\($dep)\" which does not exist in the plan"}
      else empty end
    )

  ]
')

# Rule 6: Detect circular dependencies in depends_on graph
# Uses DFS-based cycle detection via jq
CYCLE_VIOLATIONS=$(echo "$PLAN_JSON" | jq -r '
  (.projects // []) as $all_projects |
  # Build adjacency map: {project_id: [depends_on_ids]}
  ($all_projects | map({(.id): (.depends_on // [])}) | add // {}) as $graph |
  ($all_projects | map(.id)) as $all_ids |

  # DFS cycle detection: iterate until stable
  # State: {visited: [], in_stack: [], cycles: [], to_visit: [starting_nodes]}
  # For each node, do iterative DFS
  def detect_cycles:
    $all_ids as $nodes |
    {visited: [], cycles: []} |
    reduce $nodes[] as $start (.;
      if (.visited | any(. == $start)) then .
      else
        # Iterative DFS using a stack of {node, path}
        .dfs_stack = [{node: $start, path: [$start]}] |
        .dfs_visited = [] |
        until(.dfs_stack | length == 0;
          .dfs_stack[-1] as $current |
          .dfs_stack = .dfs_stack[:-1] |
          if (.dfs_visited | any(. == $current.node)) then .
          else
            .dfs_visited += [$current.node] |
            reduce ($graph[$current.node] // [])[] as $neighbor (.;
              if ($current.path | any(. == $neighbor)) then
                # Found a cycle — extract the cycle portion
                ($current.path | to_entries | map(select(.value == $neighbor))[0].key) as $cycle_start |
                ($current.path[$cycle_start:] + [$neighbor]) as $cycle |
                .cycles += [{cycle: $cycle}]
              elif (.dfs_visited | any(. == $neighbor)) | not then
                .dfs_stack += [{node: $neighbor, path: ($current.path + [$neighbor])}]
              else .
              end
            )
          end
        ) |
        .visited += .dfs_visited
      end
    ) |
    .cycles;

  detect_cycles |
  [ .[] |
    {
      project_id: .cycle[0],
      rule: "circular_depends_on",
      message: "Circular dependency detected: \(.cycle | join(" -> "))"
    }
  ] |
  # Deduplicate cycles (same cycle can be found from different starting nodes)
  unique_by(.message)
')

# Merge violations from both passes
VIOLATIONS=$(echo "$VIOLATIONS" "$CYCLE_VIOLATIONS" | jq -s 'add')

# Count violations
VIOLATION_COUNT=$(echo "$VIOLATIONS" | jq 'length')

if [[ "$VIOLATION_COUNT" -eq 0 ]]; then
  echo '{"valid": true, "violations": []}'
else
  echo "$VIOLATIONS" | jq '{valid: false, violations: .}'
fi
