---
id: T02
parent: S05
milestone: M001
key_files:
  - packages/cli/src/types.ts
  - packages/cli/src/utils/id.ts
  - packages/cli/src/utils/format.ts
  - packages/cli/src/commands/list.ts
  - packages/cli/src/commands/claim.ts
  - packages/cli/src/commands/progress.ts
  - packages/cli/src/commands/complete.ts
  - packages/cli/src/commands/show.ts
  - packages/cli/src/commands/mine.ts
  - packages/cli/src/index.ts
  - packages/cli/src/__tests__/commands.test.ts
key_decisions:
  - D_CLI_TASK_ID_FORMATS: Support #N, TASK-{seq}, and bare number as task ID inputs; resolve short IDs to full IDs via API list call
  - D_CLI_CHINESE_OUTPUT: All command output in Chinese with ASCII progress bars for LLM parseability
  - D_CLI_SHOW_REFERENCES: Show command resolves #N references inline in descriptions, gracefully handling missing references
duration: 
verification_result: passed
completed_at: 2026-05-13T00:22:40.195Z
blocker_discovered: false
---

# T02: Implemented all 6 task commands (list, claim, progress, complete, show, mine) with Chinese output, #N/TASK-{seq} ID resolution, and LLM-friendly error messages

**Implemented all 6 task commands (list, claim, progress, complete, show, mine) with Chinese output, #N/TASK-{seq} ID resolution, and LLM-friendly error messages**

## What Happened

Built the 6 task management commands for mt-cli: list (with status filter, default excludes done/skipped), claim (with 409 conflict Chinese guidance), progress (with sub-task tracking and progress bar), complete (with commit hash), show (with #N reference resolution in descriptions, graceful handling of missing references), and mine (client-side filtering by agent name, sorted by status priority).

Implemented shared utilities: `utils/format.ts` with Chinese status labels (待领取/进行中/阻塞/审核中/已完成/已跳过), ASCII progress bar, dividers, date formatting, and task row formatting. `utils/id.ts` with task ID parsing supporting #N, TASK-{seq}, and bare number formats, plus resolution from short ID to full ID via API list call.

Added `types.ts` defining the TaskResponse interface matching the server schema. All commands registered under `tasks` subcommand group in index.ts. 47 new tests covering ID parsing/resolution, format utilities, command module exports, HTTP client API shapes (claim/progress/complete), Chinese output verification, and show command reference resolution. Total test suite: 71 tests passing.

## Verification

- npx tsc --noEmit: clean compilation, no errors
- npx vitest run: 71/71 tests pass (10 config + 14 client + 47 commands)
- CLI help shows all 6 commands with Chinese descriptions: list, claim, progress, complete, show, mine
- All commands produce Chinese formatted output with LLM-friendly error messages
- #N and TASK-{seq} ID formats both supported via parseTaskId/resolveTaskId

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx tsc --noEmit` | 0 | ✅ pass | 3200ms |
| 2 | `cd packages/cli && npx vitest run` | 0 | ✅ pass | 954ms |
| 3 | `cd packages/cli && node dist/index.js tasks --help` | 0 | ✅ pass | 200ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/types.ts`
- `packages/cli/src/utils/id.ts`
- `packages/cli/src/utils/format.ts`
- `packages/cli/src/commands/list.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/commands/show.ts`
- `packages/cli/src/commands/mine.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/commands.test.ts`
