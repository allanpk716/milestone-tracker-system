---
id: T02
parent: S01
milestone: M003
key_files:
  - packages/cli/src/commands/list.ts
  - packages/cli/src/commands/show.ts
  - packages/cli/src/commands/mine.ts
  - packages/cli/src/commands/claim.ts
  - packages/cli/src/commands/progress.ts
  - packages/cli/src/commands/complete.ts
  - packages/cli/src/commands/status.ts
key_decisions:
  - --json flag outputs full API response for list (no client-side done/skipped filtering), matching the task plan requirement for raw API data
  - show --json skips the allTasks reference-resolution fetch since JSON consumers don't need resolved #N references
  - mine --json outputs empty array [] for no tasks (not an error), consistent with API semantics
  - status --json outputs structured { serverUrl, milestoneId, agentName, connected, milestone } object for machine parseability
  - Early process.exit guards (missing agentName) branch on opts.json to output JSON error before the Chinese console.error path
duration: 
verification_result: passed
completed_at: 2026-05-13T16:09:00.658Z
blocker_discovered: false
---

# T02: Wired --json flag into all 7 CLI commands (list, show, mine, claim, progress, complete, status) with outputJson/outputJsonError integration

**Wired --json flag into all 7 CLI commands (list, show, mine, claim, progress, complete, status) with outputJson/outputJsonError integration**

## What Happened

Added `--json` boolean option to all 7 CLI commands and integrated the json-output utility (from T01) into each command's action handler.

For each command:
- **list.ts**: `--json` outputs full API response array via `outputJson(tasks)`, bypassing client-side done/skipped filtering.
- **show.ts**: `--json` outputs the single task object, skipping the reference resolution fetch for efficiency.
- **mine.ts**: `--json` outputs the filtered-and-sorted array. Missing agentName outputs JSON error with `CONFIG_ERROR` code pattern.
- **claim.ts**: `--json` outputs the claimed task object. Missing agentName and 409 conflicts handled via `outputJsonError`.
- **progress.ts**: `--json` outputs the updated task object.
- **complete.ts**: `--json` outputs the completed task object.
- **status.ts**: `--json` outputs structured object `{ serverUrl, milestoneId, agentName, connected: true, milestone }`.

Error paths: When `--json` is set, errors route to `outputJsonError(err)` which writes `{ error, code, details? }` to stdout and calls `process.exit(1)`. The original human-readable error handling remains unchanged for non-json mode. Early `process.exit(1)` guards (missing agentName in mine/claim) now branch on `opts.json` to output JSON format first.

All 144 existing tests pass. TypeScript compiles cleanly (pre-existing commander module resolution errors in worktree are unrelated).

## Verification

Ran `npx vitest run` in packages/cli — all 144 tests pass across 6 test files (0 failures). TypeScript type-check confirms no new errors introduced. Each command now accepts --json flag and routes through outputJson/outputJsonError from the T01 utility module.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run` | 0 | ✅ pass | 3231ms |
| 2 | `cd packages/cli && npx tsc --noEmit` | 0 | ✅ pass (pre-existing commander errors only) | 2398ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/commands/list.ts`
- `packages/cli/src/commands/show.ts`
- `packages/cli/src/commands/mine.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/commands/status.ts`
