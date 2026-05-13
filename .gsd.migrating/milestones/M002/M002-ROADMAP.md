# M002: 部署、日志与自动化测试

**Vision:** 为里程碑追踪系统增加自部署能力（/release 斜杠命令）、结构化日志系统、E2E 自动化测试基础和配套文档体系，让项目从本地开发走向可部署运行。

## Success Criteria

- 执行 /release 或 deploy.bat 后 http://172.18.200.47:30002/api/health 返回 status:ok
- E2E 测试对真实部署服务全部通过
- git 提交中无密码/key/密钥（扫描验证）
- 服务重启后自动恢复（NSSM SERVICE_AUTO_START）
- 现有 336 测试不受影响

## Slices

- [ ] **S01: 结构化日志 + 健康检查** `risk:medium` `depends:[]`
  > After this: 所有日志分级写入文件（logs/app-YYYY-MM-DD.log），GET /api/health 返回服务状态

- [ ] **S02: 部署脚本 + 服务注册 + 隐私保护** `risk:high` `depends:[S01]`
  > After this: 执行 deploy.bat 后远程服务可访问 http://172.18.200.47:30002/api/health 返回 200，NSSM 管理自启动

- [ ] **S03: E2E 自动化测试 + /release 技能** `risk:medium` `depends:[S02]`
  > After this: 部署后 E2E 测试脚本全部通过（健康检查/登录/API认证/核心业务流），/release 命令可用

- [ ] **S04: 文档更新** `risk:low` `depends:[S03]`
  > After this: README < 80 行精简导航，独立部署文档 docs/deployment.md 完整可操作

## Boundary Map

### S01 → S02

Produces:
- `src/lib/server/logger.ts` — 结构化日志模块（createLogger 工厂函数）
- `GET /api/health` — 健康检查端点
- `src/routes/api/health/+server.ts` — 健康检查路由

Consumes:
- nothing（第一个 slice）

### S02 → S03

Produces:
- `scripts/deploy.bat` — 部署脚本
- `scripts/install-service.bat` — 服务注册脚本
- `scripts/config/deploy-config.bat.example` — 配置模板
- 远程运行中的 MilestoneTracker 服务（http://172.18.200.47:30002）

Consumes:
- S01 的健康检查端点（部署后验证）
- S01 的日志模块（部署脚本日志依赖）

### S03 → S04

Produces:
- `tests/e2e/` — E2E 测试脚本
- `.gsd/skills/release/SKILL.md` — GSD 技能文件

Consumes:
- S02 的远程服务（E2E 测试目标）
- S01 的健康检查端点（测试断言）

### S04

Produces:
- `README.md` — 精简版 README
- `docs/deployment.md` — 独立部署文档
- 更新的 `docs/architecture.md` 和 `docs/development-notes.md`

Consumes:
- S01-S03 的所有产出（文档需要描述实际实现）
