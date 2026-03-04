#!/usr/bin/env bash
# detect-stale-docs.sh — Post-directive hook to detect potentially stale documentation
#
# After a directive completes, scans .context/ and .claude/ docs for references
# to files that were modified in the directive. If the doc itself was NOT modified,
# it is flagged as potentially stale.
#
# Staleness heuristic:
#   "References a file" = doc contains a literal file path substring (grep -F)
#   "Stale" = doc references a file modified in the directive, but the doc
#             itself was NOT modified in the same directive
#
# Usage:
#   ./detect-stale-docs.sh file1.ts file2.tsx ...
#   ./detect-stale-docs.sh --from-diff <base-branch>
#   echo "file1.ts\nfile2.ts" | ./detect-stale-docs.sh --stdin
#
# Output: list of potentially stale docs with the files they reference
# Exit 0 always (output is informational, not blocking)

set -euo pipefail

# Anchor to repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Error: not in a git repo" >&2
  exit 1
}
cd "$REPO_ROOT"

# --- Collect modified files ---
MODIFIED_FILES=()

if [[ "${1:-}" == "--from-diff" ]]; then
  # Get modified files from git diff against a base branch
  BASE_BRANCH="${2:-main}"
  while IFS= read -r f; do
    [[ -n "$f" ]] && MODIFIED_FILES+=("$f")
  done < <(git diff --name-only "$BASE_BRANCH" 2>/dev/null)
elif [[ "${1:-}" == "--stdin" ]]; then
  # Read file list from stdin
  while IFS= read -r f; do
    [[ -n "$f" ]] && MODIFIED_FILES+=("$f")
  done
else
  # Read file list from arguments
  for f in "$@"; do
    [[ -n "$f" ]] && MODIFIED_FILES+=("$f")
  done
fi

if [[ ${#MODIFIED_FILES[@]} -eq 0 ]]; then
  exit 0  # No modified files — nothing to check
fi

# --- Build newline-separated list of modified docs (for exclusion) ---
# Compatible with bash 3.x (no associative arrays)
MODIFIED_DOCS=""
for f in "${MODIFIED_FILES[@]}"; do
  case "$f" in
    .context/*.md|.claude/*.md)
      MODIFIED_DOCS="${MODIFIED_DOCS}${f}"$'\n'
      ;;
  esac
done

# --- Create temp file with patterns (one per line) for grep -f ---
PATTERNS_FILE=$(mktemp)
trap 'rm -f "$PATTERNS_FILE"' EXIT
printf '%s\n' "${MODIFIED_FILES[@]}" > "$PATTERNS_FILE"

# --- Phase 1: Find all candidate docs in a single grep pass ---
# Use grep -Fl -f to find all .md files that contain ANY modified file path.
# This is much faster than iterating: one grep invocation covers all docs + patterns.
CANDIDATE_DOCS=()
while IFS= read -r doc; do
  [[ -n "$doc" ]] && CANDIDATE_DOCS+=("$doc")
done < <(
  find .context/ .claude/ -name '*.md' -type f 2>/dev/null \
    | grep -v '/worktrees/' \
    | grep -v 'node_modules' \
    | xargs grep -Fl -f "$PATTERNS_FILE" 2>/dev/null || true
)

if [[ ${#CANDIDATE_DOCS[@]} -eq 0 ]]; then
  echo "No potentially stale docs detected."
  exit 0
fi

# --- Phase 2: For each candidate, determine which files it references ---
# Only runs on the (small) set of docs that matched in Phase 1.
# Also filters out docs that were themselves modified (zero false positives).

STALE_RESULTS=()

for doc in "${CANDIDATE_DOCS[@]}"; do
  # Skip docs that were also modified in this directive
  if echo "$MODIFIED_DOCS" | grep -qxF "$doc" 2>/dev/null; then
    continue
  fi

  # Determine which specific modified files this doc references
  REFERENCED=()
  for modified in "${MODIFIED_FILES[@]}"; do
    if grep -qF "$modified" "$doc" 2>/dev/null; then
      REFERENCED+=("$modified")
    fi
  done

  if [[ ${#REFERENCED[@]} -gt 0 ]]; then
    REFS_STR=$(printf '%s, ' "${REFERENCED[@]}")
    REFS_STR="${REFS_STR%, }"  # trim trailing comma+space
    STALE_RESULTS+=("$doc -> references modified: $REFS_STR")
  fi
done

# --- Output ---
if [[ ${#STALE_RESULTS[@]} -eq 0 ]]; then
  echo "No potentially stale docs detected."
  exit 0
fi

echo "## Potentially Stale Docs"
echo ""
echo "The following docs reference files that were modified but were not themselves updated:"
echo ""
for result in "${STALE_RESULTS[@]}"; do
  echo "- $result"
done
echo ""
echo "Consider reviewing these docs for accuracy."

exit 0
