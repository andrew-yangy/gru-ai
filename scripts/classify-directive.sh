#!/usr/bin/env bash
# classify-directive.sh — Classify a directive's weight deterministically
#
# Usage:
#   ./scripts/classify-directive.sh <directive-name>
#
# Reads .context/directives/<name>.md and applies rule-based classification.
# Checks for explicit weight override first, then scores signals.
#
# Output: JSON to stdout with classification, signals, and override flag.
#
# Classification weights:
#   lightweight — small fixes, config changes, single-file updates
#   medium     — multi-file changes, moderate scope
#   heavyweight — schema changes, auth, revenue, migrations, guardrail-touching
#   strategic  — exploratory, evaluative, decision-making directives

set -euo pipefail

# Anchor to repo root so relative paths work regardless of invocation cwd
cd "$(git rev-parse --show-toplevel)" || { echo "Error: not in a git repo" >&2; exit 1; }

# --- Usage ---
if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  echo "Usage: ./scripts/classify-directive.sh <directive-name>"
  echo ""
  echo "Classifies a directive's weight based on deterministic rules."
  echo "Reads .context/directives/<directive-name>.md"
  echo ""
  echo "Output: JSON with classification, signals, and override flag."
  exit 0
fi

DIRECTIVE_NAME="$1"
DIRECTIVE_PATH=".context/directives/${DIRECTIVE_NAME}.md"
VISION_PATH=".context/vision.md"

# --- Validate directive exists ---
if [[ ! -f "$DIRECTIVE_PATH" ]]; then
  echo "Error: Directive not found at $DIRECTIVE_PATH" >&2
  exit 1
fi

CONTENT=$(cat "$DIRECTIVE_PATH")

# --- Check for explicit weight override ---
OVERRIDE_MATCH=$(echo "$CONTENT" | grep -iE '^\*\*Weight\*\*:\s*(lightweight|medium|heavyweight|strategic)' | head -1 || true)
if [[ -n "$OVERRIDE_MATCH" ]]; then
  CLASSIFICATION=$(echo "$OVERRIDE_MATCH" | sed -E 's/.*:\s*(lightweight|medium|heavyweight|strategic).*/\1/' | tr '[:upper:]' '[:lower:]')
  jq -n \
    --arg directive "$DIRECTIVE_NAME" \
    --arg classification "$CLASSIFICATION" \
    --argjson signals '["explicit override"]' \
    --argjson override true \
    '{directive: $directive, classification: $classification, signals: $signals, override: $override}'
  exit 0
fi

# --- Score signals ---
HEAVYWEIGHT_SCORE=0
LIGHTWEIGHT_SCORE=0
MEDIUM_SCORE=0
STRATEGIC_SCORE=0
SIGNALS=()

CONTENT_LOWER=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]')

# Heavyweight keywords
for keyword in "schema" "auth" "revenue" "database" "migration"; do
  if echo "$CONTENT_LOWER" | grep -qw "$keyword"; then
    HEAVYWEIGHT_SCORE=$((HEAVYWEIGHT_SCORE + 1))
    SIGNALS+=("keyword:$keyword")
  fi
done

# Lightweight keywords
for keyword in "fix" "delete" "cleanup" "clean up"; do
  if echo "$CONTENT_LOWER" | grep -qw "$keyword"; then
    LIGHTWEIGHT_SCORE=$((LIGHTWEIGHT_SCORE + 1))
    SIGNALS+=("keyword:$keyword")
  fi
done
# "update config" as a phrase
if echo "$CONTENT_LOWER" | grep -q "update config"; then
  LIGHTWEIGHT_SCORE=$((LIGHTWEIGHT_SCORE + 1))
  SIGNALS+=("keyword:update config")
fi

# Strategic keywords
for phrase in "explore" "evaluate" "which approach" "how should we"; do
  if echo "$CONTENT_LOWER" | grep -q "$phrase"; then
    STRATEGIC_SCORE=$((STRATEGIC_SCORE + 1))
    SIGNALS+=("keyword:$phrase")
  fi
done

# Count file paths mentioned (patterns like ./path, .context/path, src/path, or path.ext references)
FILE_COUNT=$(echo "$CONTENT" | { grep -oE '(\./|\.context/|src/|scripts/|server/|cli/)[a-zA-Z0-9_./-]+' || true; } | sort -u | grep -c . || true)
if [[ "$FILE_COUNT" -ge 4 ]]; then
  HEAVYWEIGHT_SCORE=$((HEAVYWEIGHT_SCORE + 1))
  SIGNALS+=("file-count:${FILE_COUNT}(4+)")
elif [[ "$FILE_COUNT" -ge 2 ]]; then
  MEDIUM_SCORE=$((MEDIUM_SCORE + 1))
  SIGNALS+=("file-count:${FILE_COUNT}(2-3)")
elif [[ "$FILE_COUNT" -ge 1 ]]; then
  LIGHTWEIGHT_SCORE=$((LIGHTWEIGHT_SCORE + 1))
  SIGNALS+=("file-count:${FILE_COUNT}(1)")
fi

# Check if directive references guardrails from vision.md
if [[ -f "$VISION_PATH" ]]; then
  # Extract Operating Principles from vision.md as guardrail terms
  GUARDRAIL_TERMS=$(grep -iE '(autonomy|risk-based|challenge mode|structured outputs|bottom-up|self-evolution)' "$VISION_PATH" 2>/dev/null || true)
  if [[ -n "$GUARDRAIL_TERMS" ]]; then
    for term in "autonomy" "risk-based" "challenge mode" "structured outputs" "bottom-up" "self-evolution"; do
      if echo "$CONTENT_LOWER" | grep -q "$term"; then
        HEAVYWEIGHT_SCORE=$((HEAVYWEIGHT_SCORE + 1))
        SIGNALS+=("guardrail-ref:$term")
      fi
    done
  fi
fi

# --- Determine classification from highest score ---
# In case of tie, prefer the heavier classification (safety-first)
BEST_SCORE=0
CLASSIFICATION="medium"  # default

if [[ "$LIGHTWEIGHT_SCORE" -gt "$BEST_SCORE" ]]; then
  BEST_SCORE=$LIGHTWEIGHT_SCORE
  CLASSIFICATION="lightweight"
fi
if [[ "$MEDIUM_SCORE" -gt "$BEST_SCORE" ]]; then
  BEST_SCORE=$MEDIUM_SCORE
  CLASSIFICATION="medium"
fi
if [[ "$STRATEGIC_SCORE" -gt "$BEST_SCORE" ]]; then
  BEST_SCORE=$STRATEGIC_SCORE
  CLASSIFICATION="strategic"
fi
if [[ "$HEAVYWEIGHT_SCORE" -gt "$BEST_SCORE" ]]; then
  BEST_SCORE=$HEAVYWEIGHT_SCORE
  CLASSIFICATION="heavyweight"
fi
# Heavyweight ties with strategic → heavyweight (safety-first)
if [[ "$HEAVYWEIGHT_SCORE" -eq "$BEST_SCORE" ]] && [[ "$HEAVYWEIGHT_SCORE" -gt 0 ]]; then
  CLASSIFICATION="heavyweight"
fi

# If no signals at all, default to medium
if [[ ${#SIGNALS[@]} -eq 0 ]]; then
  SIGNALS+=("no-signals-matched")
  CLASSIFICATION="medium"
fi

# --- Output JSON ---
SIGNALS_JSON=$(printf '%s\n' "${SIGNALS[@]}" | jq -R . | jq -s .)

jq -n \
  --arg directive "$DIRECTIVE_NAME" \
  --arg classification "$CLASSIFICATION" \
  --argjson signals "$SIGNALS_JSON" \
  --argjson override false \
  '{directive: $directive, classification: $classification, signals: $signals, override: $override}'
