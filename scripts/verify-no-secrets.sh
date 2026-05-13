#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  verify-no-secrets.sh — 扫描 Git 跟踪文件中的敏感信息
# ════════════════════════════════════════════════════════════════
#
#  用法: bash scripts/verify-no-secrets.sh [--fail-fast]
#
#  检测模式:
#    - OpenAI/API 密钥 (sk-*, key-*)
#    - 密码赋值 (password=, PASSWORD=)
#    - 密钥赋值 (secret=, SECRET=, token=, TOKEN=)
#    - AWS 凭证 (AKIA*)
#    - 私钥标记 (BEGIN RSA PRIVATE KEY, BEGIN OPENSSH PRIVATE KEY)
#
#  排除规则:
#    - .env.example 文件（模板文件，仅包含占位符）
#    - .git/ 目录
#    - node_modules/
#    - 注释行（以 # 或 // 开头）
#    - "changeme"、"xxx"、"your-"、"example" 等占位符值
# ════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FAIL_FAST=false
[ "${1:-}" = "--fail-fast" ] && FAIL_FAST=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
FAILURES=0
SCANNED=0

echo "============================================================"
echo "  Secret Scanning Report"
echo "  Project: $(basename "$PROJECT_ROOT")"
echo "  Date:    $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"
echo ""

# Get list of tracked files (excluding .git directory)
mapfile -t TRACKED_FILES < <(cd "$PROJECT_ROOT" && git ls-files 2>/dev/null || find . -type f \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './.next/*' \
  -not -path './build/*' \
  -not -path './dist/*' \
  -not -path './.gsd/*' \
  | sed 's|^\./||')

# Secret patterns (grep -E extended regex)
# Each pattern: "description|regex"
PATTERNS=(
  "OpenAI API Key|sk-[a-zA-Z0-9]{20,}"
  "Generic API Key (sk-)|sk-[a-zA-Z0-9_-]{10,}"
  "Password Assignment|(?i)(^|[^a-zA-Z])(password|passwd|pwd)\s*=\s*[^\s#]{4,}"
  "Secret Assignment|(?i)(^|[^a-zA-Z])(secret|client_secret)\s*=\s*[^\s#]{4,}"
  "Token Assignment|(?i)(^|[^a-zA-Z])(token|access_token|auth_token)\s*=\s*[^\s#]{4,}"
  "AWS Access Key|AKIA[0-9A-Z]{16}"
  "Private Key Block|-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"
  "API Key Assignment|(?i)(^|[^a-zA-Z])(api_key|apikey)\s*=\s*[^\s#]{4,}"
)

# Placeholder values to exclude (these are safe)
PLACEHOLDER_VALUES=(
  "changeme"
  "xxx"
  "your-"
  "example"
  "placeholder"
  "TODO"
  "dummy"
  "test"
  "localhost"
  "127\\.0\\.0\\.1"
)

# Build exclusion regex for placeholder values
PLACEHOLDER_RE=""
for val in "${PLACEHOLDER_VALUES[@]}"; do
  if [ -n "$PLACEHOLDER_RE" ]; then
    PLACEHOLDER_RE+="|${val}"
  else
    PLACEHOLDER_RE="${val}"
  fi
done

# Files to skip entirely
SKIP_FILES=(
  ".env.example"
  "deploy-config.bat.example"
  "verify-no-secrets.sh"
)

should_skip_file() {
  local file="$1"
  for skip in "${SKIP_FILES[@]}"; do
    [[ "$file" == *"$skip"* ]] && return 0
  done
  return 1
}

# Check if a matched line is just a placeholder
is_placeholder() {
  local line="$1"
  echo "$line" | grep -qE "$PLACEHOLDER_RE" && return 0
  return 1
}

for file in "${TRACKED_FILES[@]}"; do
  # Skip binary files and excluded files
  should_skip_file "$file" && continue
  case "$file" in
    *.png|*.jpg|*.jpeg|*.gif|*.ico|*.svg|*.woff|*.woff2|*.ttf|*.eot|*.gz|*.zip|*.db|*.sqlite)
      continue ;;
  esac

  SCANNED=$((SCANNED + 1))

  for pattern_entry in "${PATTERNS[@]}"; do
    IFS='|' read -r description regex <<< "$pattern_entry"

    # Search for matches (excluding comment lines)
    while IFS= read -r match_line; do
      [ -z "$match_line" ] && continue

      # Skip comment lines
      [[ "$match_line" =~ ^[[:space:]]*# ]] && continue
      [[ "$match_line" =~ ^[[:space:]]*// ]] && continue

      # Skip if the matched value looks like a placeholder
      is_placeholder "$match_line" && continue

      FAILURES=$((FAILURES + 1))
      echo -e "${RED}[FAIL]${NC} ${file}"
      echo "       Pattern: ${description}"
      echo "       Line:    ${match_line}"
      echo ""

      if $FAIL_FAST; then
        echo -e "${RED}Secret detected. Aborting (--fail-fast).${NC}"
        exit 1
      fi
    done < <(grep -nE "$regex" "$PROJECT_ROOT/$file" 2>/dev/null || true)
  done
done

echo "============================================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "  ${GREEN}✓ No secrets found${NC}"
  echo "  Files scanned: ${SCANNED}"
else
  echo -e "  ${RED}✗ ${FAILURES} potential secret(s) found${NC}"
  echo "  Files scanned: ${SCANNED}"
fi
echo "============================================================"

[ "$FAILURES" -eq 0 ] && exit 0 || exit 1
