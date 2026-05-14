---
id: T03
parent: S01
milestone: M003
key_files:
  - packages/cli/src/__tests__/json-commands.test.ts
key_decisions:
  - Used Commander program creation per test (not program.parseAsync on shared instance) to isolate test state; captured stdout via process.stdout.write spy rather than console.log spy since outputJson writes directly to process.stdout
  - Used regex-based JSON extraction (match first {…} block) for parseLastJsonLine to handle multi-write stdout scenarios where Commander or other output may interleave
duration: 
verification_result: passed
completed_at: 2026-05-13T16:13:57.118Z
blocker_discovered: false
---

# T03: Created 35 integration tests covering --json output for all 7 CLI commands (list, show, mine, claim, progress, complete, status) with success and error paths

**Created 35 integration tests covering --json output for all 7 CLI commands (list, show, mine, claim, progress, complete, status) with success and error paths**

## What Happened

Created `packages/cli/src/__tests__/json-commands.test.ts` with 35 tests organized by command and cross-cutting concerns.

Test architecture: Each test creates a Commander program, registers the target command with a mock config, mocks `globalThis.fetch` to return controlled API responses, spies on `process.stdout.write` to capture JSON output, and stubs `process.exit` to prevent test runner termination.

Coverage by command:
- **list --json** (5 tests): success with tasks, empty array, HTTP 401/500 errors, no done/skipped filtering in JSON mode
- **show --json** (4 tests): success with all fields, HTTP 404 error, unknown short ID error, full ID skips list fetch
- **mine --json** (5 tests): filtered by agent, empty result, missing agentName, sort order, --agent flag override
- **claim --json** (4 tests): success claim, HTTP 409 conflict, HTTP 404 not found, missing agentName
- **progress --json** (3 tests): sub-task progress update, message-only update, HTTP 400 error
- **complete --json** (3 tests): success complete, commitHash in output, HTTP 400 wrong status
- **status --json** (4 tests): connected with milestone, null agentName, HTTP 500 error, timeout

Cross-cutting tests (7 tests): all errors have {error, code} structure, HTTP_{status} format, TIMEOUT code, NETWORK_ERROR code, details field for MtCliError, non-JSON API responses, all success outputs are valid JSON.

All 179 tests pass (144 existing + 35 new), zero regressions.

## Verification

Ran `cd packages/cli && npx vitest run` — all 179 tests pass across 7 test files (0 failures). The 35 new json-commands tests exercise all 7 commands with --json flag in both success and error paths, verify error code format conventions (HTTP_{status}, TIMEOUT, NETWORK_ERROR), and validate the {error, code, details?} error JSON structure.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run` | 0 | ✅ pass | 1360ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/__tests__/json-commands.test.ts`
