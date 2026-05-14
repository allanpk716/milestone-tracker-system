# S03: E2E 自动化测试 + /release 技能 — UAT

**Milestone:** M002
**Written:** 2026-05-13T05:41:14.038Z


# S03: E2E 自动化测试 + /release 技能 — UAT

**Milestone:** M002
**Written:** 2026-05-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: E2E tests target a deployed remote service that may not be reachable during UAT; verifying test file structure, config isolation, and skill file correctness is sufficient. Live runtime UAT applies when the service is running.

## Preconditions

- Node.js 22+ available (for native fetch)
- Vitest installed (dev dependency)
- Remote service at http://172.18.200.47:30002 is running (for live E2E execution only)

## Smoke Test

```bash
npx vitest run --reporter=verbose
```
All 363 unit tests pass. E2E tests are NOT included in default run.

## Test Cases

### 1. E2E test files exist and are properly structured

1. Check `tests/e2e/` contains: `e2e.config.ts`, `helpers.ts`, `health.test.ts`, `auth.test.ts`, `business-flow.test.ts`
2. **Expected:** All 5 files present; e2e.config.ts uses `environment: 'node'` and separate include path

### 2. E2E tests are isolated from unit tests

1. Run `npm test`
2. **Expected:** 363 tests pass across 17 files; no E2E tests appear in output

### 3. E2E tests run explicitly

1. Run `npx vitest run tests/e2e/ --config tests/e2e/e2e.config.ts`
2. **Expected:** 14 tests discovered across 3 files; pass/fail depends on service availability

### 4. /release skill file is valid

1. Check `.gsd/skills/release/SKILL.md` exists
2. Verify frontmatter contains `name: release`
3. Verify body references `deploy.bat`
4. **Expected:** All checks pass; skill describes 4-step pipeline (git check → deploy → E2E → report)

### 5. Health endpoint E2E test logic

1. Read `tests/e2e/health.test.ts`
2. **Expected:** Tests for GET /api/health returning status:ok and checking response structure

### 6. Auth E2E test coverage

1. Read `tests/e2e/auth.test.ts`
2. **Expected:** Tests for login (POST /api/auth/login), valid Bearer token access, and 401 on invalid token

### 7. Business flow E2E test coverage

1. Read `tests/e2e/business-flow.test.ts`
2. **Expected:** Tests for create milestone → PATCH status → verify lifecycle, plus 404 and validation error handling

## Edge Cases

### Service unreachable

1. Run E2E tests when remote service is down
2. **Expected:** Tests fail with connection timeout errors (not crash/hang); test runner reports per-test failures clearly

### Missing environment variables

1. Run E2E tests without setting E2E_BASE_URL, E2E_ADMIN_PASSWORD, E2E_API_KEY
2. **Expected:** Defaults to http://172.18.200.47:30002; auth tests fail with clear error if credentials not set

## Failure Signals

- `npm test` shows fewer than 363 tests (regression)
- E2E config is picked up by default vitest run (isolation failure)
- SKILL.md missing or malformed frontmatter

## Not Proven By This UAT

- Live E2E tests passing against a running service (requires deployed service at 172.18.200.47:30002)
- Actual /release slash command execution in GSD agent (requires GSD runtime)
- Business flow correctness with real data (requires seeded database)

## Notes for Tester

- E2E tests are designed to fail gracefully when the remote service is unreachable — this is expected behavior
- The `test:e2e` script is the recommended way to run E2E tests (sets config path)
- /release skill is a GSD skill file; it requires the GSD agent framework to invoke as a slash command

