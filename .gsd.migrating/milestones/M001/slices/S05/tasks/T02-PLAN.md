---
estimated_steps: 41
estimated_files: 10
skills_used: []
---

# T02: All task commands with Chinese output and LLM-friendly error messages

Implement the 6 task commands the CLI provides to AI Agents: `list`, `claim`, `progress`, `complete`, `show`, and `mine`. All output is formatted Chinese text. Error messages use natural language with suggested next actions. Support both `#N` (short_id) and `TASK-{seq}` full ID formats. The `show` command resolves `#N` task references inline. Write tests for all commands using mocked HTTP responses.

## Steps

1. Implement `packages/cli/src/utils/id.ts` — parse task ID input: detect `#N` format (extract short_id number), detect `TASK-{seq}` format, return normalized form. For `#N`, resolve to full task ID via API list call filtered by milestone
2. Implement `packages/cli/src/commands/list.ts` — `mt-cli tasks list [--status <status>]`: GET `/api/tasks?milestoneId=X&status=X`, format as Chinese table with columns: #N, title, module name, status. Default status filter excludes closed tasks
3. Implement `packages/cli/src/commands/claim.ts` — `mt-cli tasks claim <taskId|#N> --agent <name>`: resolve ID, POST `/api/tasks/:id/claim` with `{assignee}`, format success as `✓ 已领取 #N「title」`. Handle 409 with Chinese guidance: `✗ 领取失败。任务 #N 已被其他 Agent 领取。请执行 'mt-cli tasks list --status todo' 查看可用任务。`
4. Implement `packages/cli/src/commands/progress.ts` — `mt-cli tasks progress <taskId|#N> [--sub-total N] [--sub-done N] [--message <msg>]`: resolve ID, POST `/api/tasks/:id/progress`, format success with progress percentage
5. Implement `packages/cli/src/commands/complete.ts` — `mt-cli tasks complete <taskId|#N> [--message <msg>] [--commit <hash>]`: resolve ID, POST `/api/tasks/:id/complete`, format success message
6. Implement `packages/cli/src/commands/show.ts` — `mt-cli tasks show <taskId|#N>`: resolve ID, GET `/api/tasks/:id`, format detailed view with divider lines, show status/progress/assignee/description. Parse `#N` references in description and display referenced task summaries inline. Handle missing references gracefully: `#N (引用的任务不存在)`
7. Implement `packages/cli/src/commands/mine.ts` — `mt-cli tasks mine --agent <name>`: GET `/api/tasks?milestoneId=X`, filter client-side by assignee, format as list with status and progress columns
8. Register all commands in `packages/cli/src/index.ts` under `tasks` subcommand group
9. Implement `packages/cli/src/utils/format.ts` — shared Chinese formatting helpers: status labels (todo→待领取, in-progress→进行中, done→已完成, etc.), progress bar, divider lines, date formatting
10. Write `packages/cli/src/__tests__/commands.test.ts` — test all 6 commands with mocked HTTP client: verify output format, error messages, ID resolution, Chinese text

## Must-Haves

- [ ] All 6 commands (list, claim, progress, complete, show, mine) produce Chinese formatted output
- [ ] `#N` short_id and `TASK-{seq}` full ID both work as input
- [ ] 409 Conflict produces Chinese error with next-step guidance
- [ ] Closed/merged task operations produce clear Chinese error messages
- [ ] `show` command resolves and displays `#N` references inline
- [ ] All commands tested with mocked HTTP responses

## Verification

- `cd packages/cli && npx vitest run` — all command tests pass
- Verify Chinese output by checking test assertions contain expected Chinese text patterns

## Inputs

- `packages/cli/src/config.ts` — config resolution module (from T01)
- `packages/cli/src/client.ts` — HTTP client (from T01)
- `packages/cli/src/index.ts` — CLI entry point (from T01)
- `src/lib/schemas/task.ts` — task schema defining API response shapes
- `src/lib/server/task-service.ts` — task service logic (read for understanding error cases)
- `src/routes/api/tasks/[id]/claim/+server.ts` — claim API route (read for error response shapes)
- `src/routes/api/tasks/[id]/progress/+server.ts` — progress API route
- `src/routes/api/tasks/[id]/complete/+server.ts` — complete API route

## Expected Output

- `packages/cli/src/utils/id.ts` — Task ID parsing and resolution
- `packages/cli/src/utils/format.ts` — Chinese formatting helpers
- `packages/cli/src/commands/list.ts` — List tasks command
- `packages/cli/src/commands/claim.ts` — Claim task command
- `packages/cli/src/commands/progress.ts` — Progress update command
- `packages/cli/src/commands/complete.ts` — Complete task command
- `packages/cli/src/commands/show.ts` — Show task detail command
- `packages/cli/src/commands/mine.ts` — My tasks command
- `packages/cli/src/__tests__/commands.test.ts` — Command tests

## Inputs

- `packages/cli/src/config.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/index.ts`
- `src/lib/schemas/task.ts`
- `src/lib/server/task-service.ts`
- `src/routes/api/tasks/[id]/claim/+server.ts`
- `src/routes/api/tasks/[id]/progress/+server.ts`
- `src/routes/api/tasks/[id]/complete/+server.ts`

## Expected Output

- `packages/cli/src/utils/id.ts`
- `packages/cli/src/utils/format.ts`
- `packages/cli/src/commands/list.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/commands/show.ts`
- `packages/cli/src/commands/mine.ts`
- `packages/cli/src/__tests__/commands.test.ts`

## Verification

cd packages/cli && npx vitest run

## Observability Impact

Each command outputs structured Chinese text to stdout. Errors go to stderr with status code. Claim 409 errors include the conflicting agent name and suggested next action.
