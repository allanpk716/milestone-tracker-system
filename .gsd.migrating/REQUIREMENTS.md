# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

Guidelines:
- Keep requirements capability-oriented, not a giant feature wishlist.
- Requirements should be atomic, testable, and stated in plain language.
- Every **Active** requirement should be mapped to a slice, deferred, blocked with reason, or moved out of scope.
- Each requirement should have one accountable primary owner and may have supporting slices.
- Research may suggest requirements, but research does not silently make them binding.
- Validation means the requirement was actually proven by completed work and verification, not just discussed.

## Active

### R001 — 里程碑创建与管理
- Class: core-capability
- Status: active
- Description: 创建里程碑（上传 MD + 绑定 git 仓库地址）、总览列表、多里程碑可同时 active、状态流转（draft → active → completed）
- Why it matters: 这是整个系统的入口，没有里程碑就没有后续一切
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: mapped
- Notes: 支持 MD 富文本预览，至少 5 万字不卡顿

### R002 — LLM 流式拆解任务
- Class: core-capability
- Status: active
- Description: 调用 OpenAI 兼容 API 分析 MD 内容，通过 SSE 逐模块流式返回拆解结果（模块 + 任务列表）
- Why it matters: 核心自动化能力，将需求文档转化为可分配的任务
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: mapped
- Notes: Zod 校验 LLM 输出格式；LLM 不可用时允许完全手动创建

### R003 — 拆解预览与编辑
- Class: primary-user-loop
- Status: active
- Description: 左右分栏（MD 富文本 + 目录导航 | 拆解结果编辑），支持勾选/取消模块和任务、内联编辑标题和描述、手动追加模块和任务、调整分组
- Why it matters: 用户必须能审查和修正 LLM 的拆解结果，这是人机协作的关键界面
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: mapped
- Notes: 两侧独立滚动，MD 顶部固定目录导航

### R004 — 拆解后 LLM 对比建议
- Class: core-capability
- Status: active
- Description: 用户确认拆解后，LLM 将最终结果与原始里程碑目标对比，流式输出差异和建议（参考性，不阻塞）
- Why it matters: 帮助用户发现拆解遗漏或偏差，提升拆解质量
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: mapped
- Notes: 建议性的，用户可以忽略继续

### R005 — 看板视图与管理员操作
- Class: primary-user-loop
- Status: active
- Description: 模块卡片列表，折叠显示进度条/百分比/Agent/子里程碑数值，展开显示任务详情卡片。右键菜单提供 UAT 通过/不通过、确认合并、强制释放、重新打开、取消、暂停/恢复、编辑任务
- Why it matters: 管理员日常使用的主界面，需要一目了然地看到全局进度
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: mapped
- Notes: 右键菜单项根据任务状态动态禁用

### R006 — CLI 工具（Agent 端）
- Class: core-capability
- Status: active
- Description: mt-cli 全命令：list/claim/progress/complete/show/mine/status，配置随项目走（.mt-cli.json），API Key 通过环境变量注入
- Why it matters: Agent 与系统交互的唯一接口，配置必须零摩擦
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: mapped
- Notes: 所有输出中文，错误提示对 LLM 友好（自然语言指导下一步）

### R007 — 任务引用解析
- Class: core-capability
- Status: active
- Description: Web 任务详情和 CLI show 命令都自动解析 #N 引用，附带被引用任务摘要
- Why it matters: 任务间依赖关系的可视化，帮助 Agent 和管理员理解上下文
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S05
- Validation: mapped
- Notes: 引用不存在时显示为「#N (引用的任务不存在)」，不阻塞

### R008 — 管理员登录认证
- Class: compliance/security
- Status: active
- Description: .env 配置固定密码，Web 端登录页，cookie-based session（HttpOnly，签名），API 同时支持 cookie 和 Bearer Token
- Why it matters: 防止未授权访问管理员操作
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: mapped
- Notes: 单管理员角色，MVP 不做多用户

### R009 — 并发控制（乐观锁）
- Class: quality-attribute
- Status: active
- Description: claim 操作使用乐观锁，仅 status=open 时成功，否则返回 409 Conflict。Agent 友好的中文错误提示
- Why it matters: 多 Agent 同时抢同一任务时保证数据正确性
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S01
- Validation: mapped
- Notes: CLI 输出自然语言指导 Agent 下一步操作

### R010 — 僵尸任务高亮
- Class: failure-visibility
- Status: active
- Description: 超过 24h 未更新的 claimed/in-progress 任务在看板上高亮警告
- Why it matters: 快速发现卡住的任务，及时干预
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: mapped
- Notes: 超时时间可配置

### R011 — 全中文界面
- Class: constraint
- Status: active
- Description: Web UI 和 CLI 输出均为中文
- Why it matters: 用户沟通语言为中文，界面必须一致
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S04
- Validation: mapped
- Notes: 仅界面文案中文，代码和变量名英文

### R018 — 部署脚本与远程服务注册
- Class: core-capability
- Status: active
- Description: 部署脚本（deploy.bat）实现本地构建 → SCP 全量推送 build/ + node_modules/ → NSSM 重启 MilestoneTracker 服务 → 健康检查验证。远程服务：Windows Server 2019，SSH update-hub 别名，端口 30002，路径 C:\WorkSpace\milestone-tracker，服务名 MilestoneTracker，NSSM 管理自启动 + 崩溃重启 + 日志轮转
- Why it matters: 项目需要从本地开发走向可部署运行，需要可重复的部署流程替代手动操作
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: 参考 update-hub 的 NSSM 部署模式

### R019 — 结构化日志系统
- Class: quality-attribute
- Status: active
- Description: 替换现有 10 处 console.info/warn，实现轻量级自定义 logger（零外部依赖）。分级 debug/info/warn/error，带时间戳、模块标记，同时写 stdout 和文件（logs/app-YYYY-MM-DD.log），日志级别通过 .env LOG_LEVEL 控制，文件自动轮转保留 7 天
- Why it matters: 帮助开发者和管理员排查问题，为自动化测试提供可追踪的请求链路
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: 关键模块：请求进出、LLM 调用、状态变更、错误堆栈

### R020 — 健康检查端点
- Class: operability
- Status: active
- Description: GET /api/health 公开端点（不需认证），返回 status、version、uptime、db 连接状态
- Why it matters: 部署验证和监控的基础设施，E2E 测试的前置依赖
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: 不需认证，供部署后自动验证

### R021 — E2E 自动化测试
- Class: quality-attribute
- Status: active
- Description: 部署后对真实服务执行 E2E 验证（Vitest + node-fetch），覆盖健康检查、登录、API 认证、核心业务流
- Why it matters: 确保部署后的服务真正可用，自动化验证替代手动检查
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: 测试目标包含健康检查、登录、API 认证、创建里程碑→拆解→确认→激活完整链路

### R022 — 隐私保护（git 提交无敏感信息）
- Class: compliance/security
- Status: active
- Description: git 提交中无密码/key/密钥。配置文件用 .example 模板 + .gitignore 排除真实配置。部署脚本从本地配置文件读取敏感信息
- Why it matters: 防止隐私泄露，项目可能在公开仓库中共享
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: 确保 data/、logs/、.env、deploy-config.bat 均被 gitignore

### R023 — GSD /release 技能文件
- Class: operability
- Status: active
- Description: 创建 GSD 技能文件让 /release 斜杠命令触发构建 + 部署流程：验证 git 工作区干净 → 执行部署脚本 → 验证健康检查 → 报告结果
- Why it matters: 通过 GSD 斜杠命令一键部署，降低操作门槛
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: 技能文件放在 .gsd/skills/release/

### R024 — 文档更新（README + 部署文档）
- Class: operability
- Status: active
- Description: README 精简（< 80 行）：项目简介 + 功能特性 + 快速开始 + 文档链接导航。独立部署文档 docs/deployment.md（从零部署完整指南）。更新已有开发笔记和架构文档
- Why it matters: 文档是项目可用性的关键部分，README 精简保持可读性，独立文档保证完整性
- Source: user
- Primary owning slice: M002/S04
- Supporting slices: none
- Validation: unmapped
- Notes: README 不堆砌内容，更多指向外部文档

## Validated

## Deferred

### R012 — 数据导出
- Class: admin/support
- Status: deferred
- Description: 导出当前里程碑的任务列表为 Markdown/JSON
- Why it matters: 方便在其他工具中使用数据
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: 用户明确 MVP 不做

### R013 — 多管理员 / 用户系统
- Class: admin/support
- Status: deferred
- Description: 支持多个管理员账号，用户名+密码登录
- Why it matters: 团队协作场景需要
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: MVP 单管理员固定密码

### R014 — Webhook 通知
- Class: integration
- Status: deferred
- Description: Agent 订阅新任务通知，或外部系统集成
- Why it matters: 提升自动化程度
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: 远期扩展点

### R015 — npm 发布 CLI
- Class: operability
- Status: deferred
- Description: mt-cli 发布到 npm，支持 npm install -g mt-cli
- Why it matters: 方便分发和版本管理
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: MVP 用 npm link 本地开发

## Out of Scope

### R016 — 看板拖拽排序
- Class: differentiator
- Status: out-of-scope
- Description: 拖拽调整模块或任务顺序
- Why it matters: MVP 不需要，避免引入 DnD 库的复杂度
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: 文档明确排除

### R017 — commit_hash 强制校验
- Class: quality-attribute
- Status: out-of-scope
- Description: 强制 Agent 提交 commit_hash 并验证
- Why it matters: MVP 靠 UAT 退回机制保证质量，commit_hash 仅预留字段
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Task 表预留 commit_hash 字段

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | active | M001/S01 | none | mapped |
| R002 | core-capability | active | M001/S02 | none | mapped |
| R003 | primary-user-loop | active | M001/S03 | none | mapped |
| R004 | core-capability | active | M001/S03 | none | mapped |
| R005 | primary-user-loop | active | M001/S04 | none | mapped |
| R006 | core-capability | active | M001/S05 | none | mapped |
| R007 | core-capability | active | M001/S04 | M001/S05 | mapped |
| R008 | compliance/security | active | M001/S01 | none | mapped |
| R009 | quality-attribute | active | M001/S05 | M001/S01 | mapped |
| R010 | failure-visibility | active | M001/S04 | none | mapped |
| R011 | constraint | active | M001/S05 | M001/S04 | mapped |
| R018 | core-capability | active | M002/S02 | none | unmapped |
| R019 | quality-attribute | active | M002/S01 | none | unmapped |
| R020 | operability | active | M002/S01 | none | unmapped |
| R021 | quality-attribute | active | M002/S03 | none | unmapped |
| R022 | compliance/security | active | M002/S02 | none | unmapped |
| R023 | operability | active | M002/S03 | none | unmapped |
| R024 | operability | active | M002/S04 | none | unmapped |
| R012 | admin/support | deferred | none | none | unmapped |
| R013 | admin/support | deferred | none | none | unmapped |
| R014 | integration | deferred | none | none | unmapped |
| R015 | operability | deferred | none | none | unmapped |
| R016 | differentiator | out-of-scope | none | none | n/a |
| R017 | quality-attribute | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 18 (M001: 11, M002: 7)
- Mapped to slices: 18
- Validated: 0
- Unmapped active requirements: 0
