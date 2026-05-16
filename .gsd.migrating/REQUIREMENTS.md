# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R004 — 部署后对真实服务执行 E2E 验证（Vitest + node-fetch），覆盖健康检查、登录、API 认证、核心业务流（创建里程碑 → 拆解 → 确认 → 激活）
- Class: quality-attribute
- Status: active
- Description: 部署后对真实服务执行 E2E 验证（Vitest + node-fetch），覆盖健康检查、登录、API 认证、核心业务流（创建里程碑 → 拆解 → 确认 → 激活）
- Why it matters: 确保部署后的服务真正可用，自动化验证替代手动检查
- Source: user
- Primary owning slice: M002/S03

### R006 — 创建 GSD 技能文件让 /release 斜杠命令触发构建 + 部署流程：验证 git 工作区干净 → 执行部署脚本 → 验证健康检查 → 报告结果
- Class: operability
- Status: active
- Description: 创建 GSD 技能文件让 /release 斜杠命令触发构建 + 部署流程：验证 git 工作区干净 → 执行部署脚本 → 验证健康检查 → 报告结果
- Why it matters: 通过 GSD 斜杠命令一键部署，降低操作门槛
- Source: user
- Primary owning slice: M002/S03

### R007 — README 精简（< 80 行）：项目简介 + 功能特性 + 快速开始 + 文档链接导航。独立部署文档 docs/deployment.md（从零部署完整指南）。更新已有开发笔记和架构文档。README 不堆砌内容，更多指向外部文档
- Class: operability
- Status: active
- Description: README 精简（< 80 行）：项目简介 + 功能特性 + 快速开始 + 文档链接导航。独立部署文档 docs/deployment.md（从零部署完整指南）。更新已有开发笔记和架构文档。README 不堆砌内容，更多指向外部文档
- Why it matters: 文档是项目可用性的关键部分，README 精简保持可读性，独立文档保证完整性
- Source: user
- Primary owning slice: M002/S04

### R001 — 部署脚本（deploy.bat）实现本地构建 → SCP 全量推送 build/ + node_modules/ → NSSM 重启 MilestoneTracker 服务 → 健康检查验证。远程服务：Windows Server 2019，SSH update-hub 别名，端口 30002，路径 C:\WorkSpace\milestone-tracker，服务名 MilestoneTracker，NSSM 管理自启动 + 崩溃重启 + 日志轮转
- Class: core-capability
- Status: active
- Description: 部署脚本（deploy.bat）实现本地构建 → SCP 全量推送 build/ + node_modules/ → NSSM 重启 MilestoneTracker 服务 → 健康检查验证。远程服务：Windows Server 2019，SSH update-hub 别名，端口 30002，路径 C:\WorkSpace\milestone-tracker，服务名 MilestoneTracker，NSSM 管理自启动 + 崩溃重启 + 日志轮转
- Why it matters: 项目需要从本地开发走向可部署运行，需要可重复的部署流程替代手动操作
- Source: user
- Primary owning slice: M002/S02
- Notes: Validated in M004/S01: deploy.bat end-to-end deployment to Windows Server 2019 successful — build→SCP→NSSM restart→health check OK. Fixed NSSM path bug (bare 'nssm' not on PATH), SCP port bug (SSH config controls port), and mkdir -p Windows incompatibility.

### R005 — git 提交中无密码/key/密钥。配置文件用 .example 模板 + .gitignore 排除真实配置。部署脚本从本地配置文件读取敏感信息。确保 data/、logs/、.env、deploy-config.bat 均被 gitignore
- Class: compliance/security
- Status: active
- Description: git 提交中无密码/key/密钥。配置文件用 .example 模板 + .gitignore 排除真实配置。部署脚本从本地配置文件读取敏感信息。确保 data/、logs/、.env、deploy-config.bat 均被 gitignore
- Why it matters: 防止隐私泄露，项目可能在公开仓库中共享
- Source: user
- Primary owning slice: M002/S02
- Notes: Validated in M004/S01: verify-no-secrets.sh 0 false positives across 149 files. .gsd.migrating/ untracked from git. Git history audit shows no real secrets. .gitignore covers data/, logs/, .env, deploy-config.bat.

### R016 — 里程碑详情页的 AI 拆解功能升级为多轮对话式交互。用户通过聊天界面与 AI 迭代拆解模块和任务，支持引用具体模块让 AI 修改润色。对话历史持久化到数据库（conversations + messages 表），刷新后可恢复。
- Class: primary-user-loop
- Status: active
- Description: 里程碑详情页的 AI 拆解功能升级为多轮对话式交互。用户通过聊天界面与 AI 迭代拆解模块和任务，支持引用具体模块让 AI 修改润色。对话历史持久化到数据库（conversations + messages 表），刷新后可恢复。
- Why it matters: 当前一次性拆解 + 内存存储导致刷新丢失、无法迭代优化。多轮对话让用户能精确控制拆解结果。
- Source: user
- Primary owning slice: M006/S02

### R017 — 点击 MdViewer 目录中的标题时，内容区平滑滚动到对应位置，目录侧栏始终可见不被滚出视口。滚动内容时目录高亮跟随当前可见标题。
- Class: primary-user-loop
- Status: active
- Description: 点击 MdViewer 目录中的标题时，内容区平滑滚动到对应位置，目录侧栏始终可见不被滚出视口。滚动内容时目录高亮跟随当前可见标题。
- Why it matters: 当前 scrollIntoView 导致整个页面滚动，目录消失且无法返回，严重影响长文档浏览体验。
- Source: user
- Primary owning slice: M006/S01

### R018 — 拆解提示词支持全局默认 + 每个里程碑可覆盖。在 AI 拆解功能旁边的可折叠面板中编辑，保存到后端。支持还原为默认提示词。提示词需能引用里程碑上下文信息。
- Class: core-capability
- Status: active
- Description: 拆解提示词支持全局默认 + 每个里程碑可覆盖。在 AI 拆解功能旁边的可折叠面板中编辑，保存到后端。支持还原为默认提示词。提示词需能引用里程碑上下文信息。
- Why it matters: 不同项目拆解策略不同，用户需要根据具体里程碑调整提示词。当前硬编码无法修改。
- Source: user
- Primary owning slice: M006/S03

### R019 — 草稿状态的里程碑必须在拥有至少一个模块（通过拆解确认写入）后才能变更为其他状态。前后端双重校验，防止空里程碑进入开发流程。
- Class: launchability
- Status: active
- Description: 草稿状态的里程碑必须在拥有至少一个模块（通过拆解确认写入）后才能变更为其他状态。前后端双重校验，防止空里程碑进入开发流程。
- Why it matters: 无模块的里程碑状态不可控，会导致后续开发流程混乱。
- Source: user
- Primary owning slice: M006/S04
- Supporting slices: M006/S02

### R020 — 拆解出的模块以卡片形式展示在 MD 文档预览区域下方。用户可选中模块、引用到对话中、直接在详情页确认拆解（不跳转 preview 页面）。确认后里程碑自动变为 in-progress。
- Class: primary-user-loop
- Status: active
- Description: 拆解出的模块以卡片形式展示在 MD 文档预览区域下方。用户可选中模块、引用到对话中、直接在详情页确认拆解（不跳转 preview 页面）。确认后里程碑自动变为 in-progress。
- Why it matters: 确认流程内联到详情页，减少页面跳转，提升操作效率。模块卡片提供可视化预览和交互入口。
- Source: user
- Primary owning slice: M006/S04
- Supporting slices: M006/S02

## Validated

### R002 — 替换现有 10 处 console.info/warn，实现轻量级自定义 logger（零外部依赖）。分级 debug/info/warn/error，带时间戳、模块标记，同时写 stdout 和文件（logs/app-YYYY-MM-DD.log），日志级别通过 .env LOG_LEVEL 控制，文件自动轮转保留 7 天。关键模块：请求进出、LLM 调用、状态变更、错误堆栈
- Class: quality-attribute
- Status: validated
- Description: 替换现有 10 处 console.info/warn，实现轻量级自定义 logger（零外部依赖）。分级 debug/info/warn/error，带时间戳、模块标记，同时写 stdout 和文件（logs/app-YYYY-MM-DD.log），日志级别通过 .env LOG_LEVEL 控制，文件自动轮转保留 7 天。关键模块：请求进出、LLM 调用、状态变更、错误堆栈
- Why it matters: 帮助开发者和管理员排查问题，为自动化测试提供可追踪的请求链路
- Source: user
- Primary owning slice: M002/S01
- Validation: Logger module created with 20 passing unit tests; all 9 server-side console.info/warn replaced with createLogger(); zero external dependencies; full test suite 363/363 green

### R003 — GET /api/health 公开端点（不需认证），返回 status、version、uptime、db 连接状态。供部署后自动验证和后续监控使用
- Class: operability
- Status: validated
- Description: GET /api/health 公开端点（不需认证），返回 status、version、uptime、db 连接状态。供部署后自动验证和后续监控使用
- Why it matters: 部署验证和监控的基础设施，E2E 测试的前置依赖
- Source: user
- Primary owning slice: M002/S01
- Validation: GET /api/health endpoint created with 7 passing tests; returns status/version/uptime/db; no auth required; DI-based healthCheck function for testability

### R009 — Untitled
- Status: validated
- Validation: validated by S02: 74 automated tests covering block/unblock API endpoints, CLI commands, status guards, error paths (404/409/400), and --json output

### R010 — DELETE /api/milestones/[id] 端点。仅允许状态为 draft、completed、archived 的里程碑删除。in-progress 状态返回 403 + 明确错误信息"该里程碑正在开发中，无法删除"。删除时级联删除所有关联模块和任务（依赖 DB schema 已有的 onDelete: cascade）。
- Class: core-capability
- Status: validated
- Description: DELETE /api/milestones/[id] 端点。仅允许状态为 draft、completed、archived 的里程碑删除。in-progress 状态返回 403 + 明确错误信息"该里程碑正在开发中，无法删除"。删除时级联删除所有关联模块和任务（依赖 DB schema 已有的 onDelete: cascade）。
- Why it matters: 缺少删除功能，用户无法清理不需要的里程碑。状态限制防止误删正在被 AI 开发中的里程碑。
- Source: user
- Primary owning slice: M005/S01
- Validation: DELETE /api/milestones/[id] implemented with status protection (403 for in-progress) and cascade deletion of modules/tasks for draft/completed/archived — verified by 6 unit tests and clean build in S01

### R013 — LLM 客户端连接超时从硬编码 30s 改为读取 .env 的 LLM_TIMEOUT_MS 环境变量，默认值 180000ms（3 分钟）。超时仅用于初始连接阶段，流式输出阶段不超时（LLM 可能输出很久）。
- Class: continuity
- Status: validated
- Description: LLM 客户端连接超时从硬编码 30s 改为读取 .env 的 LLM_TIMEOUT_MS 环境变量，默认值 180000ms（3 分钟）。超时仅用于初始连接阶段，流式输出阶段不超时（LLM 可能输出很久）。
- Why it matters: 当前 30s 超时太短，某些 LLM 响应首 token 很慢导致频繁超时错误（LLM request timed out after 30000ms）。3 分钟默认值适合流式输出场景。
- Source: user
- Primary owning slice: M005/S03
- Validation: LlmClient reads LLM_TIMEOUT_MS env var with 180000ms default; 14 unit tests pass including env var parsing, override, and invalid-value fallback. .env.example documents the config.

### R014 — 拆解过程中的终止按钮视觉增强（当前是小字下划线，改为醒目的按钮样式）。流式输出过程更可见——每个模块实时出现时有动画效果。
- Class: primary-user-loop
- Status: validated
- Description: 拆解过程中的终止按钮视觉增强（当前是小字下划线，改为醒目的按钮样式）。流式输出过程更可见——每个模块实时出现时有动画效果。
- Why it matters: 当前终止按钮不够醒目，用户不知道可以中途停止。流式输出视觉效果增强提升用户体验。
- Source: user
- Primary owning slice: M005/S03
- Validation: Terminate button rendered as prominent red button with bg-red-50, border-red-200, ✕ icon; fadeSlideIn animation enhanced with scale(0.97→1). Build succeeds.

### R015 — 详情页"详情"tab 改为左右分栏布局。左侧：MdViewer 渲染里程碑全文 Markdown（保留 TOC 目录导航），下方显示模块概览列表。右侧：AI 拆解区域（DecomposeStream）。左右对比便于验证拆解结果是否覆盖需求文档全部内容。
- Class: primary-user-loop
- Status: validated
- Description: 详情页"详情"tab 改为左右分栏布局。左侧：MdViewer 渲染里程碑全文 Markdown（保留 TOC 目录导航），下方显示模块概览列表。右侧：AI 拆解区域（DecomposeStream）。左右对比便于验证拆解结果是否覆盖需求文档全部内容。
- Why it matters: 当前详情页 Markdown 是 pre 原文显示，不可读。左右分栏让用户对比原始需求和拆解结果，验证覆盖完整性。TOC 便于快速导航长文档。
- Source: user
- Primary owning slice: M005/S04
- Validation: npm run build passes, code review confirms left-right split layout (60/40) with MdViewer+TOC, module overview, DecomposeStream, responsive stacking, and empty states all implemented in src/routes/(app)/milestones/[id]/+page.svelte

### R011 — 侧滑面板增加删除按钮。点击弹出确认弹窗，显示"将删除 X 个模块、Y 个任务"统计信息。仅当状态允许删除时显示按钮。确认后执行删除，关闭面板 + 刷新列表 + toast 提示。
- Class: primary-user-loop
- Status: validated
- Description: 侧滑面板增加删除按钮。点击弹出确认弹窗，显示"将删除 X 个模块、Y 个任务"统计信息。仅当状态允许删除时显示按钮。确认后执行删除，关闭面板 + 刷新列表 + toast 提示。
- Why it matters: 删除是破坏性操作，确认弹窗防止误操作，统计信息帮助用户评估影响范围。
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: M005/S01
- Validation: S02 实现侧滑面板删除按钮 + ConfirmDialog 统计信息（模块数/任务数），仅非 in-progress 状态显示。确认后调用 DELETE API + 关闭面板 + 刷新列表 + toast 提示。svelte-check 0 新错误，build 通过，代码审查确认。

### R012 — 里程碑状态变更改为两步确认：先选择目标状态 → 弹出确认弹窗 → 确认才执行 PATCH API。当从 in-progress 改为其他状态时，确认弹窗额外显示"⚠️ 该里程碑可能正在被 AI 开发"警告。详情页和侧滑面板都需改造（当前是 select onchange 直接触发）。
- Class: primary-user-loop
- Status: validated
- Description: 里程碑状态变更改为两步确认：先选择目标状态 → 弹出确认弹窗 → 确认才执行 PATCH API。当从 in-progress 改为其他状态时，确认弹窗额外显示"⚠️ 该里程碑可能正在被 AI 开发"警告。详情页和侧滑面板都需改造（当前是 select onchange 直接触发）。
- Why it matters: 当前 select onchange 直接触发 API，太容易误改状态。AI 正在开发中的里程碑被误改状态会导致严重问题。
- Source: user
- Primary owning slice: M005/S02
- Validation: S02 实现两步确认状态变更：先选目标状态 → ConfirmDialog 确认 → PATCH API。从 in-progress 改为其他状态时显示 AI 开发警告。详情页和侧滑面板均已改造。svelte-check 0 新错误，build 通过，代码审查确认。

## Deferred

## Out of Scope

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R004 | quality-attribute | active | M002/S03 | none | unmapped |
| R006 | operability | active | M002/S03 | none | unmapped |
| R007 | operability | active | M002/S04 | none | unmapped |
| R002 | quality-attribute | validated | M002/S01 | none | Logger module created with 20 passing unit tests; all 9 server-side console.info/warn replaced with createLogger(); zero external dependencies; full test suite 363/363 green |
| R003 | operability | validated | M002/S01 | none | GET /api/health endpoint created with 7 passing tests; returns status/version/uptime/db; no auth required; DI-based healthCheck function for testability |
| R009 |  | validated | none | none | validated by S02: 74 automated tests covering block/unblock API endpoints, CLI commands, status guards, error paths (404/409/400), and --json output |
| R001 | core-capability | active | M002/S02 | none | unmapped |
| R005 | compliance/security | active | M002/S02 | none | unmapped |
| R010 | core-capability | validated | M005/S01 | none | DELETE /api/milestones/[id] implemented with status protection (403 for in-progress) and cascade deletion of modules/tasks for draft/completed/archived — verified by 6 unit tests and clean build in S01 |
| R013 | continuity | validated | M005/S03 | none | LlmClient reads LLM_TIMEOUT_MS env var with 180000ms default; 14 unit tests pass including env var parsing, override, and invalid-value fallback. .env.example documents the config. |
| R014 | primary-user-loop | validated | M005/S03 | none | Terminate button rendered as prominent red button with bg-red-50, border-red-200, ✕ icon; fadeSlideIn animation enhanced with scale(0.97→1). Build succeeds. |
| R015 | primary-user-loop | validated | M005/S04 | none | npm run build passes, code review confirms left-right split layout (60/40) with MdViewer+TOC, module overview, DecomposeStream, responsive stacking, and empty states all implemented in src/routes/(app)/milestones/[id]/+page.svelte |
| R011 | primary-user-loop | validated | M005/S02 | M005/S01 | S02 实现侧滑面板删除按钮 + ConfirmDialog 统计信息（模块数/任务数），仅非 in-progress 状态显示。确认后调用 DELETE API + 关闭面板 + 刷新列表 + toast 提示。svelte-check 0 新错误，build 通过，代码审查确认。 |
| R012 | primary-user-loop | validated | M005/S02 | none | S02 实现两步确认状态变更：先选目标状态 → ConfirmDialog 确认 → PATCH API。从 in-progress 改为其他状态时显示 AI 开发警告。详情页和侧滑面板均已改造。svelte-check 0 新错误，build 通过，代码审查确认。 |
| R016 | primary-user-loop | active | M006/S02 | none | unmapped |
| R017 | primary-user-loop | active | M006/S01 | none | unmapped |
| R018 | core-capability | active | M006/S03 | none | unmapped |
| R019 | launchability | active | M006/S04 | M006/S02 | unmapped |
| R020 | primary-user-loop | active | M006/S04 | M006/S02 | unmapped |

## Coverage Summary

- Active requirements: 10
- Mapped to slices: 10
- Validated: 9 (R002, R003, R009, R010, R013, R014, R015, R011, R012)
- Unmapped active requirements: 0
