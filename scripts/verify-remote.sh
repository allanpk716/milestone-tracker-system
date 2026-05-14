#!/usr/bin/env bash
# verify-remote.sh — Remote CLI verification against deployed service
#
# Creates a temp .mt-cli.json pointing at the remote service, runs key mt-cli
# commands, validates exit code 0 and valid JSON output, and reports structured
# pass/fail results.
#
# Usage: bash scripts/verify-remote.sh
#   Optional env vars:
#     REMOTE_URL   — remote service URL (default: http://172.18.200.47:30002)
#     E2E_API_KEY  — API key for auth (default: mt_key_for_agent_1)
#     CLI_BIN      — path to CLI entry (default: packages/cli/dist/index.js)

set -euo pipefail

REMOTE_URL="${REMOTE_URL:-http://172.18.200.47:30002}"
API_KEY="${E2E_API_KEY:-mt_key_for_agent_1}"
CLI_BIN="${CLI_BIN:-packages/cli/dist/index.js}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_PATH="$PROJECT_ROOT/$CLI_BIN"

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Counters ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
TOTAL=0
RESULTS=()

# ── Pre-flight ───────────────────────────────────────────────────────────────
echo "=== Remote CLI Verification ==="
echo "Remote URL : $REMOTE_URL"
echo "API Key    : ${API_KEY:0:10}..."
echo "CLI Path   : $CLI_PATH"
echo ""

# Health check
echo -n "[PRE] Health check ... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$REMOTE_URL/api/health" --connect-timeout 5)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}OK${NC} (HTTP $HTTP_CODE)"
else
    echo -e "${RED}FAIL${NC} (HTTP $HTTP_CODE)"
    echo "Remote service is not healthy. Aborting."
    exit 1
fi

# ── Temp config ──────────────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Discover a milestone from the remote service
MILESTONE_ID=$(curl -s "$REMOTE_URL/api/milestones" \
    -H "Authorization: Bearer $API_KEY" \
    --connect-timeout 5 | \
    node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
        const arr=JSON.parse(d);
        if(!Array.isArray(arr)||arr.length===0){console.error('No milestones found');process.exit(1);}
        console.log(arr[0].id);
    });
")

if [ -z "$MILESTONE_ID" ]; then
    echo -e "${RED}ERROR${NC}: Could not discover a milestone from remote service"
    exit 1
fi
echo "[PRE] Using milestone: $MILESTONE_ID"

# Write .mt-cli.json in temp dir
cat > "$WORK_DIR/.mt-cli.json" <<EOF
{
  "serverUrl": "$REMOTE_URL",
  "milestoneId": "$MILESTONE_ID",
  "key": "$API_KEY"
}
EOF

# ── Run command helper ───────────────────────────────────────────────────────
# Usage: run_check <label> <cli_args...>
run_check() {
    local label="$1"
    shift
    local args=("$@")

    TOTAL=$((TOTAL + 1))
    local start_ms
    start_ms=$(date +%s%N)

    local stdout stderr exit_code
    # Run from WORK_DIR so .mt-cli.json is picked up from cwd
    stdout=$(cd "$WORK_DIR" && node "$CLI_PATH" "${args[@]}" 2>&1) && exit_code=0 || exit_code=$?

    local end_ms elapsed_ms
    end_ms=$(date +%s%N)
    elapsed_ms=$(( (end_ms - start_ms) / 1000000 ))

    # Validate exit code
    if [ "$exit_code" -ne 0 ]; then
        FAIL=$((FAIL + 1))
        RESULTS+=("$label|FAIL|exit=$exit_code|${elapsed_ms}ms|${stdout:0:200}")
        echo -e "  ${RED}✗ FAIL${NC} $label (exit=$exit_code, ${elapsed_ms}ms)"
        echo "    stdout: ${stdout:0:200}"
        return
    fi

    # Validate JSON output (--json flag should produce valid JSON)
    local json_check
    json_check=$(echo "$stdout" | node -e "
        let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
            try { JSON.parse(d); console.log('valid'); }
            catch(e) { console.log('invalid: '+e.message); }
        });
    " 2>&1)

    if [ "$json_check" = "valid" ]; then
        PASS=$((PASS + 1))
        RESULTS+=("$label|PASS|exit=0|${elapsed_ms}ms|ok")
        echo -e "  ${GREEN}✓ PASS${NC} $label (${elapsed_ms}ms)"
    else
        FAIL=$((FAIL + 1))
        RESULTS+=("$label|FAIL|exit=0|${elapsed_ms}ms|invalid JSON: ${json_check:0:100}")
        echo -e "  ${RED}✗ FAIL${NC} $label (invalid JSON: ${json_check:0:100})"
    fi
}

# ── Run CLI checks ──────────────────────────────────────────────────────────
echo ""
echo "--- CLI Command Checks ---"

run_check "status --json" status --json
run_check "tasks list --json" tasks list --json
run_check "modules list --json" modules list --json

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "=== Summary ==="
echo "Total : $TOTAL"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""
echo "--- Detailed Results ---"
printf "  %-25s %-6s %-12s %s\n" "CHECK" "STATUS" "DETAILS" "INFO"
for r in "${RESULTS[@]}"; do
    IFS='|' read -r label status detail info <<< "$r"
    if [ "$status" = "PASS" ]; then
        printf "  ${GREEN}%-25s %-6s %-12s %s${NC}\n" "$label" "$status" "$detail" "$info"
    else
        printf "  ${RED}%-25s %-6s %-12s %s${NC}\n" "$label" "$status" "$detail" "$info"
    fi
done
echo ""

# ── Structured JSON output ──────────────────────────────────────────────────
echo "--- Structured Output ---"
node -e "
    const results = $(printf '%s\n' "${RESULTS[@]}" | jq -R -s 'split("\n") | map(select(length>0) | split("|") | {label:.[0], status:.[1], detail:.[2], duration:.[3], info:.[4]})');
    console.log(JSON.stringify({total: $TOTAL, passed: $PASS, failed: $FAIL, results}, null, 2));
"

# ── Exit ─────────────────────────────────────────────────────────────────────
if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}All checks passed.${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed.${NC}"
    exit 1
fi
