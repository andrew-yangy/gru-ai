#!/usr/bin/env bash
# read-context.sh — Assemble context files for a given role
#
# Usage:
#   ./scripts/read-context.sh <role> [--compact]
#
# Roles:
#   morgan    — planner: vision, preferences, goal.json files, orchestration + agent-behavior lessons, backlogs, project.json files
#   auditor   — codebase scanner: vision (guardrails section), preferences, review-quality + agent-behavior lessons
#   challenger — C-suite challenge: vision, preferences, goal.json summaries
#   engineer  — builder: preferences, all lesson files (alias: builder)
#   reviewer  — code reviewer: preferences, review-quality + agent-behavior lessons
#   alex      — orchestrator: vision, preferences, orchestration + agent-behavior lessons
#
# Options:
#   --compact   Truncate each file to first 50 lines (token savings)
#
# Output: Concatenated file contents with === headers ===
# Missing files are noted as "(not found)" and execution continues.

set -euo pipefail

# Anchor to repo root so relative paths work regardless of invocation cwd
cd "$(git rev-parse --show-toplevel)" || { echo "Error: not in a git repo" >&2; exit 1; }

# --- Usage ---
if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  echo "Usage: ./scripts/read-context.sh <role> [--compact]"
  echo ""
  echo "Assembles context files based on agent role."
  echo ""
  echo "Roles:"
  echo "  morgan     — planner context (vision, goals, lessons, backlogs, projects)"
  echo "  auditor    — codebase scanner context (guardrails, review lessons)"
  echo "  challenger — C-suite challenge context (vision, goal summaries)"
  echo "  engineer   — builder context (preferences, all lessons) (alias: builder)"
  echo "  reviewer   — code reviewer context (preferences, review-quality + agent-behavior lessons)"
  echo "  alex       — orchestrator context (vision, orchestration lessons)"
  echo ""
  echo "Options:"
  echo "  --compact  Truncate each file to first 50 lines"
  exit 0
fi

ROLE="$1"
COMPACT=false
if [[ "${2:-}" == "--compact" ]]; then
  COMPACT=true
fi

# --- Helper: print a file with header ---
print_file() {
  local filepath="$1"
  echo "=== $filepath ==="
  if [[ ! -f "$filepath" ]]; then
    echo "(not found)"
  elif [[ "$COMPACT" == true ]]; then
    head -50 "$filepath"
  else
    cat "$filepath"
  fi
  echo ""
}

# --- Helper: print a section of a file (grep-based extraction) ---
print_section() {
  local filepath="$1"
  local section_label="$2"
  local section_pattern="$3"
  echo "=== $filepath ($section_label) ==="
  if [[ ! -f "$filepath" ]]; then
    echo "(not found)"
  else
    # Extract from the section header to the next ## header (or EOF)
    awk -v pat="$section_pattern" '
      $0 ~ pat { found=1 }
      found && /^## / && !($0 ~ pat) { found=0 }
      found { print }
    ' "$filepath"
  fi
  echo ""
}

# --- Helper: print all matching glob files ---
print_glob() {
  local pattern="$1"
  local found=false
  for f in $pattern; do
    if [[ -f "$f" ]]; then
      found=true
      print_file "$f"
    fi
  done
  if [[ "$found" == false ]]; then
    echo "=== $pattern === (no matches)"
    echo ""
  fi
}

# --- Role dispatch ---
case "$ROLE" in
  morgan)
    print_file ".context/vision.md"
    print_file ".context/preferences.md"
    print_glob ".context/goals/*/goal.json"
    print_file ".context/lessons/orchestration.md"
    print_file ".context/lessons/agent-behavior.md"
    print_glob ".context/goals/*/backlog.json"
    print_glob ".context/goals/*/projects/*/project.json"
    ;;

  auditor)
    print_section ".context/vision.md" "guardrails" "## Operating Principles"
    print_file ".context/preferences.md"
    print_file ".context/lessons/review-quality.md"
    print_file ".context/lessons/agent-behavior.md"
    ;;

  challenger)
    print_file ".context/vision.md"
    print_file ".context/preferences.md"
    # Goal summaries: just the goal.json files
    print_glob ".context/goals/*/goal.json"
    ;;

  engineer|builder)
    print_file ".context/preferences.md"
    print_file ".context/lessons/agent-behavior.md"
    # All lesson topic files
    for f in .context/lessons/*.md; do
      if [[ -f "$f" ]] && [[ "$(basename "$f")" != "agent-behavior.md" ]]; then
        print_file "$f"
      fi
    done
    ;;

  reviewer)
    print_file ".context/preferences.md"
    print_file ".context/lessons/review-quality.md"
    print_file ".context/lessons/agent-behavior.md"
    ;;

  alex)
    print_file ".context/vision.md"
    print_file ".context/preferences.md"
    print_file ".context/lessons/orchestration.md"
    print_file ".context/lessons/agent-behavior.md"
    ;;

  *)
    echo "Error: Unknown role '$ROLE'" >&2
    echo "Valid roles: morgan, auditor, challenger, engineer, builder, reviewer, alex" >&2
    exit 1
    ;;
esac
