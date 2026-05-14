# S01: --json 结构化输出

**Goal:** 所有现有 CLI 命令（list, show, mine, claim, progress, complete, status）加 --json 标志，成功时输出 API 原始 JSON，错误时输出 { error, code, details? }。AI Agent 能可靠解析所有命令输出。
**Demo:** 所有 CLI 命令（list, show, mine, claim, progress, complete, status）加 --json 标志，输出可被机器解析的 JSON。AI Agent 能可靠读取任务列表、详情、操作结果。

## Must-Haves

- 所有 7 个 CLI 命令支持 --json 布尔标志
- 成功路径：--json 输出 API 原始 JSON 到 stdout（list 输出完整任务数组不过滤）
- 错误路径：--json 输出 { error: string, code: string, details?: unknown } 到 stdout，exit code 1
- 不加 --json 时输出与当前完全一致（人类可读中文文本）
- 错误 code 格式：HTTP 错误为 "HTTP_404" / "HTTP_409" 等，超时为 "TIMEOUT"，网络为 "NETWORK_ERROR"，配置为 "CONFIG_ERROR"
- 所有 JSON 输出可被 JSON.parse 解析
- packages/cli npm test 全部通过

## Proof Level

- This slice proves: contract — 验证 --json 输出的 JSON 格式和内容正确性，不需要运行时服务器

## Integration Closure

- Upstream surfaces consumed: MtClient API response types (TaskResponse, MilestoneResponse), MtCliError class (status, message, suggestion, url fields)
- New wiring introduced in this slice: json-output.ts utility module imported by all 7 command files
- What remains before the milestone is truly usable end-to-end: S02 (block/unblock commands using --json pattern), S03 (complete evidence extension + modules commands), S04 (E2E tests), S05 (GSD2 extension)

## Verification

- JSON error output includes machine-readable code field for automated error classification; future agents can parse code to decide retry/backoff strategy.

## Tasks

- [x] **T01: Create JSON output utility module with unit tests** `est:30m`
  Create a shared `packages/cli/src/utils/json-output.ts` utility that provides consistent --json formatting for all CLI commands.
  - Files: `packages/cli/src/utils/json-output.ts`, `packages/cli/src/__tests__/json-output.test.ts`
  - Verify: cd packages/cli && npx vitest run src/__tests__/json-output.test.ts

- [x] **T02: Wire --json flag into all 7 CLI commands** `est:45m`
  Add `--json` boolean option to all 7 CLI commands and wire the json-output utility into each command's action handler.
  - Files: `packages/cli/src/commands/list.ts`, `packages/cli/src/commands/show.ts`, `packages/cli/src/commands/mine.ts`, `packages/cli/src/commands/claim.ts`, `packages/cli/src/commands/progress.ts`, `packages/cli/src/commands/complete.ts`, `packages/cli/src/commands/status.ts`
  - Verify: cd packages/cli && npx vitest run

- [x] **T03: Write comprehensive --json output tests for all commands** `est:45m`
  Write integration-style tests that exercise --json output for all 7 commands, covering both success and error paths.
  - Files: `packages/cli/src/__tests__/json-commands.test.ts`
  - Verify: cd packages/cli && npx vitest run

## Files Likely Touched

- packages/cli/src/utils/json-output.ts
- packages/cli/src/__tests__/json-output.test.ts
- packages/cli/src/commands/list.ts
- packages/cli/src/commands/show.ts
- packages/cli/src/commands/mine.ts
- packages/cli/src/commands/claim.ts
- packages/cli/src/commands/progress.ts
- packages/cli/src/commands/complete.ts
- packages/cli/src/commands/status.ts
- packages/cli/src/__tests__/json-commands.test.ts
