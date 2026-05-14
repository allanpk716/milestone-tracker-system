# S04: 文档更新

**Goal:** 将 README.md 精简到 < 80 行作为导航枢纽，创建独立的 docs/deployment.md 部署指南，更新 docs/architecture.md 和 docs/development-notes.md 以反映 S01-S03 新增的日志系统、健康检查、部署脚本、E2E 测试和 /release 技能
**Demo:** README < 80 行精简导航，独立部署文档 docs/deployment.md 完整可操作

## Must-Haves

- README.md 行数 < 80，包含项目简介、功能特性、快速开始、文档链接导航四大部分
- docs/deployment.md 存在且覆盖：环境要求、配置说明、deploy.bat 使用、NSSM 服务管理、日志查看、故障排查
- docs/architecture.md 新增日志系统（createLogger 工厂、日志分级、文件轮转、密钥脱敏）和健康检查端点章节
- docs/development-notes.md 新增部署相关注意事项（bat 脚本 UTF-8、NSSM 命令、E2E 测试配置）
- 所有文档无密码/key/密钥明文
- 现有 336 单元测试不受影响

## Proof Level

- This slice proves: contract — verification is line-count assertions and section-presence checks, no runtime needed

## Integration Closure

Upstream surfaces consumed: S01 logger module (src/lib/server/logger.ts), health endpoint (src/routes/api/health/+server.ts); S02 deploy.bat, install-service.bat, config/deploy-config.bat.example; S03 E2E test suite (tests/e2e/) and /release skill (.gsd/skills/release/SKILL.md). New wiring: none — this slice is pure documentation. What remains before M002 is truly usable end-to-end: nothing — S04 is the final slice.

## Verification

- None — documentation-only slice with no runtime changes.

## Tasks

- [x] **T01: Create standalone deployment guide docs/deployment.md** `est:45m`
  Create a comprehensive, standalone deployment guide at docs/deployment.md. Must cover: environment prerequisites (Node.js ≥ 18, Windows SSH access, NSSM), configuration (.env + deploy-config.bat.example reference), deploy.bat pipeline steps, NSSM service lifecycle (install/start/stop/restart/uninstall), log file location and rotation (logs/app-YYYY-MM-DD.log, 7-day rotation), health check verification (GET /api/health), E2E test execution (npm run test:e2e), /release skill usage, and a troubleshooting section. All content in Chinese to match existing docs. No secrets or real passwords — use placeholders.
  - Files: `docs/deployment.md`
  - Verify: test -f docs/deployment.md && grep -c '^## ' docs/deployment.md

- [x] **T02: Rewrite README.md to concise navigation hub (< 80 lines)** `est:30m`
  Rewrite README.md from 232 lines to < 80 lines. Keep: project tagline, feature bullets (6 items), quick-start (install → configure → db:migrate → dev/build), documentation link table pointing to docs/architecture.md, docs/development-notes.md, docs/deployment.md, and the original spec doc. Remove: full API overview, data model, project structure tree, CLI usage details, tech stack table — these are already covered in architecture.md. Keep tech stack as a compact one-liner or omit. All content in Chinese to match existing docs.
  - Files: `README.md`
  - Verify: wc -l README.md

- [x] **T03: Update architecture.md and development-notes.md with S01-S03 content** `est:45m`
  Update docs/architecture.md: add '日志系统' section (createLogger factory, numeric level priority, dual stdout+file output, LOG_LEVEL env, 7-day rotation, secret redaction via key-name and value-pattern) and '健康检查' section (GET /api/health endpoint, response format). Update architecture diagram if needed to show logger. Add '部署架构' section referencing deploy.bat and NSSM service management.
  - Files: `docs/architecture.md`, `docs/development-notes.md`
  - Verify: grep -c '^## ' docs/architecture.md && grep -c '^## ' docs/development-notes.md

## Files Likely Touched

- docs/deployment.md
- README.md
- docs/architecture.md
- docs/development-notes.md
