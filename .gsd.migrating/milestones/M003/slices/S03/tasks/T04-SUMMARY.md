---
id: T04
parent: S03
milestone: M003
key_files:
  - packages/cli/src/commands/modules-list.ts
  - packages/cli/src/commands/modules-show.ts
  - packages/cli/src/index.ts
  - packages/cli/src/__tests__/modules-commands.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-05-13T16:51:50.892Z
blocker_discovered: false
---

# T04: Added modules list and show CLI commands with --json support

**Added modules list and show CLI commands with --json support**

## What Happened

Created two new CLI command files: `modules-list.ts` (calls GET /api/milestones/{milestoneId}/modules, lists all modules for the configured milestone) and `modules-show.ts` (calls GET /api/modules/{id}, shows details for a specific module). Both commands support --json flag using the existing outputJson/outputJsonError utilities from S01. Registered a new 'modules' command group in index.ts with 'list' and 'show' subcommands. Wrote 12 integration tests covering success, error (401, 404, 500), --json output format, and human-readable exit behavior. All 209 CLI tests pass.

## Verification

Ran vitest for CLI package: 209 tests pass across 9 test files including 12 new modules-commands tests. Tests cover: list --json (array output, empty array, HTTP 401/500 errors), show --json (single module output, HTTP 404/401 errors, details field), and human-readable exit codes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/modules-commands.test.ts (from packages/cli/)` | 0 | ✅ pass | 772ms |
| 2 | `npx vitest run (full CLI suite, 209 tests)` | 0 | ✅ pass | 1430ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/commands/modules-list.ts`
- `packages/cli/src/commands/modules-show.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/modules-commands.test.ts`
