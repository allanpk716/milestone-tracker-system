# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — 部署脚本（deploy.bat）实现本地构建 → SCP 全量推送 build/ + node_modules/ → NSSM 重启 MilestoneTracker 服务 → 健康检查验证。远程服务：Windows Server 2019，SSH update-hub 别名，端口 30002，路径 C:\WorkSpace\milestone-tracker，服务名 MilestoneTracker，NSSM 管理自启动 + 崩溃重启 + 日志轮转
- Class: core-capability
- Status: active
- Description: 部署脚本（deploy.bat）实现本地构建 → SCP 全量推送 build/ + node_modules/ → NSSM 重启 MilestoneTracker 服务 → 健康检查验证。远程服务：Windows Server 2019，SSH update-hub 别名，端口 30002，路径 C:\WorkSpace\milestone-tracker，服务名 MilestoneTracker，NSSM 管理自启动 + 崩溃重启 + 日志轮转
- Why it matters: 项目需要从本地开发走向可部署运行，需要可重复的部署流程替代手动操作
- Source: user
- Primary owning slice: M002/S02

### R004 — 部署后对真实服务执行 E2E 验证（Vitest + node-fetch），覆盖健康检查、登录、API 认证、核心业务流（创建里程碑 → 拆解 → 确认 → 激活）
- Class: quality-attribute
- Status: active
- Description: 部署后对真实服务执行 E2E 验证（Vitest + node-fetch），覆盖健康检查、登录、API 认证、核心业务流（创建里程碑 → 拆解 → 确认 → 激活）
- Why it matters: 确保部署后的服务真正可用，自动化验证替代手动检查
- Source: user
- Primary owning slice: M002/S03

### R005 — git 提交中无密码/key/密钥。配置文件用 .example 模板 + .gitignore 排除真实配置。部署脚本从本地配置文件读取敏感信息。确保 data/、logs/、.env、deploy-config.bat 均被 gitignore
- Class: compliance/security
- Status: active
- Description: git 提交中无密码/key/密钥。配置文件用 .example 模板 + .gitignore 排除真实配置。部署脚本从本地配置文件读取敏感信息。确保 data/、logs/、.env、deploy-config.bat 均被 gitignore
- Why it matters: 防止隐私泄露，项目可能在公开仓库中共享
- Source: user
- Primary owning slice: M002/S02

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
| R001 | core-capability | active | M002/S02 | none | unmapped |
| R002 | quality-attribute | validated | M002/S01 | none | Logger module created with 20 passing unit tests; all 9 server-side console.info/warn replaced with createLogger(); zero external dependencies; full test suite 363/363 green |
| R003 | operability | validated | M002/S01 | none | GET /api/health endpoint created with 7 passing tests; returns status/version/uptime/db; no auth required; DI-based healthCheck function for testability |
| R004 | quality-attribute | active | M002/S03 | none | unmapped |
| R005 | compliance/security | active | M002/S02 | none | unmapped |
| R006 | operability | active | M002/S03 | none | unmapped |
| R007 | operability | active | M002/S04 | none | unmapped |
| R009 |  | validated | none | none | validated by S02: 74 automated tests covering block/unblock API endpoints, CLI commands, status guards, error paths (404/409/400), and --json output |

## Coverage Summary

- Active requirements: 5
- Mapped to slices: 5
- Validated: 3 (R002, R003, R009)
- Unmapped active requirements: 0
