#!/usr/bin/env bash
# validate-gate.sh — Artifact-chain enforcement at pipeline step boundaries
#
# For each pipeline step, validates that all prerequisite artifacts exist and are
# structurally valid before allowing the next step to proceed.
#
# Usage: ./validate-gate.sh <directive-dir> <target-step>
#
# Arguments:
#   directive-dir  Path to the directive directory (e.g., .context/directives/pipeline-v2)
#   target-step    The step about to run (e.g., "plan", "execute", "review", "wrapup")
#
# Per-task gates (execute, review):
#   ./validate-gate.sh <directive-dir> execute [task-id]
#   ./validate-gate.sh <directive-dir> review [task-id]
#   When task-id is provided, checks that specific task's prerequisite artifact exists.
#   When omitted for "execute", checks project.json exists; for "review", checks all tasks.
#
# Weight-conditional steps accept .skip marker files (e.g., brainstorm.skip)
# for lightweight directives that skip those steps.
#
# Output: JSON { valid: bool, violations: [], step: string, directive: string }
# On pass: also writes gates.{step} into directive.json (atomic write)
# Exit: always 0 (result in JSON output)

set -euo pipefail

# ---------------------------------------------------------------------------
# Gate Configuration
# ---------------------------------------------------------------------------
# Each pipeline step and what it requires BEFORE it can run.
#
# Format: GATE_<STEP>_ARTIFACTS — space-separated list of "type:path[:required_fields]"
#   type = "file" (existence check) | "json" (existence + field validation)
#   path = relative to directive dir, supports {project-id} and {task-id} placeholders
#   required_fields = comma-separated jq paths (for json type only)
#
# Weight skip rules (from directive-watcher.ts SKIPPED_STEPS):
#   lightweight: skips brainstorm, project-brainstorm, audit, approve
#   medium: skips nothing
#   heavyweight: skips nothing
#   strategic: skips nothing
#
# .skip marker convention:
#   For weight-conditional steps, a file named "{step}.skip" in the directive dir
#   satisfies the gate. Example: brainstorm.skip means brainstorm was legitimately
#   skipped for this weight class.
# ---------------------------------------------------------------------------

# Steps that can be skipped per weight class
# Format: SKIP_<WEIGHT> is a space-separated list of skippable steps
SKIP_lightweight="challenge brainstorm project-brainstorm audit approve"
SKIP_medium="challenge"
SKIP_heavyweight=""
SKIP_strategic=""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

command -v jq >/dev/null 2>&1 || {
  echo '{"valid":false,"violations":[{"rule":"dependency","message":"jq is required but not installed"}],"step":"_system","directive":"_system"}'
  exit 0
}

usage() {
  echo '{"valid":false,"violations":[{"rule":"usage","message":"Usage: validate-gate.sh <directive-dir> <target-step> [task-id]"}],"step":"_system","directive":"_system"}'
  exit 0
}

if [[ $# -lt 2 ]]; then
  usage
fi

DIRECTIVE_DIR="$1"
TARGET_STEP="$2"
TASK_ID="${3:-}"

# Resolve to repo root for consistent paths
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# If directive-dir is relative, make it relative to repo root
if [[ ! "$DIRECTIVE_DIR" = /* ]]; then
  DIRECTIVE_DIR_ABS="${REPO_ROOT}/${DIRECTIVE_DIR}"
else
  DIRECTIVE_DIR_ABS="$DIRECTIVE_DIR"
  # Make relative for output
  DIRECTIVE_DIR="${DIRECTIVE_DIR#${REPO_ROOT}/}"
fi

if [[ ! -d "$DIRECTIVE_DIR_ABS" ]]; then
  echo '{"valid":false,"violations":[{"rule":"directory","message":"Directive directory does not exist: '"$DIRECTIVE_DIR"'"}],"step":"'"$TARGET_STEP"'","directive":"'"$DIRECTIVE_DIR"'"}'
  exit 0
fi

# Read directive.json
DIRECTIVE_JSON="$DIRECTIVE_DIR_ABS/directive.json"
if [[ ! -f "$DIRECTIVE_JSON" ]]; then
  echo '{"valid":false,"violations":[{"rule":"directive_json","message":"directive.json not found in '"$DIRECTIVE_DIR"'"}],"step":"'"$TARGET_STEP"'","directive":"'"$DIRECTIVE_DIR"'"}'
  exit 0
fi

if ! jq empty "$DIRECTIVE_JSON" 2>/dev/null; then
  echo '{"valid":false,"violations":[{"rule":"invalid_directive_json","message":"directive.json is not valid JSON"}],"step":"'"$TARGET_STEP"'","directive":"'"$DIRECTIVE_DIR"'"}'
  exit 0
fi

DIRECTIVE_ID=$(jq -r '.id // "unknown"' "$DIRECTIVE_JSON" 2>/dev/null)
WEIGHT=$(jq -r '.weight // "medium"' "$DIRECTIVE_JSON" 2>/dev/null)

# Get skip list for this weight class
SKIP_VAR="SKIP_${WEIGHT}"
SKIP_LIST="${!SKIP_VAR:-}"

is_skippable() {
  local step="$1"
  for s in $SKIP_LIST; do
    if [[ "$s" == "$step" ]]; then
      return 0
    fi
  done
  return 1
}

VIOLATIONS="[]"
VALIDATED_ARTIFACTS="[]"

add_violation() {
  local rule="$1"
  local message="$2"
  VIOLATIONS=$(echo "$VIOLATIONS" | jq --arg r "$rule" --arg m "$message" '. + [{"rule": $r, "message": $m}]')
}

add_artifact() {
  local path="$1"
  VALIDATED_ARTIFACTS=$(echo "$VALIDATED_ARTIFACTS" | jq --arg p "$path" '. + [$p]')
}

# Check that a file exists (or .skip marker exists for skippable steps)
check_file() {
  local path="$1"         # relative to directive dir
  local step_name="$2"    # which step produced this
  local full_path="${DIRECTIVE_DIR_ABS}/${path}"

  if [[ -f "$full_path" ]]; then
    add_artifact "${DIRECTIVE_DIR}/${path}"
    return 0
  fi

  # Check .skip marker for weight-conditional steps
  if is_skippable "$step_name"; then
    local skip_marker="${DIRECTIVE_DIR_ABS}/${step_name}.skip"
    if [[ -f "$skip_marker" ]]; then
      add_artifact "${DIRECTIVE_DIR}/${step_name}.skip"
      return 0
    fi
  fi

  add_violation "missing_artifact" "Missing ${step_name} artifact: ${path} (weight: ${WEIGHT})"
  return 0
}

# Check that a JSON file exists and has required fields
check_json() {
  local path="$1"              # relative to directive dir
  local step_name="$2"         # which step produced this
  local required_fields="$3"   # comma-separated jq paths
  local full_path="${DIRECTIVE_DIR_ABS}/${path}"

  if [[ ! -f "$full_path" ]]; then
    # Check .skip marker
    if is_skippable "$step_name"; then
      local skip_marker="${DIRECTIVE_DIR_ABS}/${step_name}.skip"
      if [[ -f "$skip_marker" ]]; then
        add_artifact "${DIRECTIVE_DIR}/${step_name}.skip"
        return 0
      fi
    fi
    add_violation "missing_artifact" "Missing ${step_name} artifact: ${path} (weight: ${WEIGHT})"
    return 0
  fi

  # Validate JSON is parseable
  if ! jq empty "$full_path" 2>/dev/null; then
    add_violation "invalid_json" "Artifact ${path} is not valid JSON"
    return 0
  fi

  # Check required fields
  IFS=',' read -ra FIELDS <<< "$required_fields"
  local all_valid=true
  for field in "${FIELDS[@]}"; do
    field=$(echo "$field" | xargs)  # trim whitespace
    if [[ -z "$field" ]]; then continue; fi
    local val
    val=$(jq -r "${field} // empty" "$full_path" 2>/dev/null)
    if [[ -z "$val" || "$val" == "null" ]]; then
      add_violation "missing_field" "Artifact ${path} missing required field: ${field}"
      all_valid=false
    fi
  done

  if [[ "$all_valid" == "true" ]]; then
    add_artifact "${DIRECTIVE_DIR}/${path}"
  fi
}

# Check a field exists in directive.json itself
check_directive_field() {
  local field_path="$1"   # jq path
  local step_name="$2"    # which step set this
  local val
  val=$(jq -r "${field_path} // empty" "$DIRECTIVE_JSON" 2>/dev/null)

  if [[ -z "$val" || "$val" == "null" ]]; then
    # Check .skip marker
    if is_skippable "$step_name"; then
      local skip_marker="${DIRECTIVE_DIR_ABS}/${step_name}.skip"
      if [[ -f "$skip_marker" ]]; then
        add_artifact "${DIRECTIVE_DIR}/${step_name}.skip"
        return 0
      fi
    fi
    add_violation "missing_field" "directive.json missing required field for ${step_name}: ${field_path}"
    return 0
  fi
  add_artifact "directive.json:${field_path}"
}

# ---------------------------------------------------------------------------
# Gate Definitions: what each step requires before it can run
# ---------------------------------------------------------------------------
# The NEXT step's gate validates the PREVIOUS step's artifact.
# Chain: triage -> read -> context -> challenge -> brainstorm -> plan -> audit ->
#        approve -> project-brainstorm -> setup -> execute -> review-gate -> wrapup -> completion
# Note: approve runs BEFORE project-brainstorm (project-brainstorm depends on approval).
# ---------------------------------------------------------------------------

gate_read() {
  # Requires: triage completed (weight set in directive.json)
  check_directive_field ".weight" "triage"
  check_directive_field ".pipeline.triage.status" "triage"
}

gate_context() {
  # Requires: read completed
  check_directive_field ".pipeline.read.status" "read"
}

gate_brainstorm() {
  # Requires: context completed
  check_directive_field ".pipeline.context.status" "context"
}

gate_plan() {
  # Requires: brainstorm completed (or .skip for lightweight)
  check_file "brainstorm.md" "brainstorm"
}

gate_audit() {
  # Requires: plan completed (morgan-plan.json exists)
  check_json "morgan-plan.json" "plan" ".projects"
}

gate_approve() {
  # Requires: audit completed (audit artifact exists) + morgan-plan.json
  # Audit can produce audit.md, investigation.md, or conflicts-audit.md
  local found=false
  for f in audit.md investigation.md conflicts-audit.md; do
    if [[ -f "${DIRECTIVE_DIR_ABS}/${f}" ]]; then
      add_artifact "${DIRECTIVE_DIR}/${f}"
      found=true
      break
    fi
  done
  if [[ "$found" == "false" ]]; then
    if is_skippable "audit"; then
      local skip_marker="${DIRECTIVE_DIR_ABS}/audit.skip"
      if [[ -f "$skip_marker" ]]; then
        add_artifact "${DIRECTIVE_DIR}/audit.skip"
      else
        add_violation "missing_artifact" "Missing audit artifact: audit.md (weight: ${WEIGHT})"
      fi
    else
      add_violation "missing_artifact" "Missing audit artifact: audit.md (weight: ${WEIGHT})"
    fi
  fi

  # Also require morgan-plan.json
  check_json "morgan-plan.json" "plan" ".projects"
}

gate_challenge() {
  # Requires: context completed
  check_directive_field ".pipeline.context.status" "context"
}

gate_project_brainstorm() {
  # Requires: approve completed (approve runs before project-brainstorm)
  check_directive_field ".pipeline.approve.status" "approve"
  # Also require morgan-plan.json (input to brainstorm)
  check_json "morgan-plan.json" "plan" ".projects"
}

gate_execute() {
  # Requires: project-brainstorm completed (project.json with tasks exists)
  # Also requires approval
  check_directive_field ".pipeline.approve.status" "approve"

  # Check project.json(s) exist with tasks (output of project-brainstorm)
  local found_project=false
  if [[ -d "${DIRECTIVE_DIR_ABS}/projects" ]]; then
    for pdir in "${DIRECTIVE_DIR_ABS}"/projects/*/; do
      if [[ -f "${pdir}project.json" ]]; then
        check_json "projects/$(basename "$pdir")/project.json" "project-brainstorm" ".tasks"
        found_project=true
      fi
    done
  fi
  if [[ "$found_project" == "false" ]]; then
    if is_skippable "project-brainstorm"; then
      local skip_marker="${DIRECTIVE_DIR_ABS}/project-brainstorm.skip"
      if [[ -f "$skip_marker" ]]; then
        add_artifact "${DIRECTIVE_DIR}/project-brainstorm.skip"
      else
        add_violation "missing_artifact" "No projects/*/project.json found (project-brainstorm not completed)"
      fi
    else
      add_violation "missing_artifact" "No projects/*/project.json found (project-brainstorm not completed)"
    fi
  fi

  # Per-task gate: if task-id provided, check that specific task exists in a project
  if [[ -n "$TASK_ID" ]]; then
    local task_found=false
    for pdir in "${DIRECTIVE_DIR_ABS}"/projects/*/; do
      if [[ -f "${pdir}project.json" ]]; then
        local has_task
        has_task=$(jq --arg tid "$TASK_ID" '[.tasks[] | select(.id == $tid)] | length' "${pdir}project.json" 2>/dev/null || echo "0")
        if [[ "$has_task" -gt 0 ]]; then
          task_found=true
          break
        fi
      fi
    done
    if [[ "$task_found" == "false" ]]; then
      add_violation "missing_task" "Task ${TASK_ID} not found in any project.json"
    fi
  fi
}

gate_setup() {
  # Requires: project-brainstorm completed (or skipped for lightweight)
  check_directive_field ".pipeline.approve.status" "approve"
}

gate_review_gate() {
  # Per-task gate: requires build-{task-id}.md exists for the task being reviewed
  if [[ -n "$TASK_ID" ]]; then
    # Find which project this task belongs to
    local build_found=false
    for pdir in "${DIRECTIVE_DIR_ABS}"/projects/*/; do
      local project_id
      project_id=$(basename "$pdir")
      local build_file="${pdir}build-${TASK_ID}.md"
      if [[ -f "$build_file" ]]; then
        add_artifact "${DIRECTIVE_DIR}/projects/${project_id}/build-${TASK_ID}.md"
        build_found=true
        break
      fi
    done
    if [[ "$build_found" == "false" ]]; then
      add_violation "missing_artifact" "Missing build artifact: build-${TASK_ID}.md (must exist before review)"
    fi
  else
    # No task-id: check ALL tasks have build artifacts
    for pdir in "${DIRECTIVE_DIR_ABS}"/projects/*/; do
      if [[ -f "${pdir}project.json" ]]; then
        local project_id
        project_id=$(basename "$pdir")
        local task_ids
        task_ids=$(jq -r '.tasks[].id' "${pdir}project.json" 2>/dev/null)
        for tid in $task_ids; do
          if [[ ! -f "${pdir}build-${tid}.md" ]]; then
            add_violation "missing_artifact" "Missing build artifact: projects/${project_id}/build-${tid}.md"
          else
            add_artifact "${DIRECTIVE_DIR}/projects/${project_id}/build-${tid}.md"
          fi
        done
      fi
    done
  fi
}

gate_wrapup() {
  # Requires: all tasks have review-{task-id}.md
  for pdir in "${DIRECTIVE_DIR_ABS}"/projects/*/; do
    if [[ -f "${pdir}project.json" ]]; then
      local project_id
      project_id=$(basename "$pdir")
      local task_ids
      task_ids=$(jq -r '.tasks[].id' "${pdir}project.json" 2>/dev/null)
      for tid in $task_ids; do
        local task_status
        task_status=$(jq -r --arg tid "$tid" '.tasks[] | select(.id == $tid) | .status' "${pdir}project.json" 2>/dev/null)
        # Skipped/blocked tasks don't need review artifacts
        if [[ "$task_status" == "skipped" || "$task_status" == "blocked" ]]; then
          continue
        fi
        if [[ ! -f "${pdir}review-${tid}.md" ]]; then
          add_violation "missing_artifact" "Missing review artifact: projects/${project_id}/review-${tid}.md"
        else
          add_artifact "${DIRECTIVE_DIR}/projects/${project_id}/review-${tid}.md"
        fi
      done
    fi
  done
}

gate_completion() {
  # Requires: digest.md exists
  check_file "digest.md" "wrapup"
}

# ---------------------------------------------------------------------------
# Run the gate for the target step
# ---------------------------------------------------------------------------

case "$TARGET_STEP" in
  triage)             ;; # No prerequisites for first step
  read)               gate_read ;;
  context)            gate_context ;;
  challenge)          gate_challenge ;;
  brainstorm)         gate_brainstorm ;;
  plan)               gate_plan ;;
  audit)              gate_audit ;;
  approve)            gate_approve ;;
  project-brainstorm) gate_project_brainstorm ;;
  setup)              gate_setup ;;
  execute)            gate_execute ;;
  review-gate)        gate_review_gate ;;
  wrapup)             gate_wrapup ;;
  completion)         gate_completion ;;
  *)
    echo '{"valid":false,"violations":[{"rule":"unknown_step","message":"Unknown pipeline step: '"$TARGET_STEP"'"}],"step":"'"$TARGET_STEP"'","directive":"'"$DIRECTIVE_ID"'"}'
    exit 0
    ;;
esac

# ---------------------------------------------------------------------------
# Output result
# ---------------------------------------------------------------------------

VIOLATION_COUNT=$(echo "$VIOLATIONS" | jq 'length')

if [[ "$VIOLATION_COUNT" -eq 0 ]]; then
  # Gate passed — write to directive.json
  PASSED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Atomic write: read directive.json, add gates.{step}, write to tmp, mv
  TMP=$(mktemp)
  if jq \
    --arg step "$TARGET_STEP" \
    --arg passed_at "$PASSED_AT" \
    --argjson artifacts "$VALIDATED_ARTIFACTS" \
    '.gates = (.gates // {}) | .gates[$step] = {"passed_at": $passed_at, "validated_artifacts": $artifacts}' \
    "$DIRECTIVE_JSON" > "$TMP" 2>/dev/null; then
    mv "$TMP" "$DIRECTIVE_JSON"
  else
    rm -f "$TMP"
    # Failed to write but gate still passed — report success without write
  fi

  echo '{"valid":true,"violations":[],"step":"'"$TARGET_STEP"'","directive":"'"$DIRECTIVE_ID"'","gates":{"'"$TARGET_STEP"'":{"passed_at":"'"$PASSED_AT"'","validated_artifacts":'"$VALIDATED_ARTIFACTS"'}}}'
else
  # Gate failed — do NOT modify directive.json
  echo "$VIOLATIONS" | jq '{valid: false, violations: ., step: "'"$TARGET_STEP"'", directive: "'"$DIRECTIVE_ID"'"}'
fi
