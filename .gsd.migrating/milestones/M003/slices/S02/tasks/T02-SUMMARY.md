---
id: T02
parent: S02
milestone: M003
key_files:
  - packages/cli/src/types.ts
  - packages/cli/src/commands/block.ts
  - packages/cli/src/commands/unblock.ts
  - packages/cli/src/index.ts
  - packages/cli/src/__tests__/block-unblock.test.ts
key_decisions:
  - block uses requiredOption for --reason (mandatory); unblock uses optional --message; both follow claim/progress pattern with parseTaskId/resolveTaskId and outputJson/outputJsonError
duration: 
verification_result: passed
completed_at: 2026-05-13T16:32:13.177Z
blocker_discovered: false
---

# T02: Added CLI block/unblock commands with --json support and 12 integration tests

**Added CLI block/unblock commands with --json support and 12 integration tests**

## What Happened

Created `mt-cli tasks block <id> --reason <text>` and `mt-cli tasks unblock <id> [--message <text>]` CLI commands following the established Commander.js pattern from claim/progress. Both commands support `--json` flag using outputJson/outputJsonError. Updated TaskResponse type with `blockedReason: string | null` field. Registered both commands in index.ts. Wrote 12 integration tests covering success (JSON + human), error paths (HTTP_400 invalid_status, HTTP_404 not_found), Commander validation (missing --reason), unicode input, and message passthrough for unblock.

## Verification

All 191 CLI tests pass (12 new + 179 existing). Registration count verified: 4 occurrences of registerBlockCommand/registerUnblockCommand in index.ts (2 imports + 2 calls). block.ts and unblock.ts exist. TaskResponse includes blockedReason field.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run packages/cli/src/__tests__/block-unblock.test.ts` | 0 | ✅ pass | 784ms |
| 2 | `npx vitest run (full CLI suite - 191 tests)` | 0 | ✅ pass | 1330ms |
| 3 | `node -e check registration count` | 0 | ✅ pass | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/types.ts`
- `packages/cli/src/commands/block.ts`
- `packages/cli/src/commands/unblock.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/block-unblock.test.ts`
