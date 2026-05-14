# S02: block/unblock API + CLI

**Goal:** Agent 遇到障碍时通过 `mt-cli tasks block <id> --reason '缺少 OAuth 配置' --json` 结构化上报阻塞。管理员在 Web 看板看到阻塞状态（已有 blocked 过滤器）。通过 `mt-cli tasks unblock <id> [--message "配置已修复"] --json` 解除阻塞后 Agent 继续工作。
**Demo:** Agent 遇到障碍时通过 mt-cli tasks block <id> --reason '缺少 OAuth 配置' --json 结构化上报。管理员在 Web 端看到阻塞状态。解除阻塞后 Agent 继续工作。

## Must-Haves

- POST /api/tasks/[id]/block 含 reason 字段，状态校验 in-progress→blocked，返回更新后 task 含 blockedReason
- POST /api/tasks/[id]/unblock 含可选 message，状态校验 blocked→in-progress，清除 blockedReason
- blockTask/unblockTask 服务函数通过单元测试（成功路径 + not_found + invalid_status）
- CLI `mt-cli tasks block <id> --reason "xxx" [--json]` 和 `mt-cli tasks unblock <id> [--message "xxx"] [--json]` 正常工作
- 两个 CLI 命令 --json 输出有效 JSON（成功 + 错误路径）
- 全量 npm test 通过

## Proof Level

- This slice proves: integration — API 端点 + CLI 命令端到端，mock HTTP 测试覆盖成功和错误路径

## Integration Closure

Upstream surfaces consumed: S01 的 outputJson/outputJsonError 工具（json-output.ts）, 现有 task-service 函数模式, 现有路由模式（claim/progress/complete）, 现有 DB schema + Zod schema 模式
New wiring: 2 个新 API 路由（block, unblock）, 2 个新 CLI 命令, DB schema 新增 blockedReason 列
What remains: S03 complete 验证证据扩展 + modules 命令, S04 E2E 测试, S05 GSD2 extension

## Verification

- Runtime signals: task status transition to/from 'blocked', blockedReason 字段存储阻塞原因
- Inspection surfaces: `mt-cli tasks show <id> --json` 显示 blockedReason; kanban blocked 过滤器显示阻塞任务
- Failure visibility: invalid_status 错误含 currentStatus 字段; not_found 返回 404

## Tasks

- [x] **T01: Server-side block/unblock (schema + service + routes + tests)** `est:1h`
  Add blockedReason column to tasks DB schema, Zod validation schemas for block/unblock input, blockTask/unblockTask service functions with status guards, and API route handlers. Update formatTaskResponse and taskResponseSchema to include blockedReason. Write comprehensive unit tests for the service layer.
  - Files: `src/lib/db/schema.ts`, `src/lib/schemas/task.ts`, `src/lib/schemas/index.ts`, `src/lib/server/task-service.ts`, `src/lib/server/task-service.test.ts`, `src/routes/api/tasks/[id]/block/+server.ts`, `src/routes/api/tasks/[id]/unblock/+server.ts`
  - Verify: npx vitest run src/lib/server/task-service.test.ts && test -f src/routes/api/tasks/[id]/block/+server.ts && test -f src/routes/api/tasks/[id]/unblock/+server.ts && grep -q blockedReason src/lib/db/schema.ts

- [x] **T02: CLI block/unblock commands with --json + integration tests** `est:45m`
  Create `mt-cli tasks block` and `mt-cli tasks unblock` CLI commands following the established Commander.js pattern from claim/progress commands. Both commands support `--json` flag using outputJson/outputJsonError. Update TaskResponse type to include blockedReason. Write integration tests covering success, error, and --json paths.
  - Files: `packages/cli/src/types.ts`, `packages/cli/src/commands/block.ts`, `packages/cli/src/commands/unblock.ts`, `packages/cli/src/index.ts`, `packages/cli/src/__tests__/block-unblock.test.ts`
  - Verify: npx vitest run packages/cli/src/__tests__/block-unblock.test.ts && grep -c "registerBlockCommand\|registerUnblockCommand" packages/cli/src/index.ts

## Files Likely Touched

- src/lib/db/schema.ts
- src/lib/schemas/task.ts
- src/lib/schemas/index.ts
- src/lib/server/task-service.ts
- src/lib/server/task-service.test.ts
- src/routes/api/tasks/[id]/block/+server.ts
- src/routes/api/tasks/[id]/unblock/+server.ts
- packages/cli/src/types.ts
- packages/cli/src/commands/block.ts
- packages/cli/src/commands/unblock.ts
- packages/cli/src/index.ts
- packages/cli/src/__tests__/block-unblock.test.ts
