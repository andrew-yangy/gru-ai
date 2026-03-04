#!/usr/bin/env bash
# checkpoint.sh — CRUD operations on directive checkpoint files
#
# Usage:
#   ./scripts/checkpoint.sh init <directive-name>              — create initial checkpoint
#   ./scripts/checkpoint.sh read <directive-name>              — read checkpoint (output JSON)
#   ./scripts/checkpoint.sh update-step <directive-name> <step> — update current_step
#   ./scripts/checkpoint.sh update-initiative <directive-name> <initiative-id> <status> [phase]
#                                                               — update initiative status
#   ./scripts/checkpoint.sh track-agent <directive-name> <agent-type>
#                                                               — track agent spawn in enforcement
#   ./scripts/checkpoint.sh track-artifact <directive-name> <artifact-path>
#                                                               — track review artifact in enforcement
#   ./scripts/checkpoint.sh delete <directive-name>            — delete checkpoint file
#
# Checkpoint location: .context/directives/checkpoints/<directive-name>.json
#
# Requires: jq

set -euo pipefail

# Anchor to repo root so relative paths work regardless of invocation cwd
cd "$(git rev-parse --show-toplevel)" || { echo "Error: not in a git repo" >&2; exit 1; }

# Guard: jq is required for all JSON operations
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required but not installed" >&2; exit 1; }

CHECKPOINT_DIR=".context/directives/checkpoints"

# --- Usage ---
if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  echo "Usage: ./scripts/checkpoint.sh <command> <directive-name> [args...]"
  echo ""
  echo "Commands:"
  echo "  init <name>                              Create initial checkpoint"
  echo "  read <name>                              Read checkpoint (JSON to stdout)"
  echo "  update-step <name> <step>                Update current_step field"
  echo "  update-initiative <name> <id> <status> [phase]  Update initiative status"
  echo "  track-agent <name> <agent-type>          Track agent spawn in enforcement"
  echo "  track-artifact <name> <artifact-path>    Track review artifact in enforcement"
  echo "  delete <name>                            Delete checkpoint file"
  echo ""
  echo "Checkpoint files live in: $CHECKPOINT_DIR/"
  exit 0
fi

COMMAND="$1"
shift

# --- Helper: get checkpoint path ---
checkpoint_path() {
  echo "${CHECKPOINT_DIR}/${1}.json"
}

# --- Helper: validate directive name arg ---
require_directive_name() {
  if [[ $# -lt 1 ]] || [[ -z "${1:-}" ]]; then
    echo "Error: directive name required" >&2
    exit 1
  fi
  # Reject path traversal characters, spaces, and shell-special chars
  if [[ "${1}" =~ (\.\.|~|[[:space:]]/\\) ]]; then
    echo "Error: invalid directive name '${1}' — must not contain '..', '~', spaces, or path separators" >&2
    exit 1
  fi
}

# --- Commands ---
case "$COMMAND" in
  init)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    DIRECTIVE_PATH=".context/directives/${DIRECTIVE_NAME}.md"
    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    # Validate directive exists
    if [[ ! -f "$DIRECTIVE_PATH" ]]; then
      echo "Error: Directive not found at $DIRECTIVE_PATH" >&2
      exit 1
    fi

    # Don't overwrite existing checkpoint
    if [[ -f "$CP_PATH" ]]; then
      echo "Error: Checkpoint already exists at $CP_PATH. Use 'delete' first to reset." >&2
      exit 1
    fi

    # Ensure directory exists
    mkdir -p "$CHECKPOINT_DIR"

    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    jq -n \
      --argjson version 1 \
      --arg directive_name "$DIRECTIVE_NAME" \
      --arg directive_path "$DIRECTIVE_PATH" \
      --arg started_at "$NOW" \
      --arg updated_at "$NOW" \
      '{
        version: $version,
        directive_name: $directive_name,
        directive_path: $directive_path,
        started_at: $started_at,
        updated_at: $updated_at,
        current_step: "step-0",
        planning: {
          morgan_plan: null,
          ceo_approval: null,
          worktree_path: null
        },
        initiatives: [],
        enforcement: {
          agents_spawned: [],
          review_artifacts_written: []
        },
        wrapup: {
          okrs_persisted: false,
          follow_ups_processed: false,
          digest_path: null,
          lessons_updated: false
        }
      }' > "$CP_PATH"

    echo "Checkpoint created: $CP_PATH"
    ;;

  read)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    if [[ ! -f "$CP_PATH" ]]; then
      echo "Error: No checkpoint found at $CP_PATH" >&2
      exit 1
    fi

    cat "$CP_PATH"
    ;;

  update-step)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    STEP="${2:-}"

    if [[ -z "$STEP" ]]; then
      echo "Error: step argument required" >&2
      echo "Usage: ./scripts/checkpoint.sh update-step <name> <step>" >&2
      exit 1
    fi

    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    if [[ ! -f "$CP_PATH" ]]; then
      echo "Error: No checkpoint found at $CP_PATH" >&2
      exit 1
    fi

    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    jq \
      --arg step "$STEP" \
      --arg updated_at "$NOW" \
      '.current_step = $step | .updated_at = $updated_at' \
      "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"

    echo "Updated step to '$STEP' in $CP_PATH"
    ;;

  update-initiative)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    INITIATIVE_ID="${2:-}"
    STATUS="${3:-}"
    PHASE="${4:-}"

    if [[ -z "$INITIATIVE_ID" ]] || [[ -z "$STATUS" ]]; then
      echo "Error: initiative-id and status required" >&2
      echo "Usage: ./scripts/checkpoint.sh update-initiative <name> <initiative-id> <status> [phase]" >&2
      exit 1
    fi

    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    if [[ ! -f "$CP_PATH" ]]; then
      echo "Error: No checkpoint found at $CP_PATH" >&2
      exit 1
    fi

    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Check if initiative exists in the array
    EXISTS=$(jq --arg id "$INITIATIVE_ID" '[.initiatives[] | select(.id == $id)] | length' "$CP_PATH")

    if [[ "$EXISTS" -eq 0 ]]; then
      # Add new initiative entry
      if [[ -n "$PHASE" ]]; then
        jq \
          --arg id "$INITIATIVE_ID" \
          --arg status "$STATUS" \
          --arg phase "$PHASE" \
          --arg updated_at "$NOW" \
          '.initiatives += [{id: $id, status: $status, current_phase: $phase}] | .updated_at = $updated_at' \
          "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"
      else
        jq \
          --arg id "$INITIATIVE_ID" \
          --arg status "$STATUS" \
          --arg updated_at "$NOW" \
          '.initiatives += [{id: $id, status: $status, current_phase: null}] | .updated_at = $updated_at' \
          "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"
      fi
    else
      # Update existing initiative
      if [[ -n "$PHASE" ]]; then
        jq \
          --arg id "$INITIATIVE_ID" \
          --arg status "$STATUS" \
          --arg phase "$PHASE" \
          --arg updated_at "$NOW" \
          '(.initiatives[] | select(.id == $id)) |= (.status = $status | .current_phase = $phase) | .updated_at = $updated_at' \
          "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"
      else
        jq \
          --arg id "$INITIATIVE_ID" \
          --arg status "$STATUS" \
          --arg updated_at "$NOW" \
          '(.initiatives[] | select(.id == $id)).status = $status | .updated_at = $updated_at' \
          "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"
      fi
    fi

    echo "Updated initiative '$INITIATIVE_ID' → status='$STATUS'${PHASE:+ phase='$PHASE'} in $CP_PATH"
    ;;

  track-agent)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    AGENT_TYPE="${2:-}"

    if [[ -z "$AGENT_TYPE" ]]; then
      echo "Error: agent-type argument required" >&2
      echo "Usage: ./scripts/checkpoint.sh track-agent <name> <agent-type>" >&2
      exit 1
    fi

    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    if [[ ! -f "$CP_PATH" ]]; then
      echo "Error: No checkpoint found at $CP_PATH" >&2
      exit 1
    fi

    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Ensure enforcement object exists, then append (deduplicated)
    jq \
      --arg agent "$AGENT_TYPE" \
      --arg updated_at "$NOW" \
      '
      # Ensure enforcement object exists
      .enforcement //= {agents_spawned: [], review_artifacts_written: []} |
      # Deduplicate: only add if not already present
      if (.enforcement.agents_spawned | index($agent)) then .
      else .enforcement.agents_spawned += [$agent]
      end |
      .updated_at = $updated_at
      ' \
      "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"

    echo "Tracked agent '$AGENT_TYPE' in $CP_PATH"
    ;;

  track-artifact)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    ARTIFACT_PATH="${2:-}"

    if [[ -z "$ARTIFACT_PATH" ]]; then
      echo "Error: artifact-path argument required" >&2
      echo "Usage: ./scripts/checkpoint.sh track-artifact <name> <artifact-path>" >&2
      exit 1
    fi

    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    if [[ ! -f "$CP_PATH" ]]; then
      echo "Error: No checkpoint found at $CP_PATH" >&2
      exit 1
    fi

    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Ensure enforcement object exists, then append (deduplicated)
    jq \
      --arg artifact "$ARTIFACT_PATH" \
      --arg updated_at "$NOW" \
      '
      # Ensure enforcement object exists
      .enforcement //= {agents_spawned: [], review_artifacts_written: []} |
      # Deduplicate: only add if not already present
      if (.enforcement.review_artifacts_written | index($artifact)) then .
      else .enforcement.review_artifacts_written += [$artifact]
      end |
      .updated_at = $updated_at
      ' \
      "$CP_PATH" > "${CP_PATH}.tmp" && mv "${CP_PATH}.tmp" "$CP_PATH"

    echo "Tracked artifact '$ARTIFACT_PATH' in $CP_PATH"
    ;;

  delete)
    require_directive_name "${1:-}"
    DIRECTIVE_NAME="$1"
    CP_PATH=$(checkpoint_path "$DIRECTIVE_NAME")

    if [[ ! -f "$CP_PATH" ]]; then
      echo "Error: No checkpoint found at $CP_PATH" >&2
      exit 1
    fi

    rm "$CP_PATH"
    echo "Deleted checkpoint: $CP_PATH"
    ;;

  *)
    echo "Error: Unknown command '$COMMAND'" >&2
    echo "Valid commands: init, read, update-step, update-initiative, track-agent, track-artifact, delete" >&2
    exit 1
    ;;
esac
