# M003: AI Agent 可用性增强

**Vision:** 将 mt-cli 从"勉强可用"升级为"生产级 AI Agent 标准任务回报接口"。补齐 --json 结构化输出、block/unblock 遇阻上报、complete 验证证据、modules 模块视图四大核心能力，并参照 github-sync 架构模式实现 GSD2 原生 extension 集成。

## Success Criteria

- 所有 CLI 命令 --json 输出有效 JSON（成功和错误路径）
- block/unblock API + CLI 状态流转正确，Web 看板显示阻塞状态
- complete --evidence --files-touched 数据正确存储返回
- modules list/show 消费已有 API 正常工作
- E2E 测试覆盖完整 Agent 生命周期 + 错误场景
- GSD2 extension 可安装，/mt-cli bootstrap 验证连通性，auto-mode 自动同步
- 全量测试套件 npm test + npm run test:e2e 通过

## Slices

- [x] **S01: S01** `risk:high` `depends:[]`
  > After this: 所有 CLI 命令（list, show, mine, claim, progress, complete, status）加 --json 标志，输出可被机器解析的 JSON。AI Agent 能可靠读取任务列表、详情、操作结果。

- [x] **S02: S02** `risk:high` `depends:[]`
  > After this: Agent 遇到障碍时通过 mt-cli tasks block <id> --reason '缺少 OAuth 配置' --json 结构化上报。管理员在 Web 端看到阻塞状态。解除阻塞后 Agent 继续工作。

- [x] **S03: S03** `risk:medium` `depends:[]`
  > After this: Agent 完成任务时提交验证证据（mt-cli tasks complete <id> --evidence '[{command: npm test, exitCode: 0, verdict: pass}]' --files-touched '[src/api/auth.ts]' --json）。Agent 能查看模块级视图（mt-cli modules list --json）。

- [x] **S04: S04** `risk:medium` `depends:[]`
  > After this: 模拟完整第三方 AI Agent 生命周期全部通过：发现(list --json) → 领取(claim) → 进度(progress) → 阻塞(block + reason) → 解除(unblock) → 完成(complete --evidence --files-touched)。错误场景也覆盖。

- [x] **S05: S05** `risk:medium` `depends:[]`
  > After this: GSD2 安装 mt-cli extension 后，/mt-cli bootstrap 一键验证连通性。auto-mode 执行任务时自动通过 extension 同步状态到 Milestone Tracker（claim、progress、block、complete），非阻塞、幂等。

## Boundary Map

### S01 → S02

Produces:
- 所有命令的 --json 输出分支模式（action 函数内的 if (opts.json) 分支）
- JSON 错误输出格式约定 { error, code, details? }

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- --json 输出模式（同上）

Consumes:
- nothing (first slice)

### S02 → S04

Produces:
- POST /api/tasks/[id]/block 和 /unblock API 端点
- blockTask/unblockTask service 函数
- CLI block/unblock 命令（含 --json）

Consumes:
- S01 的 --json 输出模式

### S03 → S04

Produces:
- complete 命令扩展（--evidence, --files-touched）
- DB schema 新增 evidence_json 和 files_touched 列
- modules list/show CLI 命令（含 --json）

Consumes:
- S01 的 --json 输出模式
- 已有的 /api/milestones/[id]/modules 和 /api/modules/[id] API 端点

### S04 → S05

Produces:
- E2E 测试框架和模拟数据
- 验证所有 API 端点在真实环境中工作

Consumes:
- S01 的 --json 输出
- S02 的 block/unblock API
- S03 的 complete 扩展和 modules 命令

### S05 (GSD2 Extension)

Produces:
- ~/.gsd/agent/extensions/mt-cli/ extension 文件
- /mt-cli slash 命令（bootstrap/status）
- auto-post-unit 钩子中的任务状态同步
- .gsd/mt-sync.json mapping 持久化
- 安装配置文档

Consumes:
- S01-S04 的所有 CLI 命令（通过 execFileSync 调用 mt-cli）
- GSD2 内部文件结构（.gsd/milestones/ 路径解析）
