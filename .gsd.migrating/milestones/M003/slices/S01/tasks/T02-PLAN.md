---
estimated_steps: 41
estimated_files: 7
skills_used: []
---

# T02: Wire --json flag into all 7 CLI commands

Add `--json` boolean option to all 7 CLI commands and wire the json-output utility into each command's action handler.

## Steps

1. **list.ts**: Add `.option('--json', '以 JSON 格式输出')`. In action, when `opts.json`:
   - Success: `outputJson(tasks)` — output the FULL API response array (no client-side filtering of done/skipped)
   - Error: `outputJsonError(err)`
   - Early return after outputJson to prevent human-readable output
2. **show.ts**: Add `.option('--json', '以 JSON 格式输出')`. When `opts.json`:
   - Success: `outputJson(task)` — output the single task object from API
   - Error: `outputJsonError(err)`
3. **mine.ts**: Add `.option('--json', '以 JSON 格式输出')`. When `opts.json`:
   - Success: `outputJson(myTasks)` — output the filtered (by agentName) and sorted array
   - Empty: `outputJson([])` — empty array, not an error
   - Error: `outputJsonError(err)`
4. **claim.ts**: Add `.option('--json', '以 JSON 格式输出')`. When `opts.json`:
   - Success: `outputJson(result)` — output the claimed task from API
   - Error: `outputJsonError(err)` — handles 409 conflict, missing agentName, etc.
   - Missing agentName: `outputJsonError` with message and code `CONFIG_ERROR`
5. **progress.ts**: Add `.option('--json', '以 JSON 格式输出')`. When `opts.json`:
   - Success: `outputJson(result)` — output the updated task
   - Error: `outputJsonError(err)`
6. **complete.ts**: Add `.option('--json', '以 JSON 格式输出')`. When `opts.json`:
   - Success: `outputJson(result)` — output the completed task
   - Error: `outputJsonError(err)`
7. **status.ts**: Add `.option('--json', '以 JSON 格式输出')`. When `opts.json`:
   - Success: `outputJson({ serverUrl, milestoneId, agentName, connected: true, milestone })` — structured status object
   - Error: `outputJsonError(err)` — with `connected: false` context if connection fails
8. For commands that have early `process.exit(1)` before API call (missing agentName in claim/mine), wrap those in `if (opts.json)` to output JSON error format instead of Chinese console.error.

## Important Constraints
- Do NOT change default (non---json) output behavior at all
- `--json` errors go to stdout (not stderr) so `2>&1` piping works for agents
- All commands must return after `outputJson`/`outputJsonError` to avoid double output
- `outputJsonError` calls `process.exit(1)` internally, so code after it is unreachable

## Must-Haves
- [ ] All 7 commands accept --json flag
- [ ] --json success outputs raw API data as JSON
- [ ] --json error outputs { error, code, details? } format
- [ ] Non---json output is completely unchanged

## Verification
- `cd packages/cli && npx vitest run` — existing tests must still pass

## Observability Impact

None — this task wires existing utilities into commands without changing observability.

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

- `packages/cli/src/commands/list.ts`
- `packages/cli/src/commands/show.ts`
- `packages/cli/src/commands/mine.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/commands/status.ts`

## Verification

cd packages/cli && npx vitest run
