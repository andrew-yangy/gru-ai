#!/usr/bin/env bash
# validate-project-json.sh — Pre-execution enforcement
#
# Called before the execute step begins. Blocks execution if project.json
# doesn't exist or is missing required fields.
#
# Usage: echo "$JSON" | ./validate-project-json.sh
#
# Reads JSON from stdin with either:
#   { "directive_dir": "path/to/directive", "project_id": "project-slug" }
#   { "goal_folder": "goal-id", "directive_name": "directive-id" }
# and checks that the corresponding project.json exists and has required fields.
#
# Exit 0, no output = valid
# Exit 0, JSON output = validation result (valid: true/false, violations: [...])

set -euo pipefail

cd "$(git rev-parse --show-toplevel)" || { echo "Error: not in a git repo" >&2; exit 1; }

command -v jq >/dev/null 2>&1 || { echo "Error: jq is required" >&2; exit 1; }

# Read Morgan plan or directive info from stdin
INPUT=$(cat)

# Determine project.json path — supports both directive-based and goal-based paths
DIRECTIVE_DIR=$(echo "$INPUT" | jq -r '.directive_dir // empty')
PROJECT_ID=$(echo "$INPUT" | jq -r '.project_id // empty')
GOAL_FOLDER=$(echo "$INPUT" | jq -r '.goal_folder // empty')
DIRECTIVE_NAME=$(echo "$INPUT" | jq -r '.directive_name // .id // empty')

if [[ -n "$DIRECTIVE_DIR" && -n "$PROJECT_ID" ]]; then
  # New path: .context/directives/{id}/projects/{project-id}/project.json
  PROJECT_PATH="${DIRECTIVE_DIR}/projects/${PROJECT_ID}/project.json"
elif [[ -n "$GOAL_FOLDER" && -n "$DIRECTIVE_NAME" ]]; then
  # Legacy path: .context/goals/{goal}/projects/{directive}/project.json
  PROJECT_PATH=".context/goals/${GOAL_FOLDER}/projects/${DIRECTIVE_NAME}/project.json"
else
  echo '{"valid": false, "violations": ["Pass JSON with directive_dir+project_id or goal_folder+directive_name fields."]}'
  exit 0
fi

violations=()

# Check existence
if [[ ! -f "$PROJECT_PATH" ]]; then
  violations+=("project.json does not exist at ${PROJECT_PATH}. The approve step must create it before execution begins.")
  echo "{\"valid\": false, \"violations\": $(printf '%s\n' "${violations[@]}" | jq -R . | jq -s .)}"
  exit 0
fi

# Validate required fields
REQUIRED_FIELDS=("id" "title" "goal_id" "status" "description" "scope" "dod" "tasks")

for field in "${REQUIRED_FIELDS[@]}"; do
  val=$(jq -r ".${field} // empty" "$PROJECT_PATH" 2>/dev/null)
  if [[ -z "$val" || "$val" == "null" ]]; then
    violations+=("Missing required field: ${field}")
  fi
done

# Check agent is a non-empty array
AGENT_TYPE=$(jq -r '.agent | type' "$PROJECT_PATH" 2>/dev/null || echo "null")
AGENT_LEN=$(jq '.agent | length' "$PROJECT_PATH" 2>/dev/null || echo "0")
if [[ "$AGENT_TYPE" != "array" || "$AGENT_LEN" -eq 0 ]]; then
  violations+=("agent must be a non-empty array of builder agent names (e.g. [\"riley\"])")
fi

# Check reviewers is a non-empty array
REV_TYPE=$(jq -r '.reviewers | type' "$PROJECT_PATH" 2>/dev/null || echo "null")
REV_LEN=$(jq '.reviewers | length' "$PROJECT_PATH" 2>/dev/null || echo "0")
if [[ "$REV_TYPE" != "array" || "$REV_LEN" -eq 0 ]]; then
  violations+=("reviewers must be a non-empty array of reviewer agent names (e.g. [\"sarah\"])")
fi

# Check tasks is a non-empty array
TASK_COUNT=$(jq '.tasks | length' "$PROJECT_PATH" 2>/dev/null || echo "0")
if [[ "$TASK_COUNT" -eq 0 ]]; then
  violations+=("tasks array is empty — project.json must have at least one task defined before execution")
fi

# Check scope has in/out
SCOPE_IN=$(jq '.scope.in // empty' "$PROJECT_PATH" 2>/dev/null)
if [[ -z "$SCOPE_IN" || "$SCOPE_IN" == "null" ]]; then
  violations+=("scope.in is missing — builders need to know what's in scope")
fi

# Check dod is a non-empty array
DOD_COUNT=$(jq '.dod | length' "$PROJECT_PATH" 2>/dev/null || echo "0")
if [[ "$DOD_COUNT" -eq 0 ]]; then
  violations+=("dod array is empty — definition of done must be defined before execution")
fi

# Check each task has agent and dod arrays
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id // \"task-$i\"" "$PROJECT_PATH" 2>/dev/null)
  TASK_AGENT_TYPE=$(jq -r ".tasks[$i].agent | type" "$PROJECT_PATH" 2>/dev/null || echo "null")
  if [[ "$TASK_AGENT_TYPE" != "array" ]]; then
    violations+=("tasks[$TASK_ID].agent must be an array")
  fi
  TASK_DOD_TYPE=$(jq -r ".tasks[$i].dod | type" "$PROJECT_PATH" 2>/dev/null || echo "null")
  if [[ "$TASK_DOD_TYPE" != "array" ]]; then
    violations+=("tasks[$TASK_ID].dod must be an array")
  fi
done

if [[ ${#violations[@]} -eq 0 ]]; then
  echo '{"valid": true, "violations": []}'
else
  echo "{\"valid\": false, \"violations\": $(printf '%s\n' "${violations[@]}" | jq -R . | jq -s .)}"
fi
