# S05: CLI 工具与并发验证

**Goal:** Build the mt-cli command-line tool for AI Agents to interact with the Milestone Tracker system. CLI supports all task commands (list, claim, progress, complete, show, mine, status), reads project-level config from `.mt-cli.json`, authenticates via Bearer token, and outputs all text in Chinese with LLM-friendly error guidance. Concurrent claim verification proves the optimistic lock returns 409 on conflict.
**Demo:** mt-cli 全命令可用：list/claim/progress/complete/show/mine/status。配置随项目走。claim 并发测试通过（两 Agent 抢同一任务，一个 409）。所有输出中文，错误提示对 Agent 友好

## Must-Haves

- 1. `mt-cli tasks list --status todo` returns formatted task list in Chinese
- 2. `mt-cli tasks claim #42 --agent test-agent` claims a task and shows Chinese success message
- 3. `mt-cli tasks show #42` displays task details with resolved references
- 4. `mt-cli tasks mine --agent test-agent` lists only tasks assigned to that agent
- 5. `mt-cli status` confirms server connectivity and active milestone
- 6. Two concurrent claims on the same task: one succeeds, one receives 409 with Chinese guidance message
- 7. All CLI errors output natural-language Chinese messages with suggested next steps
- 8. `npm run build` passes with CLI package in place
- 9. All CLI tests pass

## Proof Level

- This slice proves: integration — CLI consumes real API endpoints, concurrent access verified at service layer and CLI output layer

## Integration Closure

- Upstream surfaces consumed: GET/POST/PATCH /api/tasks/* endpoints (from S01), Bearer token auth (from S01)
- New wiring: CLI package at `packages/cli/` with Commander.js, HTTP client, config resolution
- What remains: S06 end-to-end integration (full lifecycle: import → decompose → activate → claim → progress → complete → UAT → merge → done)

## Verification

- CLI outputs structured Chinese text to stdout/stderr
- HTTP client logs request failures with status codes
- `mt-cli status` provides connectivity diagnostics (server URL, milestone, agent identity)
- Error messages include the HTTP status code, Chinese description, and suggested next action

## Tasks

- [x] **T01: CLI package scaffold, config resolution, HTTP client, and status command** `est:1.5h`
  Create the CLI package at `packages/cli/` with Commander.js. Implement the layered config resolution system (project `.mt-cli.json` → user `~/.mt-cli.json`, env vars `MT_API_KEY` → `.mt-env`). Build an HTTP client wrapper that injects Bearer token auth and wraps API errors into structured Chinese messages. Implement the `mt-cli status` command that verifies server connectivity, active milestone, and agent identity. Write unit tests for config resolution and HTTP client.
  - Files: `packages/cli/package.json`, `packages/cli/tsconfig.json`, `packages/cli/vitest.config.ts`, `packages/cli/src/config.ts`, `packages/cli/src/client.ts`, `packages/cli/src/commands/status.ts`, `packages/cli/src/index.ts`, `packages/cli/src/__tests__/config.test.ts`, `packages/cli/src/__tests__/client.test.ts`
  - Verify: cd packages/cli && npx vitest run && npx tsc --noEmit

- [x] **T02: All task commands with Chinese output and LLM-friendly error messages** `est:2h`
  Implement the 6 task commands the CLI provides to AI Agents: `list`, `claim`, `progress`, `complete`, `show`, and `mine`. All output is formatted Chinese text. Error messages use natural language with suggested next actions. Support both `#N` (short_id) and `TASK-{seq}` full ID formats. The `show` command resolves `#N` task references inline. Write tests for all commands using mocked HTTP responses.
  - Files: `packages/cli/src/utils/id.ts`, `packages/cli/src/utils/format.ts`, `packages/cli/src/commands/list.ts`, `packages/cli/src/commands/claim.ts`, `packages/cli/src/commands/progress.ts`, `packages/cli/src/commands/complete.ts`, `packages/cli/src/commands/show.ts`, `packages/cli/src/commands/mine.ts`, `packages/cli/src/__tests__/commands.test.ts`, `packages/cli/src/index.ts`
  - Verify: cd packages/cli && npx vitest run

- [x] **T03: Concurrent claim verification and integration test suite** `est:1h`
  Write integration tests that prove the optimistic locking behavior on task claim: two agents claiming the same task simultaneously, only one succeeds while the other gets 409 Conflict. Also verify CLI error output produces correct Chinese guidance messages for all error scenarios. Ensure the full project build passes with the CLI package integrated.
  - Files: `packages/cli/src/__tests__/concurrency.test.ts`, `packages/cli/src/__tests__/error-output.test.ts`
  - Verify: cd packages/cli && npx vitest run && cd ../.. && npm run build

## Files Likely Touched

- packages/cli/package.json
- packages/cli/tsconfig.json
- packages/cli/vitest.config.ts
- packages/cli/src/config.ts
- packages/cli/src/client.ts
- packages/cli/src/commands/status.ts
- packages/cli/src/index.ts
- packages/cli/src/__tests__/config.test.ts
- packages/cli/src/__tests__/client.test.ts
- packages/cli/src/utils/id.ts
- packages/cli/src/utils/format.ts
- packages/cli/src/commands/list.ts
- packages/cli/src/commands/claim.ts
- packages/cli/src/commands/progress.ts
- packages/cli/src/commands/complete.ts
- packages/cli/src/commands/show.ts
- packages/cli/src/commands/mine.ts
- packages/cli/src/__tests__/commands.test.ts
- packages/cli/src/__tests__/concurrency.test.ts
- packages/cli/src/__tests__/error-output.test.ts
