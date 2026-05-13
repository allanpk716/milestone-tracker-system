# M002: 部署、日志与自动化测试

**Gathered:** 2026-05-13
**Status:** Ready for planning

## Project Description

为里程碑追踪系统增加自部署能力、结构化日志和 E2E 自动化测试基础。M001 MVP 已完成（336 测试，SvelteKit + SQLite + CLI），本里程碑让项目从本地开发走向可部署运行。

## Why This Milestone

M001 完成了功能开发，但项目只在本机能跑。需要：一键部署到远程 Windows Server、结构化日志帮助排查问题、E2E 测试验证部署后服务可用。这些是项目真正投入使用的必要基础设施。

## User-Visible Outcome

### When this milestone is complete, the user can:

- 在 GSD 中执行 `/release` 斜杠命令，一键完成构建 → 部署 → 验证全流程
- 访问 `http://172.18.200.47:30002` 使用远程部署的里程碑追踪系统
- 查看结构化日志文件排查问题（分级、时间戳、模块标记）
- 运行 E2E 测试脚本验证远程服务是否正常工作
- 服务开机自启动，崩溃自动重启

### Entry point / environment

- Entry point: GSD `/release` 斜杠命令 / `scripts/deploy.bat` 脚本
- Environment: 本地开发机（部署发起端）+ Windows Server 2019（部署目标）
- Live dependencies involved: SSH (update-hub 别名) 连接 172.18.200.47:30000

## Completion Class

- Contract complete means: 部署脚本可执行，日志系统替换 console.*，健康检查返回正确状态，E2E 测试通过
- Integration complete means: 实际部署到远程并验证通过，NSSM 服务运行正常
- Operational complete means: 服务开机自启、崩溃重启、日志轮转均正常工作

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- 执行 `/release` 或 deploy.bat 后，`http://172.18.200.47:30002/api/health` 返回 `{"status":"ok"}`
- E2E 测试对真实部署服务全部通过
- git 提交中无密码/key/密钥（扫描验证）
- 服务重启后自动恢复（NSSM SERVICE_AUTO_START）

## Architectural Decisions

### 全量推送部署模式

**Decision:** 本地 `npm run build` + `npm prune --production` 后，SCP 推送 build/ + node_modules/ + package.json 到远程

**Rationale:** 远程已有 Node.js 22.14.0，不需要构建工具链。全量推送保证依赖完整，避免远程 npm install 的网络/平台问题。首次推送体积较大（~100MB node_modules），后续增量小

**Alternatives Considered:**
- 远程构建（只推源码）— 需要远程装构建依赖，better-sqlite3 native addon 可能有编译问题
- Docker 容器化 — MVP 阶段过度，Windows Server Docker 体验不佳

### 轻量级自定义 Logger

**Decision:** 自实现结构化日志模块（零外部依赖），同时写 stdout 和日期滚动文件

**Rationale:** 项目依赖极简（仅 better-sqlite3 + drizzle + zod + marked + dotenv），不引入 pino/winston 等日志库。自实现满足分级 + 时间戳 + 文件轮转需求，代码量小

**Alternatives Considered:**
- pino — 功能强大但引入依赖，对 MVP 过重
- winston — 同上

### 部署配置与代码分离

**Decision:** 敏感配置放在 gitignored 的 `deploy-config.bat` 中，提交 `.example` 模板

**Rationale:** 参考项目 update-hub 的 release-config.bat 模式，成熟可靠。确保 git 历史中永远不含密码/key

**Alternatives Considered:**
- 环境变量注入 — Windows .bat 脚本中环境变量传递复杂
- 加密配置文件 — 过度复杂

## Error Handling Strategy

- **构建失败：** 立即中止部署流程，不推送
- **SCP 失败：** 重试 1 次，报告网络错误
- **NSSM 重启失败：** SSH 检查服务状态，报告日志尾部
- **健康检查失败：** 重试 3 次（间隔 2s），报告失败状态
- **日志文件写入失败：** 降级到 stdout-only，不阻塞主流程
- **未捕获异常：** process uncaughtException 处理器记录日志，NSSM 自动重启服务

## Risks and Unknowns

- **better-sqlite3 native addon 在远程 Windows + Node 22 的兼容性** — 需要实际部署验证，npm install 可能需要编译工具
- **node_modules 全量推送体积** — 首次 ~100MB+，后续可增量
- **Node.js 作为 NSSM 服务的稳定性** — update-hub 用 Go 二进制更简单，Node.js 服务模式需验证

## Existing Codebase / Prior Art

- `src/hooks.server.ts` — 请求中间件，日志增强的注入点
- `src/lib/server/*.ts` — 10 处 console.info/warn 需替换
- `scripts/build-and-run.bat` — 现有构建脚本，部署脚本的基础
- `docs/architecture.md` — 架构文档，需要更新
- `docs/development-notes.md` — 开发笔记，需要更新
- update-hub `deploy/` 目录 — NSSM 服务注册的参考实现
- update-hub `scripts/release.bat` + `scripts/config/release-config.bat` — 部署脚本参考

## Relevant Requirements

- R018 — 部署脚本与远程服务注册（S02）
- R019 — 结构化日志系统（S01）
- R020 — 健康检查端点（S01）
- R021 — E2E 自动化测试（S03）
- R022 — 隐私保护（S02）
- R023 — GSD /release 技能文件（S03）
- R024 — 文档更新（S04）

## Scope

### In Scope

- 结构化日志系统（自定义 logger）
- 健康检查端点（GET /api/health）
- 部署脚本（deploy.bat）+ 远程服务注册（install-service.bat）
- 隐私保护（.example 模板 + .gitignore 审查）
- E2E 自动化测试脚本
- GSD /release 技能文件
- 文档更新（README 精简 + 独立部署文档）

### Out of Scope / Non-Goals

- CI/CD 管道（GitHub Actions）
- Docker 容器化
- SSL/HTTPS（内网直连）
- 数据库备份/迁移策略
- 版本号 bump/changelog（复用 GSD 自带 release workflow）
- Playwright 浏览器测试

## Technical Constraints

- 远程服务器：Windows Server 2019，SSH update-hub 别名（172.18.200.47:30000）
- 远程 Node.js：v22.14.0（已验证）
- 服务端口：30002
- 远程路径：C:\WorkSpace\milestone-tracker
- 服务名称：MilestoneTracker
- NSSM 已存在于远程 C:\WorkSpace\update-server\nssm.exe
- 部署模式：全量推送（不远程构建）
- 零新外部依赖（logger 自实现）

## Integration Points

- **SSH (update-hub)** — 部署脚本通过 SSH/SCP 与远程服务器交互
- **NSSM** — Windows 服务管理器，注册 MilestoneTracker 服务
- **GSD /release** — 斜杠命令触发部署流程
- **npm run build** — SvelteKit adapter-node 构建输出

## Testing Requirements

- 日志模块单元测试（Vitest）：格式、级别过滤、文件写入
- 健康检查 API 测试：返回正确结构和状态
- E2E 测试：部署后对真实服务验证（Vitest + node-fetch）
- 现有 336 测试不受影响（回归验证）
- 不新增 Playwright 浏览器测试

## Acceptance Criteria

- 实际部署到 172.18.200.47:30002 并验证通过
- E2E 测试对真实服务全部通过
- git 提交中无密码/key/密钥
- README < 80 行，部署文档可独立指导从零部署
- `npm run build` 无错误
- 现有 336 测试不受影响

## Open Questions

- better-sqlite3 native addon 在远程 Windows + Node 22 上是否需要编译工具 — 需实际部署时验证
- 远程 .env 中的端口/密码首次配置方式 — install-service.bat 交互式创建
