---
estimated_steps: 56
estimated_files: 1
skills_used: []
---

# T03: Write comprehensive --json output tests for all commands

Write integration-style tests that exercise --json output for all 7 commands, covering both success and error paths.

## Steps

1. Create `packages/cli/src/__tests__/json-commands.test.ts`
2. **Test setup pattern**: For each command, mock `globalThis.fetch` to return controlled API responses, import the command module, create a Commander program, register the command, and execute with `--json` flag. Capture stdout via spy on `console.log`.
3. **list --json tests**:
   - Success with tasks: verify JSON array output, contains all tasks (not filtered)
   - Success with empty tasks: verify `[]`
   - Error 401: verify `{ error, code: 'HTTP_401' }` format
   - Error 500: verify `{ error, code: 'HTTP_500' }` format
4. **show --json tests**:
   - Success: verify single task JSON with all fields
   - Error 404: verify error JSON
5. **mine --json tests**:
   - Success with tasks: verify filtered array (only tasks matching agentName)
   - Success with no matching tasks: verify `[]`
   - Missing agentName error: verify `{ error, code: 'CONFIG_ERROR' }`
6. **claim --json tests**:
   - Success: verify claimed task JSON
   - Error 409 (already claimed): verify error JSON with `HTTP_409` code
   - Error 404: verify error JSON
   - Missing agentName: verify CONFIG_ERROR code
7. **progress --json tests**:
   - Success with sub-tasks: verify updated task JSON
   - Success with message only: verify JSON output
   - Error 400 (invalid status): verify error JSON
8. **complete --json tests**:
   - Success: verify completed task JSON
   - Success with commit: verify commitHash in output
   - Error 400 (wrong status): verify error JSON
9. **status --json tests**:
   - Success (connected): verify `{ connected: true, serverUrl, milestoneId, agentName, milestone }`
   - Error (connection failed): verify `{ connected: false, ... }` with error details
10. **Cross-cutting tests**:
   - All error outputs have `{ error: string, code: string }` structure
   - All success outputs are valid JSON (JSON.parse succeeds)
   - Error code format matches convention: `HTTP_${status}`, `TIMEOUT`, `NETWORK_ERROR`, `CONFIG_ERROR`
   - Timeout produces `{ error: '...', code: 'TIMEOUT' }`
   - Network error produces `{ error: '...', code: 'NETWORK_ERROR' }`

## Important note on testing approach

Since Commander.js programs call process.exit, tests should use the lower-level approach: mock fetch, import command registration functions, create a test program, and call the action handler directly or use program.parseAsync with exit hijacked. Alternatively, test the command action functions by extracting the core logic. The simplest approach that works with the existing test patterns (see commands.test.ts) is to mock fetch and test the output by capturing console.log/console.error calls.

A practical approach: for each command test, create a fresh Commander instance, register the command, use `program.exitOverride()` to catch process.exit calls, and capture console output.

## Must-Haves
- [ ] Tests cover all 7 commands with --json success path
- [ ] Tests cover error paths (HTTP errors, timeout, network, config errors)
- [ ] Error JSON format matches spec: { error, code, details? }
- [ ] All existing tests still pass (no regressions)

## Verification
- `cd packages/cli && npx vitest run` — all tests pass

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| MtClient.fetch | MtCliError with HTTP status | MtCliError with status 0 | MtCliError with non-JSON message |

## Negative Tests

- **Malformed inputs**: Invalid JSON from API (HTML error pages)
- **Error paths**: HTTP 400/401/404/409/500, timeout (AbortError), network failure (TypeError)
- **Boundary conditions**: Empty task list, missing agentName, task not found

## Inputs

- `packages/cli/src/utils/json-output.ts`
- `packages/cli/src/commands/list.ts`
- `packages/cli/src/commands/show.ts`
- `packages/cli/src/commands/mine.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/types.ts`

## Expected Output

- `packages/cli/src/__tests__/json-commands.test.ts`

## Verification

cd packages/cli && npx vitest run
