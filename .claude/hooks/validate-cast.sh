#!/usr/bin/env bash
# validate-cast.sh — Mechanical casting validation for Morgan's plan JSON
#
# Validates that Morgan's initiative cast follows the casting rules:
# 1. Every initiative has an auditor
# 2. Builder is not in the reviewers array
# 3. Complex initiatives (5+ phases) have at least one C-suite reviewer
# 4. Agents don't review changes to their own behavior/prompts
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
  echo '{"valid": false, "violations": [{"initiative_id": "_system", "rule": "dependency", "message": "jq is required but not installed"}]}'
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
  echo '{"valid": false, "violations": [{"initiative_id": "_system", "rule": "json_parse", "message": "Input is not valid JSON"}]}'
  exit 0
fi

# Resolve path relative to script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY="$SCRIPT_DIR/../agent-registry.json"

# Fail gracefully if registry not found
if [[ ! -f "$REGISTRY" ]]; then
  echo '{"valid": false, "violations": [{"initiative_id": "_system", "rule": "registry", "message": "agent-registry.json not found at '"$REGISTRY"'"}]}'
  exit 0
fi

# C-suite agent names, excluding CEO (for complex initiative reviewer check)
CSUITE=$(jq -c '[.agents[] | select(.isCsuite == true and .id != "ceo") | .id]' "$REGISTRY")

# Agent-to-file mapping, excluding CEO and agents without agentFile (for self-review detection)
AGENT_FILES=$(jq -c '[.agents[] | select(.agentFile != null) | {(.id): .agentFile}] | add' "$REGISTRY")

VIOLATIONS=$(echo "$PLAN_JSON" | jq -r --argjson csuite "$CSUITE" --argjson agent_files "$AGENT_FILES" '
  [.initiatives[] | . as $init |

    # Rule 1: Every initiative must have an auditor
    (if (.cast.auditor // "" | length) == 0 then
      {initiative_id: $init.id, rule: "auditor_required", message: "Initiative \($init.id) has no auditor assigned"}
    else empty end),

    # Rule 2: Builder must not be in reviewers array
    (if (.cast.builder // "") as $builder |
      (.cast.reviewers // []) | any(. == $builder) then
      {initiative_id: $init.id, rule: "builder_not_reviewer", message: "Initiative \($init.id): builder \(.cast.builder) is also a reviewer (conflict of interest)"}
    else empty end),

    # Rule 3: Complex initiatives (5+ phases) must have at least one C-suite reviewer
    (if (.phases | length) >= 5 then
      if (.cast.reviewers // []) | any(. as $r | $csuite | any(. == $r)) | not then
        {initiative_id: $init.id, rule: "complex_csuite_reviewer", message: "Initiative \($init.id) has \(.phases | length) phases (complex) but no C-suite reviewer. Reviewers: \(.cast.reviewers // [] | join(", "))"}
      else empty end
    else empty end),

    # Rule 4: Agents should not review changes to their own behavior/prompts
    # Check if any reviewer would be reviewing changes to their own agent .md file
    ((.cast.reviewers // [])[] | . as $reviewer |
      ($agent_files[$reviewer] // null) as $agent_file |
      if $agent_file != null then
        if ($init.scope // "") | test($agent_file) then
          {initiative_id: $init.id, rule: "self_review", message: "Initiative \($init.id): reviewer \($reviewer) is reviewing changes that include their own agent file (\($agent_file))"}
        else empty end
      else empty end
    )

  ]
')

# Count violations
VIOLATION_COUNT=$(echo "$VIOLATIONS" | jq 'length')

if [[ "$VIOLATION_COUNT" -eq 0 ]]; then
  echo '{"valid": true, "violations": []}'
else
  echo "$VIOLATIONS" | jq '{valid: false, violations: .}'
fi
