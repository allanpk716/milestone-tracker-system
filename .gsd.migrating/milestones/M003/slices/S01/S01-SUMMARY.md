---
id: S01
parent: M003
milestone: M003
provides:
  - ["--json flag on all 7 CLI commands (list, show, mine, claim, progress, complete, status)", "outputJson/outputJsonError utility module in json-output.ts", "Error code convention: HTTP_{status}, TIMEOUT, NETWORK_ERROR, CONFIG_ERROR", "JSON error format: { error, code, details? }"]
requires:
  []
affects:
  - ["S02", "S03"]
key_files:
  - ["packages/cli/src/utils/json-output.ts", "packages/cli/src/__tests__/json-output.test.ts", "packages/cli/src/__tests__/json-commands.test.ts", "packages/cli/src/commands/list.ts", "packages/cli/src/commands/show.ts", "packages/cli/src/commands/mine.ts", "packages/cli/src/commands/claim.ts", "packages/cli/src/commands/progress.ts", "packages/cli/src/commands/complete.ts", "packages/cli/src/commands/status.ts"]
key_decisions:
  - ["formatErrorCode uses keyword matching (请求超时/timeout → TIMEOUT, 无法连接/fetch → NETWORK_ERROR) matching existing client.ts error wrapping conventions", "list --json outputs full API array without done/skipped filtering for raw API data", "show --json skips allTasks reference-resolution since JSON consumers don't need resolved #N references", "mine --json outputs empty array [] for no tasks, not an error", "status --json outputs structured { serverUrl, milestoneId, agentName, connected, milestone } object"]
patterns_established:
  - ["outputJson/outputJsonError utility pattern for all CLI command JSON output", "Error code convention: HTTP_{status}, TIMEOUT, NETWORK_ERROR, CONFIG_ERROR", "Direct process.stdout.write for JSON output (not console.log) to ensure clean piping"]
observability_surfaces:
  - ["JSON error output includes machine-readable 'code' field for automated error classification; future agents can parse code to decide retry/backoff strategy"]
drill_down_paths:
  - [".gsd/milestones/M003/slices/S01/tasks/T01-SUMMARY.md", ".gsd/milestones/M003/slices/S01/tasks/T02-SUMMARY.md", ".gsd/milestones/M003/slices/S01/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-13T16:15:54.888Z
blocker_discovered: false
---

# S01: --json 结构化输出

**Added --json flag to all 7 CLI commands (list, show, mine, claim, progress, complete, status) with consistent JSON output for success and error paths, plus 179 passing tests.**

## What Happened

## What was built

Created a shared JSON output utility module (`packages/cli/src/utils/json-output.ts`) providing `outputJson()`, `outputJsonError()`, `formatErrorCode()`, and `formatErrorDetails()` functions. This utility was wired into all 7 CLI commands as a `--json` boolean flag.

### Task-by-task breakdown

**T01 — JSON output utility module:** Created `json-output.ts` with four exported functions and 29 unit tests. Key design: `formatErrorCode()` maps MtClient errors to machine-readable codes (HTTP_{status}, TIMEOUT, NETWORK_ERROR, CONFIG_ERROR) using keyword matching on error messages. `formatErrorDetails()` extracts structured detail from MtCliError instances (status, message, suggestion, url). Both `outputJson` and `outputJsonError` write directly to `process.stdout` for clean piping.

**T02 — Wire --json into all 7 commands:** Added `--json` option to list, show, mine, claim, progress, complete, and status commands. Each command's action handler now branches on `opts.json`: success path calls `outputJson(data)`, error path calls `outputJsonError(error, formatErrorCode(error))`. Key decisions: list --json outputs full API response array (no client-side filtering); show --json skips the reference-resolution fetch; mine --json outputs empty array for no tasks; status --json outputs structured connectivity object. Total test count went from ~105 to 144.

**T03 — Comprehensive --json integration tests:** Created 35 integration-style tests in `json-commands.test.ts` exercising all 7 commands in both success and error paths. Tests verify: valid JSON parseability, correct error code conventions (HTTP_404, TIMEOUT, NETWORK_ERROR), {error, code, details?} error structure, and command-specific output shape. Used Commander program creation per test for state isolation and process.stdout.write spy for output capture. Final count: 179 tests passing across 7 test files.

## Key decisions
- Error codes: HTTP errors → `HTTP_{status}`, timeout → `TIMEOUT`, network → `NETWORK_ERROR`, config → `CONFIG_ERROR`
- `list --json` outputs raw API array (no done/skipped filtering) per plan requirement
- `show --json` skips allTasks reference-resolution fetch since JSON consumers don't need resolved #N references
- `mine --json` outputs `[]` for no tasks (not an error), consistent with API semantics
- `status --json` outputs structured `{ serverUrl, milestoneId, agentName, connected, milestone }` object

## Verification
All 179 tests pass across 7 test files (0 failures). TypeScript type-check clean.

## Verification

Ran `npx vitest run` in packages/cli — 179 tests pass across 7 test files (0 failures, 0 errors). Verified all 10 key files exist on disk. Error code conventions validated by dedicated test assertions in json-commands.test.ts.

## Requirements Advanced

- R008 — All 7 existing CLI commands now support --json flag with consistent output format. Success outputs raw API JSON, errors output {error, code, details?} structure.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `packages/cli/src/utils/json-output.ts` — New: JSON output utility with outputJson, outputJsonError, formatErrorCode, formatErrorDetails
- `packages/cli/src/__tests__/json-output.test.ts` — New: 29 unit tests for JSON output utility
- `packages/cli/src/__tests__/json-commands.test.ts` — New: 35 integration tests for --json flag on all 7 commands
- `packages/cli/src/commands/list.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
- `packages/cli/src/commands/show.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
- `packages/cli/src/commands/mine.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
- `packages/cli/src/commands/claim.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
- `packages/cli/src/commands/progress.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
- `packages/cli/src/commands/complete.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
- `packages/cli/src/commands/status.ts` — Modified: Added --json flag and outputJson/outputJsonError integration
