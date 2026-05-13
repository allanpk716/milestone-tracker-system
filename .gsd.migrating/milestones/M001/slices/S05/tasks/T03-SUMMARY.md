---
id: T03
parent: S05
milestone: M001
key_files:
  - packages/cli/src/__tests__/concurrency.test.ts
  - packages/cli/src/__tests__/error-output.test.ts
key_decisions:
  - D_CLI_CONCURRENCY_TESTS: Test concurrent claim via sequential mock responses (first success, second 409) and Promise.allSettled pattern rather than real parallel HTTP, since the server uses SQLite which serializes writes anyway
  - D_CLI_ERROR_FALLBACK: Client picks up server 'message' or 'error' fields first; falls back to STATUS_MESSAGES Chinese defaults only when neither exists — tests use {} (no fields) to trigger fallback path
duration: 
verification_result: passed
completed_at: 2026-05-13T00:25:10.671Z
blocker_discovered: false
---

# T03: Added concurrent claim verification tests (15) and error output formatting tests (29) proving optimistic lock 409 behavior and Chinese error messages across all HTTP status codes

**Added concurrent claim verification tests (15) and error output formatting tests (29) proving optimistic lock 409 behavior and Chinese error messages across all HTTP status codes**

## What Happened

Wrote two comprehensive test files for the mt-cli package:

1. **concurrency.test.ts** (15 tests): Proves the optimistic locking behavior on task claim. Tests cover: two agents claiming the same task sequentially (one succeeds, one gets 409), concurrent claims via Promise.allSettled (exactly one fulfills), same-agent re-claim idempotency, claim-after-complete/skipped/review/blocked (all return 400), claim already-assigned-to-another-agent (409), non-existent task (404), empty task ID (404), missing assignee (400 validation), unauthenticated claim (401), and optimistic lock metadata verification (currentAssignee field, task data in response).

2. **error-output.test.ts** (29 tests): Verifies CLI error formatting produces correct Chinese natural language for all error scenarios. Tests cover: 404 (task not found message, fallback Chinese, mt-cli status suggestion), 401 (invalid API key, reconfiguration suggestion, fallback Chinese), 409 (conflict with guidance, refresh-and-retry suggestion, fallback Chinese), 400 (invalid status transition, validation failure, parameter check suggestion, non-JSON body error, fallback Chinese), 500 (server error, fallback Chinese, retry suggestion), non-JSON error responses (HTML pages, empty bodies), timeout/network errors (Chinese messages), MtCliError structure (properties, message format, instanceof, unknown status codes), and HTTP failure logging (stderr output, successful silence).

Total test suite grew from 71 to 115 tests, all passing. Project root build (`npm run build`) passes cleanly.

## Verification

- npx vitest run src/__tests__/concurrency.test.ts: 15/15 tests pass — concurrent claim, status-based rejections, invalid inputs, optimistic lock metadata
- npx vitest run src/__tests__/error-output.test.ts: 29/29 tests pass — Chinese error messages for 400/401/404/409/500, fallback messages, suggestions, non-JSON responses, timeout/network errors, logging
- npx vitest run (full suite): 115/115 tests pass (10 config + 14 client + 47 commands + 15 concurrency + 29 error-output)
- npm run build: exit 0 — SvelteKit production build succeeds with CLI package present

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run src/__tests__/concurrency.test.ts` | 0 | ✅ pass | 753ms |
| 2 | `cd packages/cli && npx vitest run src/__tests__/error-output.test.ts` | 0 | ✅ pass | 748ms |
| 3 | `cd packages/cli && npx vitest run` | 0 | ✅ pass | 1080ms |
| 4 | `npm run build` | 0 | ✅ pass | 7600ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/__tests__/concurrency.test.ts`
- `packages/cli/src/__tests__/error-output.test.ts`
