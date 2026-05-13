# M001: MVP 核心功能

**Gathered:** 2026-05-12
**Status:** Ready for planning

## Project Description

里程碑进度追踪中枢的 MVP 版本。一个轻量级的任务管理系统，管理员通过 Web 导入需求文档，LLM 拆解为模块和任务，AI Agent 通过 CLI 领取和上报进度，Web 看板实时展示全局状态。

包含三个独立交付物：SvelteKit Web 应用（含 REST API）、mt-cli 命令行工具、SQLite 数据库。

## Why This Milestone

从零开始构建 MVP，验证核心闭环：导入需求 → LLM 拆解 → 预览编辑 → 激活 → Agent 领取 → 进度上报 → UAT → 合并 → done。用户同时管理多个项目，每个项目一个里程碑，需要一个集中的追踪中枢。

## User-Visible Outcome

### When this milestone is complete, the user can:

- 在 Web 上创建里程碑（上传需求 MD、绑定 git 仓库），查看总览列表
- 点击拆解后，左侧看原始需求（富文本 + 目录导航），右侧逐模块看到 LLM 流式生成的任务建议
- 在右侧勾选/取消、编辑标题描述、手动追加模块和任务
- 确认后看到 LLM 的对比建议（可忽略），然后激活里程碑
- 在看板上看到模块卡片（折叠显示进度），展开看每个任务的详情
- 右键点击任务卡片执行管理员操作（UAT 通过/不通过、合并、暂停、取消等）
- 看到 24h 未更新的僵尸任务高亮警告
- 在 Agent 侧，通过 mt-cli 完成领取、报进度、标记完成的全流程

### Entry point / environment

- Entry point: Web 浏览器（管理端）+ mt-cli 命令行（Agent 端）
- Environment: 本地开发环境，Node.js 运行 SvelteKit + SQLite
- Live dependencies involved: OpenAI 兼容 LLM API（拆解和对比时调用）

## Completion Class

- Contract complete means: 所有 API 接口返回正确状态码和 JSON，Zod Schema 拒绝非法输入，状态流转严格按定义执行
- Integration complete means: Web 和 CLI 共用 API 完整跑通，LLM 拆解端到端可用，并发 claim 不数据错乱
- Operational complete means: 完整生命周期（导入→拆解→激活→领取→进度→完成→UAT→合并→done）可在本地环境实际操作

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- 从上传 MD 到 Agent 完成任务并合并的完整流程可以跑通
- 两个 Agent 同时 claim 同一个任务，只有一个成功，另一个收到清晰的中文错误提示
- 看板页面上 50 个任务以内渲染流畅，5 万字 MD 不卡顿
- `npm run build` 无错误，无 TODO/placeholder/硬编码占位数据

## Architectural Decisions

### API 路由架构

**Decision:** 使用 SvelteKit server routes 作为 API 层，不搞独立 API 服务

**Rationale:** Web 和 CLI 共用同一套 API，DB/认证/Zod schema 只写一份，部署简单（一个进程），SvelteKit 原生支持 ReadableStream 做 SSE

**Alternatives Considered:**
- 独立 Express/Hono API 服务 + SvelteKit 前端 — 多一层部署复杂度，MVP 不值得

### Web 认证

**Decision:** Cookie-based session（HttpOnly，签名），单管理员固定密码（.env 配置）

**Rationale:** MVP 只有一个管理员角色，固定密码够用，cookie session 比 JWT 简单且更安全（不暴露在 URL/Header 中）

**Alternatives Considered:**
- JWT Token — 过度设计，MVP 不需要无状态
- 无认证 — 管理员操作需要保护

### LLM 拆解交互

**Decision:** SSE 流式返回，逐模块推送

**Rationale:** LLM 拆解可能耗时较长（几秒到十几秒），流式让用户不用干等，逐模块渲染改善体验。SvelteKit +server.ts 原生支持 ReadableStream

**Alternatives Considered:**
- 同步等待（前端 loading）— 用户等半天体验差，用户明确要求流式

### CLI 分发

**Decision:** npm link 本地开发，不发 npm

**Rationale:** MVP 阶段自用，不需要公开分发。避免发包流程增加复杂度

**Alternatives Considered:**
- npm publish — MVP 不需要

### 数据库迁移

**Decision:** Drizzle Kit push 模式，直接推 schema 变更

**Rationale:** 开发阶段 schema 变化频繁，push 模式简单直接，不需要管理迁移文件

**Alternatives Considered:**
- Drizzle Kit generate + migrate — MVP 开发阶段过度

### 看板布局

**Decision:** 模块卡片列表（非 Trello 式按状态分列），折叠/展开，右键菜单

**Rationale:** 用户明确要求按模块组织视图，折叠态显示进度概要，展开显示任务详情，右键菜单根据状态动态禁用。不按状态分列，因为一个模块下的任务状态各异

**Alternatives Considered:**
- Trello 式状态列 — 用户明确不要这个

### 拆解预览布局

**Decision:** 左右分栏，左侧 MD 富文本（含顶部固定目录导航），右侧拆解结果编辑

**Rationale:** 用户需要同时看原始需求和拆解结果来对比和编辑。两侧独立滚动，MD 顶部固定目录方便快速定位

**Alternatives Considered:**
- 上下分栏 — MD 长时上下滚动体验差
- Tab 切换 — 无法同时对比

## Error Handling Strategy

MVP 的错误处理原则：**明确告知用户/Agent 发生了什么、下一步该干什么**，不静默重试。

- **LLM 调用失败：** 格式不对 → Zod 校验失败 → 保留已收到模块，提示重试。超时 → SSE 断开 → 提示已收到 N 个模块。不可达 → 直接报错检查配置
- **CLI 并发冲突：** 409 → 中文自然语言提示 + 建议下一步操作。426 → 版本过低提示升级。操作已关闭任务 → 中文提示任务已关闭
- **数据库：** WAL 模式消除大部分锁，极端情况重试 3 次（间隔 100ms），失败返回 500
- **Web 端：** 状态不合法 → 400 + 具体原因 + toast。Session 过期 → 跳转登录页
- **数据完整性：** 引用不存在的任务 → 不阻塞，显示为「#N (引用的任务不存在)」
- **不加：** 熔断器、重试队列、后台任务队列

## Risks and Unknowns

- **SSE 流式拆解的前端体验** — LLM 生成速度不均匀时，逐模块渲染是否流畅，需要实际跑起来验证
- **LLM 输出不可控** — Zod 校验兜底，但极端情况下 LLM 可能返回空结果或幻觉内容
- **超大 MD 处理** — 5 万字 MD 超出 LLM 上下文窗口怎么办？需要在 API 层做字符数预检
- **SQLite 并发写入** — WAL 模式基本消除，但多 Agent 高频 progress 上报时是否稳定

## Existing Codebase / Prior Art

- `docs/设计输入、需求文档/milestone-tracker-system-spec-2026-05-12.md` — 完整系统定义文档（数据模型、状态流转、API 设计、CLI 命令）
- `docs/设计输入、需求文档/milestone-tracker-dev-notes.md` — 架构师开发笔记（SQLite 数组存储、索引设计、CLI DX、状态重置边界处理）

## Relevant Requirements

- R001 — 里程碑创建与管理（S01）
- R002 — LLM 流式拆解任务（S02）
- R003 — 拆解预览与编辑（S03）
- R004 — 拆解后 LLM 对比建议（S03）
- R005 — 看板视图与管理员操作（S04）
- R006 — CLI 工具（S05）
- R007 — 任务引用解析（S04 + S05）
- R008 — 管理员登录认证（S01）
- R009 — 并发控制（S05）
- R010 — 僵尸任务高亮（S04）
- R011 — 全中文界面（S05 + S04）

## Scope

### In Scope

- SvelteKit Web 应用（含 REST API）
- 管理员登录（固定密码，cookie session）
- 里程碑创建、总览列表、状态管理
- LLM 流式拆解（OpenAI 兼容格式）
- 左右分栏拆解预览编辑
- LLM 对比建议（参考性）
- 手动创建模块和任务
- 看板视图（模块卡片，折叠/展开，右键菜单）
- 管理员全操作（UAT/合并/强制释放/重新打开/取消/暂停/恢复/编辑）
- 僵尸任务高亮
- 任务引用解析（Web + CLI）
- mt-cli 工具（全命令）
- 并发控制（乐观锁）
- 全中文界面

### Out of Scope / Non-Goals

- 数据导出
- 多管理员/用户系统
- 看板拖拽排序
- Webhook 通知
- npm 发布 CLI
- commit_hash 强制校验
- Web 端 LLM 配置页
- Agent 自动注册 API

## Technical Constraints

- 技术栈锁定：SvelteKit + SQLite (Drizzle ORM, WAL) + Zod + TailwindCSS + Commander.js
- LLM 仅实现 OpenAI 兼容格式
- CLI 与 Web 共用 REST API
- SQLite references 字段用 text + JSON 解析（原生不支持数组）
- Task 表 short_id 全局唯一递增（跨里程碑）
- MD 导入支持至少 5 万字（~150KB）
- 看板 50 个任务以内渲染流畅
- CLI 响应 < 2s（不含网络延迟）

## Integration Points

- **OpenAI 兼容 LLM API** — 拆解任务时调用（POST /api/milestones/:id/decompose），对比建议时调用
- **git 仓库** — .mt-cli.json 配置文件放在仓库根目录，Agent clone 后直接使用
- **Agent（GSD-2/Claude Code/Codex）** — 通过 mt-cli 与系统交互，不直接访问数据库

## Testing Requirements

- 单元测试：Zod Schema 校验、状态流转逻辑、引用解析、进度百分比计算（Vitest）
- API 集成测试：claim 乐观锁并发、任务生命周期、管理员操作边界、认证（Vitest + SvelteKit API）
- CLI 测试：配置加载优先级、输出格式、错误提示文案（Vitest + mock HTTP）
- 不做：E2E 浏览器测试、LLM mock 测试

## Acceptance Criteria

- 完整生命周期（导入→拆解→激活→领取→进度→完成→UAT→合并→done）可端到端跑通
- CLI 和 Web 共用 API，认证各自独立
- 多 Agent 并发 claim 不会数据错乱
- 错误场景有明确中文提示（CLI）或 toast（Web）
- `npm run build` 无错误
- 没有 TODO/placeholder/硬编码占位数据

## Open Questions

- SSE 流式拆解在 LLM 生成速度不均匀时的实际体验 — 需要实现后验证
- 超大 MD（接近 LLM 上下文窗口限制）的截断或分块策略 — MVP 先做字符数预检 + 提示
