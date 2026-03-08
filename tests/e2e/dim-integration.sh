#!/usr/bin/env bash
set -euo pipefail

# ─── Dimension: Full Integration (Init → Server → Game Data → Directives) ────
#
# THE missing test: verifies the complete real-user chain end-to-end.
# Every test creates a FRESH consumer project from scratch.
#
# Scenarios tested:
#   1. Init → Server serves correct agent registry (all presets)
#   2. Init → Server → Game configs present for ALL agents
#   3. Init → Create directive → Server shows directive in API + WebSocket
#   4. Directive pipeline steps correct for each weight class
#   5. Multiple simultaneous directives
#   6. Directive watcher picks up live changes
#   7. Agent names flow through: init → registry → API → correct in response
#   8. Project + task data visible through API chain
#   9. Edge: server with no directives, then add one live
#  10. Edge: corrupt directive.json doesn't crash server
# ──────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/utils.sh"

DIM_NAME="integration"
DIM_START="$(start_timer)"

# Track cleanup
TEMP_DIRS=""
SERVER_PIDS=""

cleanup() {
  # Kill all servers
  for pid in $SERVER_PIDS; do
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  # Remove temp dirs
  for dir in $TEMP_DIRS; do
    if [[ -n "$dir" && -d "$dir" && "$dir" == *"e2e-test"* ]]; then
      rm -rf "$dir"
    fi
  done
}
trap cleanup EXIT

add_temp_dir() { TEMP_DIRS="$TEMP_DIRS $1"; }

# ─── Helper: start server and wait for ready ─────────────────────────────────

start_server() {
  local project_dir="$1"
  local port="$2"
  local log_file="/tmp/e2e-integ-${port}.log"

  GRUAI_PROJECT_PATH="$project_dir" PORT="$port" \
    npx tsx "${GRUAI_PACKAGE_ROOT}/server/index.ts" > "$log_file" 2>&1 &
  local pid=$!
  SERVER_PIDS="$SERVER_PIDS $pid"

  local waited=0
  while (( waited < 15 )); do
    if curl -sf "http://localhost:${port}/api/health" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
    waited=$(( waited + 1 ))
  done
  log_fail "server on port $port failed to start within 15s"
  tail -10 "$log_file" 2>/dev/null || true
  return 1
}

kill_server_on_port() {
  local port="$1"
  lsof -ti:"$port" 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 1
}

# ─── Helper: query API with python3 (avoids jq shell escaping issues) ────────

api_query() {
  local port="$1"
  local endpoint="$2"
  local py_expr="$3"
  curl -sf "http://localhost:${port}${endpoint}" 2>/dev/null | \
    python3 -c "import json,sys; data=json.load(sys.stdin); $py_expr" 2>/dev/null
}

# ─── Helper: create directive in consumer project ────────────────────────────

create_directive() {
  local project_dir="$1"
  local dir_id="$2"
  local title="$3"
  local status="$4"
  local weight="$5"
  local current_step="$6"

  local dir_path="${project_dir}/.context/directives/${dir_id}"
  mkdir -p "${dir_path}/projects"

  cat > "${dir_path}/directive.json" <<ENDJSON
{
  "title": "${title}",
  "status": "${status}",
  "weight": "${weight}",
  "current_step": "${current_step}",
  "created": "2026-03-08T10:00:00Z",
  "started_at": "2026-03-08T10:00:00Z",
  "updated_at": "2026-03-08T10:30:00Z",
  "pipeline": {
    "triage": { "status": "completed", "agent": "CEO", "output": { "summary": "Triaged as ${weight}" } },
    "read": { "status": "completed", "agent": "CEO", "output": { "summary": "Read directive" } },
    "context": { "status": "completed", "agent": "CEO", "output": { "summary": "Context loaded" } },
    "plan": { "status": "completed", "agent": "COO", "output": { "summary": "Plan created" } },
    "audit": { "status": "completed", "agent": "CTO", "output": { "summary": "Audit passed" } },
    "project-brainstorm": { "status": "completed", "agent": "CTO", "output": { "summary": "Tasks decomposed" } },
    "setup": { "status": "completed", "agent": "CEO", "output": { "summary": "Setup done" } },
    "execute": { "status": "active", "agent": "FS", "output": { "summary": "Building" } }
  }
}
ENDJSON
}

create_directive_full() {
  # Creates directive with all pipeline steps for a given weight
  local project_dir="$1"
  local dir_id="$2"
  local title="$3"
  local status="$4"
  local weight="$5"
  local current_step="$6"

  local dir_path="${project_dir}/.context/directives/${dir_id}"
  mkdir -p "${dir_path}/projects"

  # Build pipeline JSON based on weight
  local challenge_status="skipped"
  local brainstorm_status="skipped"
  local approve_status="completed"

  if [[ "$weight" == "heavyweight" || "$weight" == "strategic" ]]; then
    challenge_status="completed"
    brainstorm_status="completed"
  fi
  if [[ "$weight" == "medium" ]]; then
    brainstorm_status="completed"
  fi
  if [[ "$weight" == "lightweight" ]]; then
    approve_status="skipped"
  fi

  cat > "${dir_path}/directive.json" <<ENDJSON
{
  "title": "${title}",
  "status": "${status}",
  "weight": "${weight}",
  "current_step": "${current_step}",
  "created": "2026-03-08T10:00:00Z",
  "started_at": "2026-03-08T10:00:00Z",
  "updated_at": "2026-03-08T10:30:00Z",
  "pipeline": {
    "triage": { "status": "completed", "agent": "CEO", "output": { "summary": "Triaged" } },
    "read": { "status": "completed", "agent": "CEO", "output": { "summary": "Read" } },
    "context": { "status": "completed", "agent": "CEO", "output": { "summary": "Context" } },
    "challenge": { "status": "${challenge_status}", "agent": "C-suite", "output": { "summary": "Challenged" } },
    "brainstorm": { "status": "${brainstorm_status}", "agent": "CTO", "output": { "summary": "Brainstormed" } },
    "plan": { "status": "completed", "agent": "COO", "output": { "summary": "Planned" } },
    "audit": { "status": "completed", "agent": "CTO", "output": { "summary": "Audited" } },
    "approve": { "status": "${approve_status}", "agent": "CEO", "output": { "summary": "Approved" } },
    "project-brainstorm": { "status": "completed", "agent": "CTO", "output": { "summary": "Tasks" } },
    "setup": { "status": "completed", "agent": "CEO", "output": { "summary": "Setup" } },
    "execute": { "status": "active", "agent": "FS", "output": { "summary": "Building" } }
  }
}
ENDJSON
}

create_project() {
  local project_dir="$1"
  local dir_id="$2"
  local proj_id="$3"
  local proj_title="$4"
  local proj_status="$5"

  local proj_path="${project_dir}/.context/directives/${dir_id}/projects/${proj_id}"
  mkdir -p "$proj_path"

  cat > "${proj_path}/project.json" <<ENDJSON
{
  "title": "${proj_title}",
  "status": "${proj_status}",
  "agent": ["dev1"],
  "reviewers": ["reviewer1"],
  "tasks": [
    { "title": "Task A", "status": "completed", "agent": "dev1", "dod": [{ "criterion": "Works", "met": true }] },
    { "title": "Task B", "status": "in_progress", "agent": "dev1", "dod": [{ "criterion": "Passes tests", "met": false }] },
    { "title": "Task C", "status": "pending", "agent": "dev1", "dod": [{ "criterion": "Reviewed", "met": false }] }
  ]
}
ENDJSON
}

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 1: Init → Server → Agent Registry (all presets)
# Real user: installs gru-ai, inits project, starts server, game loads agents
# ═════════════════════════════════════════════════════════════════════════════

test_preset_to_server() {
  local preset="$1"
  local expected_agents="$2"

  log_section "Scenario 1: Init(${preset}) → Server → Agent Registry"

  local dir
  dir="$(create_test_dir "e2e-test-integ-${preset}")"
  add_temp_dir "$dir"

  # Step 1: Init
  run_gruai_init "$dir" "$preset" > /dev/null 2>&1 || true
  assert_dir_exists "${dir}/.gruai" "${preset}: init succeeded"

  # Step 2: Start server
  local port
  port="$(find_free_port)"
  if ! start_server "$dir" "$port"; then
    return
  fi
  log_pass "${preset}: server started on port ${port}"

  # Step 3: Verify agent registry via API
  local agent_count
  agent_count="$(api_query "$port" "/api/agent-registry" "print(len(data.get('agents',[])))")"
  assert_eq "$agent_count" "$expected_agents" "${preset}: API returns ${expected_agents} agents"

  # Step 4: Verify CEO is first with isPlayer
  local ceo_id
  ceo_id="$(api_query "$port" "/api/agent-registry" "print(data['agents'][0]['id'])")"
  assert_eq "$ceo_id" "ceo" "${preset}: CEO is first agent"

  local ceo_is_player
  ceo_is_player="$(api_query "$port" "/api/agent-registry" "print(data['agents'][0].get('game',{}).get('isPlayer',False))")"
  assert_eq "$ceo_is_player" "True" "${preset}: CEO has isPlayer=true"

  # Step 5: Verify ALL agents have game config
  local agents_with_game
  agents_with_game="$(api_query "$port" "/api/agent-registry" \
    "print(sum(1 for a in data['agents'] if a.get('game')))")"
  assert_eq "$agents_with_game" "$expected_agents" "${preset}: all ${expected_agents} agents have game config"

  # Step 6: Verify no duplicate seatIds
  local unique_seats
  unique_seats="$(api_query "$port" "/api/agent-registry" \
    "seats=[a['game']['seatId'] for a in data['agents'] if a.get('game')]; print(len(seats)==len(set(seats)))")"
  assert_eq "$unique_seats" "True" "${preset}: no duplicate seatIds"

  # Step 7: Verify no duplicate palettes
  local unique_palettes
  unique_palettes="$(api_query "$port" "/api/agent-registry" \
    "p=[a['game']['palette'] for a in data['agents'] if a.get('game')]; print(len(p)==len(set(p)))")"
  assert_eq "$unique_palettes" "True" "${preset}: no duplicate palettes"

  # Step 8: Verify agent names are non-empty strings (not template placeholders)
  local names_valid
  names_valid="$(api_query "$port" "/api/agent-registry" \
    "print(all(len(a.get('name',''))>2 and '{{' not in a.get('name','') for a in data['agents']))")"
  assert_eq "$names_valid" "True" "${preset}: all agent names are real (no placeholders)"

  # Step 9: Verify game configs have required fields
  local game_fields_valid
  game_fields_valid="$(api_query "$port" "/api/agent-registry" \
    "print(all('palette' in a['game'] and 'seatId' in a['game'] and 'position' in a['game'] and 'color' in a['game'] for a in data['agents'] if a.get('game')))")"
  assert_eq "$game_fields_valid" "True" "${preset}: all game configs have palette/seatId/position/color"

  kill_server_on_port "$port"
}

test_preset_to_server "starter" "5"
test_preset_to_server "standard" "8"
test_preset_to_server "full" "12"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 2: Init → Create Directive → Server shows it in API
# Real user: inits project, starts working, directive appears on dashboard
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 2: Init → Directive → Server API shows directive"

SC2_DIR="$(create_test_dir "e2e-test-integ-directive")"
add_temp_dir "$SC2_DIR"

run_gruai_init "$SC2_DIR" "starter" > /dev/null 2>&1 || true

# Create an active directive
create_directive "$SC2_DIR" "build-feature" "Build Feature X" "in_progress" "medium" "execute"
create_project "$SC2_DIR" "build-feature" "impl" "Implementation" "in_progress"

SC2_PORT="$(find_free_port)"
start_server "$SC2_DIR" "$SC2_PORT" || true

# Verify directive appears in API
active_count="$(api_query "$SC2_PORT" "/api/state" "print(len(data.get('activeDirectives',[])))")"
assert_eq "$active_count" "1" "directive visible: activeDirectives=1"

dir_name="$(api_query "$SC2_PORT" "/api/state" "print(data['activeDirectives'][0]['directiveName'])")"
assert_eq "$dir_name" "build-feature" "directive name correct"

dir_title="$(api_query "$SC2_PORT" "/api/state" "print(data['activeDirectives'][0]['title'])")"
assert_eq "$dir_title" "Build Feature X" "directive title correct"

dir_status="$(api_query "$SC2_PORT" "/api/state" "print(data['activeDirectives'][0]['status'])")"
assert_eq "$dir_status" "in_progress" "directive status = in_progress"

current_step="$(api_query "$SC2_PORT" "/api/state" "print(data['activeDirectives'][0]['currentStepId'])")"
assert_eq "$current_step" "execute" "directive current_step = execute"

pipeline_count="$(api_query "$SC2_PORT" "/api/state" "print(len(data['activeDirectives'][0].get('pipelineSteps',[])))")"
assert_eq "$pipeline_count" "14" "directive has 14 pipeline steps"

# Verify project + task data flows through
proj_count="$(api_query "$SC2_PORT" "/api/state" "print(len(data['activeDirectives'][0].get('projects',[])))")"
assert_eq "$proj_count" "1" "directive has 1 project"

task_count="$(api_query "$SC2_PORT" "/api/state" \
  "print(len(data['activeDirectives'][0]['projects'][0].get('tasks',[])))")"
assert_eq "$task_count" "3" "project has 3 tasks"

completed_tasks="$(api_query "$SC2_PORT" "/api/state" \
  "print(sum(1 for t in data['activeDirectives'][0]['projects'][0]['tasks'] if t['status']=='completed'))")"
assert_eq "$completed_tasks" "1" "1 task completed"

# Verify WebSocket initial state matches API
ws_active="$(node -e "
const WebSocket = require('${GRUAI_PACKAGE_ROOT}/node_modules/ws');
const ws = new WebSocket('ws://localhost:${SC2_PORT}');
ws.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.type === 'full_state') {
    console.log((m.payload.activeDirectives || []).length);
    ws.close();
    process.exit(0);
  }
});
setTimeout(() => { console.log('timeout'); process.exit(1); }, 5000);
" 2>/dev/null)" || ws_active="error"
assert_eq "$ws_active" "1" "WebSocket full_state has activeDirectives=1"

kill_server_on_port "$SC2_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 3: Pipeline weight classes — skipped steps correct
# Real user: different directive weights skip different pipeline steps
# ═════════════════════════════════════════════════════════════════════════════

test_weight_class() {
  local weight="$1"
  local expected_skipped="$2"  # comma-separated step IDs that should be skipped

  log_section "Scenario 3: Weight class ${weight} — skipped steps"

  local dir
  dir="$(create_test_dir "e2e-test-integ-weight-${weight}")"
  add_temp_dir "$dir"

  run_gruai_init "$dir" "starter" > /dev/null 2>&1 || true
  create_directive_full "$dir" "test-${weight}" "Test ${weight}" "in_progress" "$weight" "execute"

  local port
  port="$(find_free_port)"
  start_server "$dir" "$port" || return

  # Get skipped steps
  local skipped
  skipped="$(api_query "$port" "/api/state" \
    "steps=data['activeDirectives'][0].get('pipelineSteps',[]); print(','.join(s['id'] for s in steps if s['status']=='skipped') or 'none')")"
  assert_eq "$skipped" "$expected_skipped" "${weight}: skipped steps = ${expected_skipped}"

  # Verify active step exists
  local active_step
  active_step="$(api_query "$port" "/api/state" \
    "steps=data['activeDirectives'][0].get('pipelineSteps',[]); active=[s for s in steps if s['status']=='active']; print(active[0]['id'] if active else 'none')")"
  assert_eq "$active_step" "execute" "${weight}: active step = execute"

  # Count completed steps
  local completed_steps
  completed_steps="$(api_query "$port" "/api/state" \
    "steps=data['activeDirectives'][0].get('pipelineSteps',[]); print(sum(1 for s in steps if s['status']=='completed'))")"
  assert_gt "$completed_steps" "5" "${weight}: has >5 completed steps"

  kill_server_on_port "$port"
}

test_weight_class "lightweight" "challenge,brainstorm,approve"
test_weight_class "medium" "challenge"
test_weight_class "heavyweight" "none"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 4: Multiple simultaneous directives
# Real user: has several directives in various states
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 4: Multiple directives — active + completed + awaiting"

SC4_DIR="$(create_test_dir "e2e-test-integ-multi")"
add_temp_dir "$SC4_DIR"

run_gruai_init "$SC4_DIR" "starter" > /dev/null 2>&1 || true

# Create directives in different states
create_directive "$SC4_DIR" "active-1" "Active One" "in_progress" "medium" "execute"
create_directive "$SC4_DIR" "active-2" "Active Two" "in_progress" "lightweight" "execute"

# Awaiting completion
mkdir -p "${SC4_DIR}/.context/directives/awaiting-1"
cat > "${SC4_DIR}/.context/directives/awaiting-1/directive.json" <<'ENDJSON'
{
  "title": "Awaiting Approval",
  "status": "awaiting_completion",
  "weight": "medium",
  "current_step": "completion",
  "created": "2026-03-08T08:00:00Z",
  "started_at": "2026-03-08T08:00:00Z",
  "updated_at": "2026-03-08T09:00:00Z",
  "pipeline": {
    "triage": { "status": "completed" },
    "completion": { "status": "active" }
  }
}
ENDJSON

# Completed
mkdir -p "${SC4_DIR}/.context/directives/done-1"
cat > "${SC4_DIR}/.context/directives/done-1/directive.json" <<'ENDJSON'
{
  "title": "Done Feature",
  "status": "completed",
  "weight": "lightweight",
  "current_step": "completion",
  "created": "2026-03-07T10:00:00Z",
  "updated_at": "2026-03-07T11:00:00Z"
}
ENDJSON

# Failed
mkdir -p "${SC4_DIR}/.context/directives/failed-1"
cat > "${SC4_DIR}/.context/directives/failed-1/directive.json" <<'ENDJSON'
{
  "title": "Failed Feature",
  "status": "failed",
  "weight": "medium",
  "current_step": "execute",
  "created": "2026-03-06T10:00:00Z",
  "updated_at": "2026-03-06T12:00:00Z"
}
ENDJSON

SC4_PORT="$(find_free_port)"
start_server "$SC4_DIR" "$SC4_PORT" || true

# Active = in_progress + awaiting_completion
active_count="$(api_query "$SC4_PORT" "/api/state" "print(len(data.get('activeDirectives',[])))")"
assert_eq "$active_count" "3" "multi: 3 active directives (2 in_progress + 1 awaiting)"

# History = all directives
history_count="$(api_query "$SC4_PORT" "/api/state" "print(len(data.get('directiveHistory',[])))")"
# welcome + active-1 + active-2 + awaiting-1 + done-1 + failed-1 = 6
assert_eq "$history_count" "6" "multi: 6 total in history (includes welcome)"

# Completed NOT in active
completed_in_active="$(api_query "$SC4_PORT" "/api/state" \
  "print(sum(1 for d in data.get('activeDirectives',[]) if d['status']=='completed'))")"
assert_eq "$completed_in_active" "0" "multi: completed not in activeDirectives"

# Awaiting IS in active
awaiting_in_active="$(api_query "$SC4_PORT" "/api/state" \
  "print(sum(1 for d in data.get('activeDirectives',[]) if d['status']=='awaiting_completion'))")"
assert_eq "$awaiting_in_active" "1" "multi: awaiting_completion IS in activeDirectives"

kill_server_on_port "$SC4_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 5: Directive watcher picks up live changes
# Real user: starts server, then creates/modifies directive — dashboard updates
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 5: Live directive watcher — create directive while server runs"

SC5_DIR="$(create_test_dir "e2e-test-integ-live")"
add_temp_dir "$SC5_DIR"

run_gruai_init "$SC5_DIR" "starter" > /dev/null 2>&1 || true

SC5_PORT="$(find_free_port)"
start_server "$SC5_DIR" "$SC5_PORT" || true

# Initially only welcome directive (pending, not active)
initial_active="$(api_query "$SC5_PORT" "/api/state" "print(len(data.get('activeDirectives',[])))")"
assert_eq "$initial_active" "0" "live: initially 0 active directives"

# Create a directive while server is running
create_directive "$SC5_DIR" "live-feature" "Live Feature" "in_progress" "medium" "execute"

# Wait for watcher to pick it up (poll + debounce = ~5s max)
sleep 6

# Check again
after_active="$(api_query "$SC5_PORT" "/api/state" "print(len(data.get('activeDirectives',[])))")"
assert_eq "$after_active" "1" "live: watcher detected new directive (active=1)"

live_name="$(api_query "$SC5_PORT" "/api/state" "print(data['activeDirectives'][0]['directiveName'])")"
assert_eq "$live_name" "live-feature" "live: directive name = live-feature"

# Modify the directive (change step)
sed -i.bak 's/"current_step": "execute"/"current_step": "review-gate"/' \
  "${SC5_DIR}/.context/directives/live-feature/directive.json"
rm -f "${SC5_DIR}/.context/directives/live-feature/directive.json.bak"

sleep 6

updated_step="$(api_query "$SC5_PORT" "/api/state" "print(data['activeDirectives'][0]['currentStepId'])")"
assert_eq "$updated_step" "review-gate" "live: watcher detected step change to review-gate"

kill_server_on_port "$SC5_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 6: Agent name flow-through — custom names in init → API
# Real user: generates agents with random names, sees them in dashboard
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 6: Agent names flow init → registry → API"

SC6_DIR="$(create_test_dir "e2e-test-integ-names")"
add_temp_dir "$SC6_DIR"

run_gruai_init "$SC6_DIR" "standard" > /dev/null 2>&1 || true

SC6_PORT="$(find_free_port)"
start_server "$SC6_DIR" "$SC6_PORT" || true

# Get agent names from file and API
file_names="$(jq -r '[.agents[].name] | sort | join(",")' "${SC6_DIR}/.gruai/agent-registry.json")"
api_names="$(api_query "$SC6_PORT" "/api/agent-registry" \
  "print(','.join(sorted(a['name'] for a in data['agents'])))")"
assert_eq "$api_names" "$file_names" "names: API matches file registry"

# Verify every agent has a two-part name (first + last)
names_have_space="$(api_query "$SC6_PORT" "/api/agent-registry" \
  "print(all(' ' in a['name'] for a in data['agents'] if a['id'] != 'ceo'))")"
assert_eq "$names_have_space" "True" "names: all non-CEO agents have first+last name"

# Verify personality files have agent names (not placeholders)
local_check_pass=true
for agent_file in "${SC6_DIR}"/.gruai/agents/*.md; do
  if [[ -f "$agent_file" ]]; then
    if grep -q '{{NAME}}' "$agent_file" 2>/dev/null; then
      log_fail "names: ${agent_file} still has {{NAME}} placeholder"
      local_check_pass=false
    fi
  fi
done
if $local_check_pass; then
  log_pass "names: no personality files have {{NAME}} placeholder"
fi

kill_server_on_port "$SC6_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 7: Project + Task detail chain
# Real user: directive has projects with tasks, DOD — all visible in API
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 7: Project/task detail visible through API"

SC7_DIR="$(create_test_dir "e2e-test-integ-tasks")"
add_temp_dir "$SC7_DIR"

run_gruai_init "$SC7_DIR" "starter" > /dev/null 2>&1 || true
create_directive "$SC7_DIR" "task-dir" "Task Directive" "in_progress" "medium" "execute"

# Create 2 projects with different task states
mkdir -p "${SC7_DIR}/.context/directives/task-dir/projects/proj-a"
cat > "${SC7_DIR}/.context/directives/task-dir/projects/proj-a/project.json" <<'ENDJSON'
{
  "title": "Project Alpha",
  "status": "in_progress",
  "agent": ["dev-a"],
  "reviewers": ["rev-a"],
  "tasks": [
    { "title": "Setup", "status": "completed", "agent": "dev-a", "dod": [{"criterion":"Scaffolded","met":true}] },
    { "title": "Build", "status": "in_progress", "agent": "dev-a", "dod": [{"criterion":"Tests pass","met":false}] }
  ]
}
ENDJSON

mkdir -p "${SC7_DIR}/.context/directives/task-dir/projects/proj-b"
cat > "${SC7_DIR}/.context/directives/task-dir/projects/proj-b/project.json" <<'ENDJSON'
{
  "title": "Project Beta",
  "status": "pending",
  "agent": ["dev-b"],
  "reviewers": ["rev-b"],
  "tasks": [
    { "title": "Research", "status": "pending", "agent": "dev-b", "dod": [{"criterion":"Report written","met":false}] },
    { "title": "Implement", "status": "pending", "agent": "dev-b", "dod": [{"criterion":"Code done","met":false}] },
    { "title": "Test", "status": "pending", "agent": "dev-b", "dod": [{"criterion":"Coverage >80%","met":false}] }
  ]
}
ENDJSON

SC7_PORT="$(find_free_port)"
start_server "$SC7_DIR" "$SC7_PORT" || true

proj_count="$(api_query "$SC7_PORT" "/api/state" \
  "print(len(data['activeDirectives'][0].get('projects',[])))")"
assert_eq "$proj_count" "2" "tasks: 2 projects visible"

proj_a_tasks="$(api_query "$SC7_PORT" "/api/state" \
  "ps=data['activeDirectives'][0]['projects']; pa=[p for p in ps if p['id']=='proj-a']; print(len(pa[0]['tasks']) if pa else 0)")"
assert_eq "$proj_a_tasks" "2" "tasks: proj-a has 2 tasks"

proj_b_tasks="$(api_query "$SC7_PORT" "/api/state" \
  "ps=data['activeDirectives'][0]['projects']; pb=[p for p in ps if p['id']=='proj-b']; print(len(pb[0]['tasks']) if pb else 0)")"
assert_eq "$proj_b_tasks" "3" "tasks: proj-b has 3 tasks"

# Verify task DOD data flows through
has_dod="$(api_query "$SC7_PORT" "/api/state" \
  "ps=data['activeDirectives'][0]['projects']; t=ps[0]['tasks'][0]; print('dod' in t and len(t['dod'])>0)")"
assert_eq "$has_dod" "True" "tasks: DOD data present in task"

# Verify project-level agent/reviewers
has_agent="$(api_query "$SC7_PORT" "/api/state" \
  "ps=data['activeDirectives'][0]['projects']; print(len(ps[0].get('agent',[]))>0)")"
assert_eq "$has_agent" "True" "tasks: project has agent array"

has_reviewers="$(api_query "$SC7_PORT" "/api/state" \
  "ps=data['activeDirectives'][0]['projects']; print(len(ps[0].get('reviewers',[]))>0)")"
assert_eq "$has_reviewers" "True" "tasks: project has reviewers array"

kill_server_on_port "$SC7_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 8: Edge — corrupt directive.json doesn't crash server
# Real user: filesystem has junk, server should be resilient
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 8: Edge — corrupt JSON doesn't crash server"

SC8_DIR="$(create_test_dir "e2e-test-integ-corrupt")"
add_temp_dir "$SC8_DIR"

run_gruai_init "$SC8_DIR" "starter" > /dev/null 2>&1 || true

# Create one good directive
create_directive "$SC8_DIR" "good-dir" "Good Directive" "in_progress" "medium" "execute"

# Create corrupt directive
mkdir -p "${SC8_DIR}/.context/directives/corrupt-dir"
echo "{ this is not valid json !!!" > "${SC8_DIR}/.context/directives/corrupt-dir/directive.json"

# Create empty directive
mkdir -p "${SC8_DIR}/.context/directives/empty-dir"
echo "{}" > "${SC8_DIR}/.context/directives/empty-dir/directive.json"

SC8_PORT="$(find_free_port)"
start_server "$SC8_DIR" "$SC8_PORT" || true

# Server should NOT crash — health check should work
health="$(api_query "$SC8_PORT" "/api/health" "print(data.get('status',''))")"
assert_eq "$health" "ok" "corrupt: server still healthy"

# Good directive should still be visible
active="$(api_query "$SC8_PORT" "/api/state" "print(len(data.get('activeDirectives',[])))")"
assert_eq "$active" "1" "corrupt: good directive still visible (active=1)"

good_name="$(api_query "$SC8_PORT" "/api/state" "print(data['activeDirectives'][0]['directiveName'])")"
assert_eq "$good_name" "good-dir" "corrupt: good directive name correct"

kill_server_on_port "$SC8_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 9: Edge — server starts with no directives at all
# Real user: fresh project, no work done yet
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 9: Edge — fresh project with no directives"

SC9_DIR="$(create_test_dir "e2e-test-integ-empty")"
add_temp_dir "$SC9_DIR"

run_gruai_init "$SC9_DIR" "starter" > /dev/null 2>&1 || true

# Remove welcome directive to simulate truly empty
rm -rf "${SC9_DIR}/.context/directives/welcome"

SC9_PORT="$(find_free_port)"
start_server "$SC9_DIR" "$SC9_PORT" || true

active="$(api_query "$SC9_PORT" "/api/state" "print(len(data.get('activeDirectives',[])))")"
assert_eq "$active" "0" "empty: 0 active directives"

# Agent registry should still work fine
agent_count="$(api_query "$SC9_PORT" "/api/agent-registry" "print(len(data.get('agents',[])))")"
assert_eq "$agent_count" "5" "empty: agent registry works (5 agents)"

kill_server_on_port "$SC9_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# SCENARIO 10: Awaiting completion — needsAction flag
# Real user: directive done, waiting for CEO approval on dashboard
# ═════════════════════════════════════════════════════════════════════════════

log_section "Scenario 10: Awaiting completion — needsAction on completion step"

SC10_DIR="$(create_test_dir "e2e-test-integ-awaiting")"
add_temp_dir "$SC10_DIR"

run_gruai_init "$SC10_DIR" "starter" > /dev/null 2>&1 || true

mkdir -p "${SC10_DIR}/.context/directives/await-dir"
cat > "${SC10_DIR}/.context/directives/await-dir/directive.json" <<'ENDJSON'
{
  "title": "Awaiting CEO",
  "status": "awaiting_completion",
  "weight": "medium",
  "current_step": "completion",
  "created": "2026-03-08T08:00:00Z",
  "started_at": "2026-03-08T08:00:00Z",
  "updated_at": "2026-03-08T09:00:00Z",
  "pipeline": {
    "triage": { "status": "completed", "output": { "summary": "Done" } },
    "read": { "status": "completed", "output": { "summary": "Done" } },
    "context": { "status": "completed", "output": { "summary": "Done" } },
    "plan": { "status": "completed", "output": { "summary": "Done" } },
    "audit": { "status": "completed", "output": { "summary": "Done" } },
    "approve": { "status": "completed", "output": { "summary": "Done" } },
    "project-brainstorm": { "status": "completed", "output": { "summary": "Done" } },
    "setup": { "status": "completed", "output": { "summary": "Done" } },
    "execute": { "status": "completed", "output": { "summary": "Done" } },
    "review-gate": { "status": "completed", "output": { "summary": "Done" } },
    "wrapup": { "status": "completed", "output": { "summary": "Done" } },
    "completion": { "status": "active", "output": { "summary": "Awaiting CEO" } }
  }
}
ENDJSON

SC10_PORT="$(find_free_port)"
start_server "$SC10_DIR" "$SC10_PORT" || true

# Should be in active directives
in_active="$(api_query "$SC10_PORT" "/api/state" \
  "print(any(d['directiveName']=='await-dir' for d in data.get('activeDirectives',[])))")"
assert_eq "$in_active" "True" "awaiting: appears in activeDirectives"

# Completion step should have needsAction=true
needs_action="$(api_query "$SC10_PORT" "/api/state" \
  "d=[x for x in data['activeDirectives'] if x['directiveName']=='await-dir'][0]; cs=[s for s in d['pipelineSteps'] if s['id']=='completion']; print(cs[0].get('needsAction',False) if cs else False)")"
assert_eq "$needs_action" "True" "awaiting: completion step has needsAction=true"

# Status should be awaiting_completion
dir_status="$(api_query "$SC10_PORT" "/api/state" \
  "d=[x for x in data['activeDirectives'] if x['directiveName']=='await-dir'][0]; print(d['status'])")"
assert_eq "$dir_status" "awaiting_completion" "awaiting: status = awaiting_completion"

kill_server_on_port "$SC10_PORT"

# ═════════════════════════════════════════════════════════════════════════════
# Results
# ═════════════════════════════════════════════════════════════════════════════

DIM_ELAPSED="$(stop_timer "$DIM_START")"
write_result_json "$DIM_NAME" "$DIM_ELAPSED"

log_section "dim-integration results"
printf "  Pass: %d  Fail: %d  Time: %d ms\n\n" "$_PASS_COUNT" "$_FAIL_COUNT" "$DIM_ELAPSED"

if (( _FAIL_COUNT > 0 )); then
  exit 1
fi
