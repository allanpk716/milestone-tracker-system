# S03: E2E 自动化测试 + /release 技能

**Goal:** 部署后 E2E 测试脚本全部通过（健康检查/登录/API认证/核心业务流），/release 命令可用
**Demo:** 部署后 E2E 测试脚本全部通过（健康检查/登录/API认证/核心业务流），/release 命令可用

## Must-Haves

- 1. E2E test suite passes against deployed service at http://172.18.200.47:30002 covering: health check (GET /api/health returns status:ok), login (POST /api/auth/login returns token), API auth (Bearer token grants access, invalid token returns 401), core business flow (create milestone → PATCH status → verify).
- 2. `.gsd/skills/release/SKILL.md` exists with valid frontmatter and instructions to run deploy.bat + verify health.
- 3. Existing 363 tests still pass (no regressions).
- 4. E2E tests use Vitest runner, are located in `tests/e2e/`, and are excluded from default `npm test` (require explicit run).

## Proof Level

- This slice proves: integration — tests execute against a running HTTP server; skill file is loadable by GSD

## Integration Closure

Upstream surfaces consumed: S01 health endpoint (GET /api/health), S01 logger module (structured logs on deployed service), S02 deploy.bat pipeline and remote running service.
New wiring: E2E test runner targets remote service; /release skill invokes deploy.bat.
What remains: S04 (documentation) covers E2E test usage and /release command.

## Verification

- E2E test runner outputs structured results per-test with pass/fail and HTTP status codes. /release skill logs each phase (git status → build → deploy → health check) to stdout. Health check endpoint (/api/health) provides runtime signal for deploy verification.

## Tasks

- [x] **T01: Create E2E test suite for deployed service validation** `est:1.5h`
  Create a Vitest-based E2E test suite under `tests/e2e/` that validates the deployed Milestone Tracker service. Tests target the real running service at the configured BASE_URL (default http://172.18.200.47:30002). Uses native Node.js fetch (available in Node 22, no extra deps).
  - Files: `tests/e2e/e2e.config.ts`, `tests/e2e/health.test.ts`, `tests/e2e/auth.test.ts`, `tests/e2e/business-flow.test.ts`, `tests/e2e/helpers.ts`, `package.json`
  - Verify: npx vitest run tests/e2e/ --config tests/e2e/e2e.config.ts passes all tests (requires running service). Existing tests unaffected: npm test passes.

- [x] **T02: Create /release GSD skill file** `est:30m`
  Create `.gsd/skills/release/SKILL.md` — a GSD skill file that enables the `/release` slash command to trigger the full deploy pipeline.
  - Files: `.gsd/skills/release/SKILL.md`
  - Verify: test -f .gsd/skills/release/SKILL.md && grep -q 'name: release' .gsd/skills/release/SKILL.md && grep -q 'deploy.bat' .gsd/skills/release/SKILL.md

## Files Likely Touched

- tests/e2e/e2e.config.ts
- tests/e2e/health.test.ts
- tests/e2e/auth.test.ts
- tests/e2e/business-flow.test.ts
- tests/e2e/helpers.ts
- package.json
- .gsd/skills/release/SKILL.md
