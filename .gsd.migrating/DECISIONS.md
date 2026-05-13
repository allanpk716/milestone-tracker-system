# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |
|---|------|-------|----------|--------|-----------|------------|---------|
| D001 |  | architecture | API 路由架构 | SvelteKit server routes 作为 API 层，不搞独立 API 服务 | Web 和 CLI 共用同一套 API，DB/认证/Zod schema 只写一份，部署简单（一个进程），SvelteKit 原生支持 ReadableStream 做 SSE | Yes | collaborative |
| D002 |  | architecture | Web 端认证机制 | Cookie-based session（HttpOnly，签名），单管理员固定密码（.env 配置） | MVP 只有一个管理员角色，固定密码够用，cookie session 比 JWT 简单且更安全。API 同时支持 cookie（Web）和 Bearer Token（CLI）两种认证方式 | Yes | collaborative |
| D003 |  | architecture | LLM 拆解交互模式 | SSE 流式返回，逐模块推送 | LLM 拆解可能耗时较长（几秒到十几秒），流式让用户不用干等，逐模块渲染改善体验。SvelteKit +server.ts 原生支持 ReadableStream。用户明确要求流式而非同步等待 | Yes | human |
| D004 |  | architecture | 看板布局方式 | 模块卡片列表（非 Trello 式按状态分列），折叠/展开，右键菜单 | 用户明确要求按模块组织视图，折叠态显示进度概要（百分比+Agent+子里程碑数值），展开显示任务详情。右键菜单根据状态动态禁用。不按状态分列因为一个模块下任务状态各异 | Yes | collaborative |
| D005 |  | architecture | 拆解预览布局 | 左右分栏，左侧 MD 富文本（含顶部固定目录导航），右侧拆解结果编辑 | 用户需要同时看原始需求和拆解结果来对比和编辑。两侧独立滚动，MD 顶部固定目录方便快速定位长文档 | Yes | collaborative |
| D006 |  | architecture | CLI 分发方式 | npm link 本地开发，不发 npm | MVP 阶段自用，不需要公开分发。避免发包流程增加复杂度 | Yes | human |
| D007 |  | architecture | 数据库迁移策略 | Drizzle Kit push 模式，直接推 schema 变更 | 开发阶段 schema 变化频繁，push 模式简单直接，不需要管理迁移文件 | Yes | agent |
| D008 |  | deployment | 部署模式选择 | 全量推送（本地构建 → SCP build/ + node_modules/ → 远程执行） | 远程已有 Node.js 22.14.0，不需要构建工具链。全量推送保证依赖完整，避免远程 npm install 的网络/平台问题。参考 update-hub 的 SCP + NSSM 模式。 | Yes | collaborative |
| D009 |  | observability | 结构化日志方案 | 自实现轻量级日志模块（零外部依赖），分级 + 文件轮转 | 项目依赖极简（仅 better-sqlite3 + drizzle + zod + marked + dotenv），不引入 pino/winston。自实现满足需求且代码量小。 | Yes | agent |
| D010 |  | security | 部署配置隐私保护策略 | deploy-config.bat.example 模板 + gitignore 排除真实配置 | 参考 update-hub 的 release-config.bat 模式，成熟可靠。确保 git 历史中永远不含密码/key。 | Yes | collaborative |
