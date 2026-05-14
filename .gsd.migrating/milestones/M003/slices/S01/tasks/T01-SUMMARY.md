---
id: T01
parent: S01
milestone: M003
key_files:
  - packages/cli/src/utils/json-output.ts
  - packages/cli/src/__tests__/json-output.test.ts
key_decisions:
  - formatErrorCode detects timeout via '请求超时' or 'timeout' keyword in message, network errors via '无法连接' or 'fetch' keyword — matches existing client.ts error wrapping conventions
duration: 
verification_result: passed
completed_at: 2026-05-13T16:05:11.868Z
blocker_discovered: false
---

# T01: Created json-output utility module with outputJson, outputJsonError, formatErrorCode, formatErrorDetails and 29 passing unit tests

**Created json-output utility module with outputJson, outputJsonError, formatErrorCode, formatErrorDetails and 29 passing unit tests**

## What Happened

Created `packages/cli/src/utils/json-output.ts` with four exported functions:
- `outputJson(data)` — writes pretty-printed JSON + newline to stdout
- `outputJsonError(err)` — formats error as `{ error, code, details? }`, writes to stdout, exits with code 1
- `formatErrorCode(err)` — maps MtCliError to HTTP_${status}, TIMEOUT, NETWORK_ERROR, or UNKNOWN_ERROR
- `formatErrorDetails(err)` — extracts url/suggestion from MtCliError or returns undefined

Created comprehensive test suite with 29 tests covering all error types (HTTP 400/401/404/409/500, timeout, network, unknown), JSON structure validation, detail extraction, and edge cases.

## Verification

Ran `npx vitest run src/__tests__/json-output.test.ts` from packages/cli — all 29 tests passed in 13ms.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run src/__tests__/json-output.test.ts` | 0 | ✅ pass | 767ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/utils/json-output.ts`
- `packages/cli/src/__tests__/json-output.test.ts`
