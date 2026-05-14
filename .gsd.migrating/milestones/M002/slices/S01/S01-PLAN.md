# S01: 结构化日志 + 健康检查

**Goal:** 替换现有 10 处 console.info/warn，实现零外部依赖的结构化日志模块（分级 debug/info/warn/error，时间戳+模块标记，双写 stdout + 文件 logs/app-YYYY-MM-DD.log，LOG_LEVEL 环境变量控制，7 天自动轮转），并创建 GET /api/health 公开端点（返回 status/version/uptime/db 状态）。
**Demo:** 所有日志分级写入文件（logs/app-YYYY-MM-DD.log），GET /api/health 返回服务状态

## Must-Haves

- 1. `npx vitest run src/lib/server/logger.test.ts` 全部通过
- 2. `grep -rn "console\.\(info\|warn\)" src/lib/server/ --include="*.ts"` 返回 0 匹配
- 3. `npx vitest run src/routes/api/health/` 全部通过
- 4. `npx vitest run` 现有 336+ 测试全部通过
- 5. /api/health 无需认证即可访问，返回 status/version/uptime/db 字段

## Proof Level

- This slice proves: integration — 需要验证 logger 写入文件 + health 端点查询真实 DB

## Integration Closure

- Upstream surfaces consumed: `src/lib/db/index.ts`（health 端点查询 DB 状态）、`src/hooks.server.ts`（添加 /api/health 到公开路由、添加请求日志）
- New wiring introduced in this slice: logger 模块作为所有 server 代码的日志基础设施；health 路由作为 S02 部署验证的前置依赖
- What remains before the milestone is truly usable end-to-end: S02 部署脚本 + S03 E2E 测试 + S04 文档

## Verification

- Runtime signals: 结构化日志输出到 stdout 和 logs/app-YYYY-MM-DD.log，包含 ISO 时间戳、级别、模块标记
- Inspection surfaces: GET /api/health 返回服务运行状态；日志文件可通过 cat/tail 查看
- Failure visibility: DB 连接失败时 health 返回 db:"error" 状态；日志目录不可写时降级为 stdout-only
- Redaction constraints: logger 禁止记录 API keys、密码、Bearer tokens（已有 llm-client 的先例）

## Tasks

- [x] **T01: Create structured logger module with unit tests** `est:1h`
  Create `src/lib/server/logger.ts` with a `createLogger(module)` factory function. Zero external dependencies.
  - Files: `src/lib/server/logger.ts`, `src/lib/server/logger.test.ts`, `.env.example`, `.gitignore`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && npx vitest run src/lib/server/logger.test.ts

- [x] **T02: Replace all console.info/warn calls with structured logger** `est:30m`
  Replace all 10 server-side console.info/warn calls with module-specific loggers created via `createLogger()`.
  - Files: `src/lib/server/llm-client.ts`, `src/lib/server/compare-service.ts`, `src/lib/server/confirm-service.ts`, `src/lib/server/decompose-service.ts`, `src/hooks.server.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && grep -rn "console\.(info|warn)" src/lib/server/ --include="*.ts" | grep -v node_modules | grep -v ".test.ts" && echo 'FAIL: console calls remain' || echo 'PASS: no server console.info/warn'

- [x] **T03: Create GET /api/health endpoint with tests** `est:30m`
  Create a public health check endpoint that requires no authentication.
  - Files: `src/routes/api/health/+server.ts`, `src/routes/api/health/health.test.ts`, `src/hooks.server.ts`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && npx vitest run src/routes/api/health/ && npx vitest run

## Files Likely Touched

- src/lib/server/logger.ts
- src/lib/server/logger.test.ts
- .env.example
- .gitignore
- src/lib/server/llm-client.ts
- src/lib/server/compare-service.ts
- src/lib/server/confirm-service.ts
- src/lib/server/decompose-service.ts
- src/hooks.server.ts
- src/routes/api/health/+server.ts
- src/routes/api/health/health.test.ts
