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

### R010 — DELETE /api/milestones/[id] 端点。仅允许状态为 draft、completed、archived 的里程碑删除。in-progress 状态返回 403 + 明确错误信息"该里程碑正在开发中，无法删除"。删除时级联删除所有关联模块和任务（依赖 DB schema 已有的 onDelete: cascade）。
- Class: core-capability
- Status: active
- Description: DELETE /api/milestones/[id] 端点。仅允许状态为 draft、completed、archived 的里程碑删除。in-progress 状态返回 403 + 明确错误信息"该里程碑正在开发中，无法删除"。删除时级联删除所有关联模块和任务（依赖 DB schema 已有的 onDelete: cascade）。
- Why it matters: 缺少删除功能，用户无法清理不需要的里程碑。状态限制防止误删正在被 AI 开发中的里程碑。
- Source: user
- Primary owning slice: M005/S01
- Validation: mapped

### R011 — 侧滑面板增加删除按钮。点击弹出确认弹窗，显示"将删除 X 个模块、Y 个任务"统计信息。仅当状态允许删除时显示按钮。确认后执行删除，关闭面板 + 刷新列表 + toast 提示。
- Class: primary-user-loop
- Status: active
- Description: 侧滑面板增加删除按钮。点击弹出确认弹窗，显示"将删除 X 个模块、Y 个任务"统计信息。仅当状态允许删除时显示按钮。确认后执行删除，关闭面板 + 刷新列表 + toast 提示。
- Why it matters: 删除是破坏性操作，确认弹窗防止误操作，统计信息帮助用户评估影响范围。
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: M005/S01
- Validation: mapped

### R012 — 里程碑状态变更改为两步确认：先选择目标状态 → 弹出确认弹窗 → 确认才执行 PATCH API。当从 in-progress 改为其他状态时，确认弹窗额外显示"⚠️ 该里程碑可能正在被 AI 开发"警告。详情页和侧滑面板都需改造（当前是 select onchange 直接触发）。
- Class: primary-user-loop
- Status: active
- Description: 里程碑状态变更改为两步确认：先选择目标状态 → 弹出确认弹窗 → 确认才执行 PATCH API。当从 in-progress 改为其他状态时，确认弹窗额外显示"⚠️ 该里程碑可能正在被 AI 开发"警告。详情页和侧滑面板都需改造（当前是 select onchange 直接触发）。
- Why it matters: 当前 select onchange 直接触发 API，太容易误改状态。AI 正在开发中的里程碑被误改状态会导致严重问题。
- Source: user
- Primary owning slice: M005/S02
- Validation: mapped

### R013 — LLM 客户端连接超时从硬编码 30s 改为读取 .env 的 LLM_TIMEOUT_MS 环境变量，默认值 180000ms（3 分钟）。超时仅用于初始连接阶段，流式输出阶段不超时（LLM 可能输出很久）。
- Class: continuity
- Status: active
- Description: LLM 客户端连接超时从硬编码 30s 改为读取 .env 的 LLM_TIMEOUT_MS 环境变量，默认值 180000ms（3 分钟）。超时仅用于初始连接阶段，流式输出阶段不超时（LLM 可能输出很久）。
- Why it matters: 当前 30s 超时太短，某些 LLM 响应首 token 很慢导致频繁超时错误（LLM request timed out after 30000ms）。3 分钟默认值适合流式输出场景。
- Source: user
- Primary owning slice: M005/S03
- Validation: mapped

### R014 — 拆解过程中的终止按钮视觉增强（当前是小字下划线，改为醒目的按钮样式）。流式输出过程更可见——每个模块实时出现时有动画效果。
- Class: primary-user-loop
- Status: active
- Description: 拆解过程中的终止按钮视觉增强（当前是小字下划线，改为醒目的按钮样式）。流式输出过程更可见——每个模块实时出现时有动画效果。
- Why it matters: 当前终止按钮不够醒目，用户不知道可以中途停止。流式输出视觉效果增强提升用户体验。
- Source: user
- Primary owning slice: M005/S03
- Validation: mapped

### R015 — 详情页"详情"tab 改为左右分栏布局。左侧：MdViewer 渲染里程碑全文 Markdown（保留 TOC 目录导航），下方显示模块概览列表。右侧：AI 拆解区域（DecomposeStream）。左右对比便于验证拆解结果是否覆盖需求文档全部内容。
- Class: primary-user-loop
- Status: active
- Description: 详情页"详情"tab 改为左右分栏布局。左侧：MdViewer 渲染里程碑全文 Markdown（保留 TOC 目录导航），下方显示模块概览列表。右侧：AI 拆解区域（DecomposeStream）。左右对比便于验证拆解结果是否覆盖需求文档全部内容。
- Why it matters: 当前详情页 Markdown 是 pre 原文显示，不可读。左右分栏让用户对比原始需求和拆解结果，验证覆盖完整性。TOC 便于快速导航长文档。
- Source: user
- Primary owning slice: M005/S04
- Validation: mapped

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
| R010 | core-capability | active | M005/S01 | none | mapped |
| R011 | primary-user-loop | active | M005/S02 | M005/S01 | mapped |
| R012 | primary-user-loop | active | M005/S02 | none | mapped |
| R013 | continuity | active | M005/S03 | none | mapped |
| R014 | primary-user-loop | active | M005/S03 | none | mapped |
| R015 | primary-user-loop | active | M005/S04 | none | mapped |

## Coverage Summary

- Active requirements: 11
- Mapped to slices: 11
- Validated: 3 (R002, R003, R009)
- Unmapped active requirements: 0
