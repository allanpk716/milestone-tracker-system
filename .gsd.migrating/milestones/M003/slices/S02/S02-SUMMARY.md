---
id: S02
parent: M003
milestone: M003
provides:
  - ["POST /api/tasks/[id]/block and /unblock API endpoints", "blockTask/unblockTask service functions with status guards", "CLI mt-cli tasks block/unblock commands with --json support", "blockedReason DB column and Zod validation schemas", "74 passing tests (62 server + 12 CLI integration)"]
requires:
  - slice: S01
    provides: outputJson/outputJsonError utility functions for --json output, parseTaskId/resolveTaskId CLI helpers
affects:
  - ["S04"]
key_files:
  - ["src/lib/db/schema.ts", "src/lib/schemas/task.ts", "src/lib/server/task-service.ts", "src/routes/api/tasks/[id]/block/+server.ts", "src/routes/api/tasks/[id]/unblock/+server.ts", "packages/cli/src/commands/block.ts", "packages/cli/src/commands/unblock.ts"]
key_decisions:
  - ["Block uses requiredOption for --reason (mandatory field); unblock uses optional --message", "Status guard pattern: block requires in-progress → blocked, unblock requires blocked → in-progress", "blockedReason stored as plain TEXT column (not JSON) since it's a single string value"]
patterns_established:
  - ["blockTask/unblockTask follow same status-guard pattern as claimTask/progressTask/completeTask", "CLI block/unblock follow same Commander.js pattern as claim/progress with parseTaskId + outputJson/outputJsonError", "blockedReason column pattern for storing structured blocking context on tasks"]
observability_surfaces:
  - ["block/unblock API return updated task with blockedReason field", "409 invalid_status error includes currentStatus in details for debugging", "CLI --json output includes full task state after transition"]
drill_down_paths:
  - [".gsd/milestones/M003/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M003/slices/S02/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-13T16:39:27.623Z
blocker_discovered: false
---

# S02: block/unblock API + CLI

**Added block/unblock task status lifecycle: 2 API endpoints, 2 service functions with status guards, DB schema column, Zod validation, CLI commands with --json, and 74 passing tests**

## What Happened

## What Happened

### T01: Server-side block/unblock (schema + service + routes + tests)
Added `blockedReason` TEXT column to the tasks DB schema and a Zod `blockInputSchema` with required `reason` field. Created `blockTask()` and `unblockTask()` service functions in task-service with status guards (block requires `in-progress`, unblock requires `blocked`). Added two API route handlers: `POST /api/tasks/[id]/block` and `POST /api/tasks/[id]/unblock`. Updated `formatTaskResponse` and `taskResponseSchema` to include `blockedReason`. Comprehensive unit tests cover success paths, not_found (404), invalid_status (409), and missing fields (400) — 62 tests all passing.

### T02: CLI block/unblock commands with --json + integration tests
Created `mt-cli tasks block <id> --reason "xxx" [--json]` and `mt-cli tasks unblock <id> [--message "xxx"] [--json]` following the established Commander.js pattern from claim/progress commands. Block uses `requiredOption` for `--reason` (mandatory); unblock uses optional `--message`. Both use `parseTaskId/resolveTaskId` and `outputJson/outputJsonError` from S01. Updated `TaskResponse` type to include `blockedReason`. Registered commands in CLI index. 12 integration tests covering success, error, and --json paths — all passing.

## Verification

All verification checks passed:

**File existence (all 11 files confirmed):**
- `src/routes/api/tasks/[id]/block/+server.ts` ✓
- `src/routes/api/tasks/[id]/unblock/+server.ts` ✓
- `src/lib/db/schema.ts` (contains `blockedReason`) ✓
- `src/lib/schemas/task.ts`, `src/lib/schemas/index.ts` ✓
- `src/lib/server/task-service.ts` (4 occurrences of blockTask/unblockTask) ✓
- `src/lib/server/task-service.test.ts` ✓
- `packages/cli/src/commands/block.ts`, `unblock.ts` ✓
- `packages/cli/src/__tests__/block-unblock.test.ts` ✓
- `packages/cli/src/index.ts` (4 occurrences of registerBlockCommand/registerUnblockCommand) ✓
- `packages/cli/src/types.ts` ✓

**Test results:**
- Server-side tests: 62 passed (0 failed)
- CLI integration tests: 12 passed (0 failed)
- Total: 74 tests passing

## Requirements Advanced

- R009 — Fully implemented: block/unblock API endpoints, CLI commands, service functions with status guards, and 74 passing tests
- R008 — Both block and unblock CLI commands support --json flag with valid JSON output on success and error paths

## Requirements Validated

- R009 — 74 automated tests cover block/unblock API and CLI: success paths, 404 not_found, 409 invalid_status, 400 validation, --json output

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

- `src/lib/db/schema.ts` — Added blockedReason TEXT column to tasks table
- `src/lib/schemas/task.ts` — Added blockInputSchema and unblockInputSchema Zod validation, updated taskResponseSchema with blockedReason
- `src/lib/schemas/index.ts` — Re-exported new block/unblock schemas
- `src/lib/server/task-service.ts` — Added blockTask() and unblockTask() service functions with status guards
- `src/lib/server/task-service.test.ts` — Added comprehensive tests for block/unblock (success, not_found, invalid_status, validation)
- `src/routes/api/tasks/[id]/block/+server.ts` — POST handler for blocking a task
- `src/routes/api/tasks/[id]/unblock/+server.ts` — POST handler for unblocking a task
- `packages/cli/src/types.ts` — Added blockedReason to TaskResponse type
- `packages/cli/src/commands/block.ts` — CLI block command with --reason (required) and --json flags
- `packages/cli/src/commands/unblock.ts` — CLI unblock command with --message (optional) and --json flags
- `packages/cli/src/index.ts` — Registered block and unblock commands in CLI program
- `packages/cli/src/__tests__/block-unblock.test.ts` — 12 integration tests for block/unblock CLI commands
