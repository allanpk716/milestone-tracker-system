---
estimated_steps: 55
estimated_files: 5
skills_used: []
---

# T02: CLI block/unblock commands with --json + integration tests

Create `mt-cli tasks block` and `mt-cli tasks unblock` CLI commands following the established Commander.js pattern from claim/progress commands. Both commands support `--json` flag using outputJson/outputJsonError. Update TaskResponse type to include blockedReason. Write integration tests covering success, error, and --json paths.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| MtClient HTTP | MtCliError with status code | MtCliError(0, timeout) | MtCliError(0, non-JSON) |
| process.exit(1) | outputJsonError exits process | N/A | N/A |

## Negative Tests

- **Malformed inputs**: block without --reason flag, invalid task ID format
- **Error paths**: block non-existent task (HTTP_404), block already blocked task (HTTP_400), unblock non-blocked task (HTTP_400)
- **Boundary conditions**: --reason with maximum length, --reason with special/unicode characters, task ID formats (#N, TASK-N, bare N)

## Steps

1. Add `blockedReason: string | null` to `TaskResponse` interface in `packages/cli/src/types.ts`
2. Create `packages/cli/src/commands/block.ts` following claim.ts pattern: register `block <taskId>` subcommand with `--reason <text>` (required) and `--json` options, use parseTaskId/resolveTaskId for ID resolution, POST to `/api/tasks/{id}/block` with `{ reason }`, handle success (human: `✓ 已阻塞 #N「title」 原因: reason`; json: outputJson) and errors
3. Create `packages/cli/src/commands/unblock.ts` following same pattern: `unblock <taskId>` with optional `--message <text>` and `--json`, POST to `/api/tasks/{id}/unblock` with `{ message? }`, handle success (human: `✓ 已解除阻塞 #N「title」`; json: outputJson) and errors
4. Register both commands in `packages/cli/src/index.ts`: import and call `registerBlockCommand(tasks, getConfig)` and `registerUnblockCommand(tasks, getConfig)` after existing registrations
5. Create `packages/cli/src/__tests__/block-unblock.test.ts` following json-commands.test.ts pattern: mock globalThis.fetch, create Commander program per test, spy on process.stdout.write, stub process.exit. Test cases:
   - block success with --json: verify valid JSON output with blockedReason
   - block success without --json: verify human-readable output
   - block error (invalid_status) with --json: verify { error, code: "HTTP_400" } output
   - block error (not_found) with --json: verify { error, code: "HTTP_404" } output
   - block without --reason: verify error
   - unblock success with --json: verify status back to in-progress, blockedReason null
   - unblock success without --json: verify human-readable output
   - unblock with --message: verify message passed to API
   - unblock error with --json: verify error JSON

## Must-Haves

- [ ] block.ts command with --reason (required) and --json flags
- [ ] unblock.ts command with --message (optional) and --json flags
- [ ] Both commands registered in index.ts
- [ ] TaskResponse type updated with blockedReason
- [ ] Integration tests cover success, error, and --json paths for both commands

## Verification

- `npx vitest run packages/cli/src/__tests__/block-unblock.test.ts` — all tests pass
- `grep -c "registerBlockCommand\|registerUnblockCommand" packages/cli/src/index.ts` returns 2
- `test -f packages/cli/src/commands/block.ts && test -f packages/cli/src/commands/unblock.ts`

## Inputs

- `packages/cli/src/types.ts` — existing TaskResponse type to add blockedReason
- `packages/cli/src/commands/claim.ts` — command pattern reference
- `packages/cli/src/commands/progress.ts` — command pattern reference
- `packages/cli/src/index.ts` — CLI entry point to register new commands
- `packages/cli/src/utils/json-output.ts` — outputJson/outputJsonError utilities
- `packages/cli/src/utils/id.ts` — parseTaskId/resolveTaskId utilities
- `packages/cli/src/client.ts` — MtClient HTTP client
- `packages/cli/src/__tests__/json-commands.test.ts` — test pattern reference
- `src/lib/schemas/task.ts` — T01 produces updated Zod schemas (blockTaskSchema, unblockTaskSchema)
- `src/routes/api/tasks/[id]/block/+server.ts` — T01 produces new API route
- `src/routes/api/tasks/[id]/unblock/+server.ts` — T01 produces new API route

## Expected Output

- `packages/cli/src/types.ts` — modified: added blockedReason to TaskResponse
- `packages/cli/src/commands/block.ts` — new: block CLI command
- `packages/cli/src/commands/unblock.ts` — new: unblock CLI command
- `packages/cli/src/index.ts` — modified: registered block and unblock commands
- `packages/cli/src/__tests__/block-unblock.test.ts` — new: integration tests for block/unblock commands

## Observability Impact

Signals added: blockedReason visible in `--json` output for blocked tasks. Error codes HTTP_400 (invalid_status) and HTTP_404 (not_found) provide machine-readable failure classification for automated retry logic.

## Inputs

- `packages/cli/src/types.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/utils/json-output.ts`
- `packages/cli/src/utils/id.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/__tests__/json-commands.test.ts`
- `src/lib/schemas/task.ts`
- `src/routes/api/tasks/[id]/block/+server.ts`
- `src/routes/api/tasks/[id]/unblock/+server.ts`

## Expected Output

- `packages/cli/src/types.ts`
- `packages/cli/src/commands/block.ts`
- `packages/cli/src/commands/unblock.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/block-unblock.test.ts`

## Verification

npx vitest run packages/cli/src/__tests__/block-unblock.test.ts && grep -c "registerBlockCommand\|registerUnblockCommand" packages/cli/src/index.ts
