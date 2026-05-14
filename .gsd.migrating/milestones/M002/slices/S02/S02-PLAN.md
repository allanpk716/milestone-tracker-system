# S02: 部署脚本 + 服务注册 + 隐私保护

**Goal:** 实现完整的部署流程：deploy.bat 本地构建 → SCP 全量推送 build/ + node_modules/ → NSSM 重启服务 → 健康检查验证；install-service.bat 首次服务注册（NSSM SERVICE_AUTO_START + 崩溃重启 + 日志轮转）；deploy-config.bat.example 配置模板 + .gitignore 更新确保无敏感信息泄露
**Demo:** 执行 deploy.bat 后远程服务可访问 http://172.18.200.47:30002/api/health 返回 200，NSSM 管理自启动

## Must-Haves

- 1. `scripts/deploy.bat` 执行后，`curl -s http://172.18.200.47:30002/api/health` 返回 `{"status":"ok",...}`
- 2. `scripts/install-service.bat` 包含 NSSM 注册、SERVICE_AUTO_START、崩溃重启（5s delay）、日志轮转（10MB/5份）
- 3. `scripts/config/deploy-config.bat.example` 存在且不含真实密码/密钥
- 4. `! grep -rq "sk-\|password\|secret" scripts/config/deploy-config.bat.example` — 模板无真实敏感值
- 5. `.gitignore` 包含 `deploy-config.bat`、`data/`、`logs/`、`.env`、`.env.*`
- 6. `npm test` — 363/363 现有测试无回归
- 7. scripts 目录下所有 .bat 文件使用 chcp 65001 UTF-8 编码

## Proof Level

- This slice proves: operational — 部署脚本和服务注册需要实际在远程服务器验证，但本 slice 证明脚本正确性和配置安全性

## Integration Closure

Upstream surfaces consumed:
- `src/routes/api/health/+server.ts` — 健康检查端点（部署验证目标）
- `src/lib/server/logger.ts` — 日志模块（需要远程 logs/ 目录存在）

New wiring introduced:
- `scripts/deploy.bat` — 主部署入口，串联构建→推送→重启→验证
- `scripts/install-service.bat` — NSSM 服务注册（首次部署使用）
- `scripts/config/deploy-config.bat.example` — 配置模板

What remains: S03 需要 E2E 测试验证部署后的服务 + /release GSD 技能文件

## Verification

- Runtime signals: deploy.bat 输出每阶段状态（构建/推送/重启/健康检查），install-service.bat 输出 NSSM 配置参数
- Inspection surfaces: GET /api/health 返回 status/version/uptime/db；远程 logs/ 目录的 app-YYYY-MM-DD.log + NSSM stdout/stderr 日志
- Failure visibility: deploy.bat 每阶段 errorlevel 检查 + 失败时输出诊断信息；install-service.bat 检查 admin 权限和 NSSM 可用性
- Redaction constraints: deploy-config.bat.example 不得包含真实密码/key；deploy-config.bat 被 .gitignore 排除

## Tasks

- [x] **T01: Create deploy-config.bat.example + update .gitignore for privacy protection** `est:30m`
  Create the deployment configuration template file with placeholder values and update .gitignore to exclude all sensitive paths. This task covers R005 (privacy/secrets protection).
  - Files: `scripts/config/deploy-config.bat.example`, `.gitignore`, `scripts/verify-no-secrets.sh`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/config/deploy-config.bat.example && ! grep -rq 'sk-\|password\|secret' scripts/config/deploy-config.bat.example && grep -q 'deploy-config.bat' .gitignore && grep -q 'data/' .gitignore && grep -q 'logs/' .gitignore

- [x] **T02: Create install-service.bat for NSSM service registration** `est:45m`
  Create the Windows service registration script using NSSM, following the update-hub reference implementation pattern. Covers first-time setup on the remote server.
  - Files: `scripts/install-service.bat`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/install-service.bat && grep -q SERVICE_AUTO_START scripts/install-service.bat && grep -q AppRestartDelay scripts/install-service.bat && grep -q AppRotateFiles scripts/install-service.bat && grep -q 'net session' scripts/install-service.bat

- [x] **T03: Create deploy.bat — build → SCP → NSSM restart → health check** `est:1h`
  Create the main deployment script that orchestrates the full deployment pipeline: local build → SCP push → remote service restart → health check verification. Covers R001 (deploy.bat implementation).
  - Files: `scripts/deploy.bat`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/deploy.bat && grep -q 'npm run build' scripts/deploy.bat && grep -q 'scp' scripts/deploy.bat && grep -q 'nssm restart' scripts/deploy.bat && grep -q 'curl' scripts/deploy.bat && grep -q 'HEALTH_CHECK' scripts/deploy.bat && grep -q 'deploy-config.bat' scripts/deploy.bat

- [x] **T04: Create helper scripts (stop-service, start-service, uninstall-service) + verify all scripts** `est:20m`
  Create supplementary service management scripts and run full verification of the deployment script suite.
  - Files: `scripts/start-service.bat`, `scripts/stop-service.bat`, `scripts/uninstall-service.bat`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/start-service.bat && test -f scripts/stop-service.bat && test -f scripts/uninstall-service.bat && grep -q 'nssm start' scripts/start-service.bat && grep -q 'nssm stop' scripts/stop-service.bat && grep -q 'nssm remove' scripts/uninstall-service.bat && npx vitest run 2>&1 | tail -5

## Files Likely Touched

- scripts/config/deploy-config.bat.example
- .gitignore
- scripts/verify-no-secrets.sh
- scripts/install-service.bat
- scripts/deploy.bat
- scripts/start-service.bat
- scripts/stop-service.bat
- scripts/uninstall-service.bat
