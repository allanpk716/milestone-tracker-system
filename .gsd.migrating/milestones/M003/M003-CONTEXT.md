# M003: AI Agent 可用性增强

**Gathered:** 2026-05-14
**Status:** Ready for planning

## Project Description

将 mt-cli 从"勉强可用"升级为"生产级 AI Agent 标准任务回报接口"。补齐 `--json` 结构化输出、block/unblock 遇阻上报、complete 验证证据、modules 模块视图四大核心能力，并参照 github-sync 架构模式实现 GSD2 原生 extension 集成。

## Why This Milestone

当前 mt-cli 存在三个 P0 缺口阻止第三方 AI Agent 正常工作：(1) 所有输出是人类可读中文文本，Agent 无法可靠解析；(2) Agent 遇阻没有标准化上报渠道，任务可能卡死；(3) 完成时无法提交验证证据，虚假完成无法自动发现。此外缺少模块级视图和 GSD2 原生集成。反馈文档 `docs/feedback/cli-third-party-ai-evaluation.md` 详细记录了缺口分析。

## User-Visible Outcome

### When this milestone is complete, the user can:

- 通过 `mt-cli tasks list --json` 获取机器可解析的任务列表，AI Agent 能可靠读取
- 通过 `mt-cli tasks block <id> --reason "xxx" --json` 结构化上报障碍，管理员在 Web 端看到阻塞状态
- 通过 `mt-cli tasks complete <id> --evidence '[...]' --files-touched '[...]' --json` 提交验证证据
- 通过 `mt-cli modules list --json` 查看模块级上下文
- 在 GSD2 中安装 mt-cli extension 后，auto-mode 自动同步任务状态到 Milestone Tracker

### Entry point / environment

- Entry point: `mt-cli` CLI（AI Agent 调用）+ GSD2 `/mt-cli` 命令（原生集成）
- Environment: 开发环境（单元测试）+ 远程 Milestone Tracker 服务（E2E 测试）+ GSD2 环境（extension 集成）
- Live dependencies involved: Milestone Tracker API 服务（已有部署）

## Completion Class

- Contract complete means: 所有 CLI 命令 `--json` 输出有效 JSON（成功和错误路径）；block/unblock API 端点 + CLI 命令状态流转正确；complete 新字段正确存储返回；modules 命令正确消费已有 API
- Integration complete means: E2E 测试覆盖完整 Agent 生命周期；GSD2 extension 可安装、bootstrap 验证连通性、auto-mode 自动同步
- Operational complete means: 部署后新 API 端点可用；mt-cli npm 包可全局安装使用

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- 模拟完整 AI Agent 生命周期：发现(list --json) → 领取(claim) → 进度(progress) → 阻塞(block + reason) → 解除(unblock) → 完成(complete --evidence --files-touched)，所有步骤输出有效 JSON
- GSD2 extension 安装后 `/mt-cli bootstrap` 验证 mt-cli 可用、配置正确、API 连通
- 全量测试套件 `npm test` + `npm run test:e2e` 通过

## Architectural Decisions

### block/unblock 独立端点 vs 复用 admin action

**Decision:** 新增独立端点 `POST /api/tasks/[id]/block` 和 `POST /api/tasks/[id]/unblock`

**Rationale:** 与 claim/complete/progress 保持一致的 API 模式——每个 Agent 操作一个独立端点，语义清晰、校验独立、错误信息明确

**Alternatives Considered:**
- 复用 `PATCH /api/tasks/[id]` admin action（传 `{status: 'blocked'}`）— 不加新端点但语义不够明确，且 admin action 不应暴露给 Agent 级别用户

### `--json` 实现方式

**Decision:** 每个命令加 `--json` 布尔标志，action 内分支输出

**Rationale:** 最小改动，不引入全局中间件或 `--format` 选项。`--json` 标志与 Commander.js 的 `.option()` 完美契合

**Alternatives Considered:**
- 全局 `--format text|json` 选项 — 过度设计，当前只有两种输出模式

### complete 状态流转

**Decision:** 保持 `in-progress → done` 直接完成，不加 submit/review 步骤

**Rationale:** 代码已支持 `in-progress` 和 `review` 都可 complete。Agent 场景不需要人工审核环节，简单直接

**Alternatives Considered:**
- 增加 `submit` 命令推到 `review` 状态 — 多一层人工确认，但 Agent 场景不需要

### evidence 存储方案

**Decision:** DB 新增 `evidence_json TEXT` + `files_touched TEXT` 列（nullable）

**Rationale:** 与现有 `references` 列模式一致（JSON 字符串存在 TEXT 列），简单直接，不需要独立表

**Alternatives Considered:**
- 独立 evidence 表 — 过度设计，evidence 和 task 是 1:1 关系

### GSD2 集成架构

**Decision:** 参照 github-sync 模式写 GSD2 extension

**Rationale:** github-sync 已验证的成熟模式：execFileSync 包装外部 CLI、ok/error Result 类型、mapping 持久化、auto-post-unit 钩子集成、非阻塞设计。完全适用于 mt-cli 集成

**Alternatives Considered:**
- GSD2 Skill（SKILL.md 指导 Agent 手动调用 bash）— 体验差，Agent 需要自己拼命令，不可靠
- 独立 npm 包直接 import mt-client — 需要额外打包，不如直接调用 CLI 简单

> See `.gsd/DECISIONS.md` for the full append-only register of all project decisions.

## Error Handling Strategy

遵循已有约定，不引入新模式：

- **API 端点**：延续现有模式 — Zod 校验失败返回 `{ error: 'validation_error', details }` (400)，资源不存在返回 404，状态冲突返回 `{ error: 'invalid_status', currentStatus }` (400)
- **CLI `--json` 错误输出**：`{ error: string, code: string, details?: unknown }`，`process.exit(1)`
- **`--evidence` / `--files-touched` 校验**：CLI 层先 `JSON.parse` 验证格式，服务端 Zod 做最终校验。不校验 evidence 数组内部具体字段——作为自由 JSON 存储
- **DB 迁移**：新增列为 nullable TEXT，迁移对现有数据无影响
- **GSD2 extension**：所有 CLI 调用错误被 catch，不阻塞 GSD 主流程（与 github-sync 一致）

## Risks and Unknowns

- **DB 迁移在生产环境执行** — 只是加 nullable 列，风险低但需验证 drizzle-kit push 正确执行
- **`--json` 输出一致性** — 需要确保所有命令路径（成功和所有错误分支）都输出有效 JSON
- **GSD2 extension 安装路径** — `~/.gsd/agent/extensions/mt-cli/` 需要用户手动放置或提供安装脚本
- **mt-cli 全局可用性** — GSD2 extension 通过 `execFileSync('mt-cli', ...)` 调用，需要 mt-cli 在 PATH 中可用（npm install -g 或 npm link）

## Existing Codebase / Prior Art

- `packages/cli/src/` — mt-cli CLI，7 个现有命令，Commander.js + MtClient HTTP 封装
- `src/lib/server/task-service.ts` — 任务服务层，已有 claimTask/progressTask/completeTask/adminTaskAction
- `src/lib/schemas/task.ts` — Zod 校验 + 状态流转映射（`validTransitions`）
- `src/lib/db/schema.ts` — Drizzle schema，tasks 表已有 13 列
- `src/routes/api/tasks/[id]/` — 已有 claim/complete/progress 子端点
- `~/.gsd/agent/extensions/github-sync/` — 参照架构：index.js + cli.js + sync.js + mapping.js + templates.js
- `tests/e2e/` — 已有 E2E 测试框架：helpers.ts + vitest config

## Relevant Requirements

- R008 — CLI `--json` 结构化输出（本里程碑核心）
- R009 — block/unblock 命令和 API（本里程碑核心）
- R010 — complete 验证证据扩展（本里程碑核心）
- R011 — modules 命令组（本里程碑核心）
- R012 — GSD2 mt-cli Extension（本里程碑核心）

## Scope

### In Scope

- 所有现有 CLI 命令添加 `--json` 标志
- 新增 block/unblock API 端点 + CLI 命令
- complete 命令扩展 evidence/files-touched 参数 + DB 迁移
- modules 命令组（消费已有 API）
- E2E 场景测试（完整 Agent 生命周期）
- GSD2 mt-cli extension（参照 github-sync）

### Out of Scope / Non-Goals

- SSE/WebSocket 实时推送（反馈文档第三阶段）
- 批量操作
- 心跳机制
- 任务偏差（deviation）上报
- 配置自发现
- 全局 `--format` 选项（用 `--json` 布尔标志代替）
- Web 端 UI 变更（纯 CLI + API + Extension）

## Technical Constraints

- DB 迁移只做增量加列，不改变现有列
- CLI 只加 `--json` 布尔标志，不改默认行为（默认仍输出人类可读中文）
- GSD2 extension 使用 `execFileSync` 调用 mt-cli（不直接 import）
- mt-cli 必须在 GSD2 环境的 PATH 中可用
- 所有改动保持与现有测试套件的兼容性

## Integration Points

- Milestone Tracker API — 新增 block/unblock 端点，扩展 complete 端点
- mt-cli CLI — 所有命令新增 `--json` 标志，新增 block/unblock/modules 命令
- GSD2 auto-post-unit 钩子 — extension 在此钩子中自动同步任务状态
- GSD2 `/mt-cli` 命令 — bootstrap/status 功能

## Testing Requirements

- **单元测试**：服务端新端点/service 函数（DI + 内存 SQLite）；CLI 命令（mock HTTP client，测试 `--json` 输出和错误处理）
- **E2E 测试**：模拟完整 Agent 生命周期 + 错误场景（重复 block、已完成任务 block、无效 evidence JSON 等）
- **全量套件**：`npm test` + `npm run test:e2e` 全部通过

## Acceptance Criteria

- 所有 CLI 命令 `--json` 输出有效 JSON，错误时也是 JSON
- `block`/`unblock` 端点 + CLI 命令工作正常，状态流转正确
- `complete --evidence --files-touched` 数据正确存储和返回
- `modules list`/`modules show` 消费已有 API 返回正确数据
- E2E 测试覆盖完整 Agent 生命周期 + 错误场景
- GSD2 extension 可安装，`/mt-cli bootstrap` 验证连通性
- 全量测试套件通过

## Open Questions

- mt-cli 在 GSD2 环境中的安装方式：npm link（开发）vs npm install -g（生产）vs npx（无需安装）— 倾向 npm link + npm install -g，S05 执行时确定
