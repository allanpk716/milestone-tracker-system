# S01: --json 结构化输出 — UAT

**Milestone:** M003
**Written:** 2026-05-13T16:15:54.888Z

# UAT: S01 — --json 结构化输出

## UAT Type
Contract verification (unit + integration tests, no running server required)

## Preconditions
- Working directory: `packages/cli`
- Dependencies installed (`npm install` completed)
- No running server needed (tests mock MtClient)

## Test Cases

### TC-01: All commands accept --json flag
**Steps:**
1. Run `npx vitest run src/__tests__/json-commands.test.ts`
**Expected:** All 35 tests pass, confirming each command (list, show, mine, claim, progress, complete, status) accepts and processes the --json flag.

### TC-02: Success path outputs valid, parseable JSON
**Steps:**
1. For each command, test with --json flag and mocked successful API response
2. Verify output is valid JSON via `JSON.parse()`
3. Verify output matches the raw API response structure
**Expected:** Each command outputs the exact API response as valid JSON to stdout.

### TC-03: Error path outputs structured error JSON
**Steps:**
1. For each command, test with --json flag and mocked error (404, timeout, network)
2. Verify output has `{ error: string, code: string }` structure
3. Verify error codes follow convention: HTTP_{status}, TIMEOUT, NETWORK_ERROR
**Expected:** Each error outputs parseable JSON with machine-readable code field, exit code 1.

### TC-04: JSON output utility unit tests
**Steps:**
1. Run `npx vitest run src/__tests__/json-output.test.ts`
**Expected:** All 29 utility tests pass covering outputJson, outputJsonError, formatErrorCode, formatErrorDetails.

### TC-05: Full suite regression
**Steps:**
1. Run `npx vitest run` in packages/cli
**Expected:** 179 tests pass across 7 test files, 0 failures.

### TC-06: Human-readable output unchanged
**Steps:**
1. Run commands without --json flag
2. Verify output remains Chinese human-readable text (not JSON)
**Expected:** No regression in default output format.

## Edge Cases Covered
- Empty task list returns `[]` (not error) for `mine --json`
- HTTP errors (404, 409) map to HTTP_404, HTTP_409 codes
- Timeout errors detected via keyword matching in error message
- Network errors detected via '无法连接' or 'fetch' keywords
- Multi-write stdout scenarios handled by JSON extraction regex

## Not Proven By This UAT
- Behavior against a live running server (covered by future S04 E2E tests)
- `block`/`unblock` commands (S02 scope)
- `complete --evidence` / `modules` commands (S03 scope)
- GSD2 extension integration (S05 scope)

