# M001: MVP 核心功能

**Vision:** 里程碑进度追踪中枢的 MVP 版本。管理员通过 Web 导入需求文档，LLM 拆解为模块和任务，AI Agent 通过 CLI 领取和上报进度，Web 看板实时展示全局状态。包含三个独立交付物：SvelteKit Web 应用（含 REST API）、mt-cli 命令行工具、SQLite 数据库。

## Success Criteria

- 完整生命周期（导入→拆解→激活→领取→进度→完成→UAT→合并→done）可端到端跑通
- CLI 和 Web 共用 API，认证各自独立（cookie / Bearer Token）
- 多 Agent 并发 claim 不会数据错乱
- npm run build 无错误，无 TODO/placeholder
- 5 万字 MD 导入不卡顿，看板 50 个任务渲染流畅
- 所有错误场景有明确中文提示（CLI）或 toast（Web）

## Slices

- [x] **S01: S01** `risk:high` `depends:[]`
  > After this: SvelteKit 跑起来、DB 建表（WAL 模式）、Zod Schema 全量定义、管理员登录页、里程碑 CRUD API 全通、总览列表页可访问

- [x] **S02: S02** `risk:high` `depends:[]`
  > After this: 在里程碑详情页点击拆解 → 后端调用 OpenAI 兼容 API → SSE 逐模块流式返回 → 前端逐卡片渲染。Zod 校验失败时已收到的模块保留，提示重试

- [x] **S03: S03** `risk:medium` `depends:[]`
  > After this: 左右分栏页面：左侧 MD 富文本（目录导航），右侧拆解结果卡片。可勾选/取消、编辑标题描述、追加模块和任务。确认后 LLM 对比建议（参考性），然后写入 DB 激活里程碑

- [x] **S04: S04** `risk:medium` `depends:[]`
  > After this: 看板页面：模块卡片折叠显示进度条/百分比/Agent/子里程碑数值，展开显示任务详情卡片。右键菜单提供全部管理员操作。僵尸任务（>24h）高亮。任务引用 #N 自动展开

- [x] **S05: S05** `risk:medium` `depends:[]`
  > After this: mt-cli 全命令可用：list/claim/progress/complete/show/mine/status。配置随项目走。claim 并发测试通过（两 Agent 抢同一任务，一个 409）。所有输出中文，错误提示对 Agent 友好

- [x] **S06: S06** `risk:low` `depends:[]`
  > After this: 完整闭环跑通：导入 MD → LLM 拆解 → 预览编辑 → 对比建议 → 激活 → CLI claim → progress → complete → Web UAT 通过 → 合并 → done。npm run build 无错误

## Boundary Map

### S01 → S02\nProduces:\n- 数据库表结构（Milestone/Module/Task）\n- Zod Schema（全量 API 入参出参）\n- 认证中间件（cookie + Bearer Token）\n- 里程碑 CRUD API\n\nConsumes:\n- nothing（第一个 slice）\n\n### S01 → S04\nProduces:\n- 任务 CRUD API（GET/PATCH）\n- 管理员操作 API（action: uat-pass/merge/cancel/halt 等）\n- 模块 API\n\nConsumes:\n- nothing（S04 仅依赖 S01 的 API 和 DB 层）\n\n### S01 → S05\nProduces:\n- 任务操作 API（claim/progress/complete）\n- 任务查询 API（list/show）\n- 认证机制（Bearer Token）\n\nConsumes:\n- nothing（S05 仅依赖 S01 的 API 层）\n\n### S02 → S03\nProduces:\n- LLM 拆解 API（POST /api/milestones/:id/decompose，SSE 流式）\n- LLM provider 配置和调用逻辑\n\nConsumes:\n- S01 的里程碑数据、Zod Schema\n\n### S03 → S06\nProduces:\n- 拆解预览编辑页面（左右分栏）\n- 拆解确认写入逻辑（分配 short_id、写入 DB、激活里程碑）\n- LLM 对比建议 API\n\nConsumes:\n- S01 的 DB 和 API 层\n- S02 的 LLM 拆解 API\n\n### S04 → S06\nProduces:\n- 看板视图页面（模块卡片、右键菜单）\n- 管理员操作 UI\n- 僵尸任务高亮\n- 任务引用解析 UI\n\nConsumes:\n- S01 的任务/模块 API\n\n### S05 → S06\nProduces:\n- mt-cli 全命令\n- 并发 claim 验证\n\nConsumes:\n- S01 的任务操作 API
