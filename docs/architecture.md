# 架构文档

## 整体架构

Milestone Tracker 是一个典型的 SvelteKit 全栈应用，采用 monorepo 结构，包含 Web 应用和 CLI 工具两个包。

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端                                   │
│  Svelte 5 前端页面          mt-cli (Agent CLI)                   │
│  (浏览器)                   (终端)                               │
└──────┬──────────────────┬───┴────────────────────────────────────┘
       │ Cookie 认证       │ Bearer Token 认证
       ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   hooks.server.ts (认证中间件)                    │
│   ┌──────────────────────────────────────────────────────┐       │
│   │  checkAuth() → 签名Cookie 或 Bearer Token 校验       │       │
│   └──────────────────────────────────────────────────────┘       │
└──────┬──────────────────┬───────────────────────────────────────┘
       │ 页面路由          │ API 路由
       ▼                  ▼
┌──────────────┐   ┌────────────────────────────────────┐
│ SvelteKit    │   │ REST API (+server.ts)               │
│ 页面渲染     │   │  ├─ milestones/                     │
│ +page.svelte │   │  ├─ modules/                        │
│ +page.server │   │  ├─ tasks/                          │
│              │   │  └─ auth/                           │
└──────────────┘   └──────┬─────────────────────────────┘
                          │
                   ┌──────┴──────────────────────┐
                   │  Service 层                  │
                   │  ├─ milestone-service.ts     │
                   │  ├─ module-service.ts        │
                   │  ├─ task-service.ts          │
                   │  ├─ decompose-service.ts     │
                   │  ├─ compare-service.ts       │
                   │  ├─ confirm-service.ts       │
                   │  └─ llm-client.ts            │
                   └──────┬──────────────────────┘
                          │
                   ┌──────┴──────────────────────┐
                   │  数据层                      │
                   │  Drizzle ORM + better-sqlite3│
                   │  (data/tracker.db, WAL模式)  │
                   └─────────────────────────────┘
```

## 认证架构

系统支持双通道认证，在 hooks.server.ts 中统一处理。

### Web 端 — 签名会话 Cookie

1. 用户提交密码，通过 POST /api/auth/login 验证 ADMIN_PASSWORD
2. 服务端生成 randomBytes(32) 随机 token
3. 用 HMAC-SHA256（密钥从 ADMIN_PASSWORD 派生）签名 token
4. 返回 mt_session={token}.{signature} HttpOnly Cookie（24h 有效期）
5. 后续请求由 hooks.server.ts 中的 checkAuth() 验证签名和时间戳

### Agent 端 — Bearer Token

1. .env 中配置 API_KEYS=mt_key_for_agent_1,mt_key_for_agent_2
2. Agent 请求时带 Authorization: Bearer <key>
3. 服务端用 timingSafeEqual 对比（先校验长度再比较内容）
4. CLI 优先从 MT_API_KEY 环境变量、.mt-env 文件、或配置文件 key 字段获取密钥

### 路由规则

| 路由类型 | 未认证行为 |
|----------|-----------|
| /login, /api/auth/* | 直接放行 |
| /api/* | 返回 401 JSON |
| 其他页面 | 302 重定向到 /login |

## 数据库设计

### Schema 概览

数据库文件：data/tracker.db（SQLite，WAL 模式，外键约束启用）

**milestones 表：**
- id TEXT PK — 格式 MS-{seq}（如 MS-1）
- title TEXT NOT NULL — 里程碑标题
- source_md TEXT — 导入的原始需求 Markdown
- git_url TEXT — 项目 git 仓库地址
- status TEXT — draft | in-progress | completed | archived
- created_at INT — Unix timestamp

**modules 表：**
- id TEXT PK — 格式 MOD-{ms_seq}-{seq}（如 MOD-1-1）
- milestone_id TEXT FK → milestones.id（CASCADE 删除）
- name TEXT NOT NULL — 模块名称
- description TEXT — 模块描述
- status TEXT — draft | in-progress | completed
- sort_order INT — 排序权重

**tasks 表：**
- id TEXT PK — 格式 TASK-{global_seq}（如 TASK-42）
- short_id INT UNIQUE — 全局自增数字，用于 #N 引用
- module_id TEXT FK → modules.id（CASCADE 删除）
- title TEXT NOT NULL — 任务标题
- description TEXT — 任务描述，支持 #N 引用
- references TEXT — JSON 或文本引用
- status TEXT — todo | in-progress | blocked | review | done | skipped
- assignee TEXT — 领取者标识
- sub_total / sub_done INT — Agent 子任务进度
- progress_message TEXT — 最近进度消息
- commit_hash TEXT — Agent 提交的 commit hash
- created_at / updated_at / reported_at INT — 时间戳

### 关键设计决策

- **人类可读 ID**：使用 MS-1、MOD-1-1、TASK-42 格式，而非 UUID
- **short_id**：全局自增数字，便于 #42 引用，在 description 和 progress_message 中使用
- **级联删除**：删除里程碑自动删除其下所有模块和任务
- **索引**：status 字段、外键字段、short_id 均有索引

### Drizzle ORM 使用注意

- Schema 定义在 src/lib/db/schema.ts，Zod 验证在 src/lib/schemas/ 下
- 状态枚举由 DB schema 导出（单一数据源），Zod schema 引用这些枚举
- TypeScript 类型通过 z.infer 从 Zod schema 推导，统一从 src/lib/types.ts 导出
- references 是 SQLite 保留字，Drizzle 通过查询构建器自动引用，但原生 SQL 需手动加引号

## LLM 集成架构

### 拆解流程 (Decompose)

1. 用户导入需求 Markdown 并点击「拆解」
2. 前端调用 POST /api/milestones/:id/decompose
3. 后端校验里程碑存在、有 sourceMd、status=draft
4. decompose-service.ts 将 sourceMd 发送给 LLM（系统 prompt 要求 JSON 数组输出）
5. llm-client.ts 流式消费 OpenAI 兼容 SSE，yield content delta
6. decompose-service.ts 增量解析 JSON 数组——遇到 } 且栈深度=1 时提取模块
7. 每个 module 经 Zod schema 校验后，以 SSE event (type: module) 推送给前端
8. 前端 DecomposeStream 组件实时展示，DecomposeEditor 允许用户编辑

### 确认流程 (Confirm)

1. 用户编辑完拆解结果后点击「确认」
2. 前端调用 POST /api/milestones/:id/confirm，发送编辑后的 modules/tasks
3. confirm-service.ts 预生成所有 ID（异步阶段），然后开启 better-sqlite3 事务（同步）
4. 事务内：更新 milestone 状态 → 批量插入 modules → 批量插入 tasks

### 需求对比 (Compare)

1. 用户点击「对比」
2. compare-service.ts 将 sourceMd + 已确认的 modules/tasks 发送给 LLM
3. LLM 输出纯文本建议（遗漏/优化/拆分建议 + 覆盖度评分）
4. 通过 SSE 流式推送到前端 CompareSuggestions 组件

### LLM Client

- 基于 fetch 的零依赖实现，不依赖 OpenAI SDK
- 支持 OpenAI 兼容 API（通过 LLM_BASE_URL 可配置其他供应商）
- 30 秒超时（可配置）
- 流式解析 SSE data: 行，yield content delta
- **安全**：API Key 不出现在日志和 SSE 响应中

### SSE 传输

- 使用 ReadableStream + TextEncoder 构造标准 SSE 响应
- 事件格式：event: <type>
data: <json>


- 客户端用自定义 PostSseClient 消费（因标准 EventSource 不支持 POST）

## 前端架构

### 路由布局

- +layout.svelte（root）— 全局布局
- (app)/+layout.svelte — 认证后的应用布局（导航栏等）
- (app)/+page.svelte — 里程碑列表
- (app)/milestones/create/ — 新建里程碑
- (app)/milestones/[id]/ — 里程碑详情（模块/任务列表）
- (app)/milestones/[id]/kanban/ — 看板视图
- (app)/milestones/[id]/preview/ — LLM 拆解预览与编辑
- login/+page.svelte — 登录页（在 (app) 组之外，未认证可访问）

### 组件说明

| 组件 | 用途 |
|------|------|
| MilestoneCard | 里程碑列表卡片 |
| StatusBadge | 状态标签（不同颜色对应不同状态） |
| ModuleSection | 模块区域（含任务列表） |
| TaskCard | 任务卡片 |
| TaskContextMenu | 任务右键菜单（领取、完成等操作） |
| TaskEditModal | 任务编辑弹窗 |
| TaskRefChip | #N 任务引用芯片 |
| KanbanModuleCard | 看板视图中的模块卡片 |
| KanbanTaskCard | 看板视图中的任务卡片 |
| DecomposeStream | LLM 拆解流式展示组件 |
| DecomposeEditor | 拆解结果编辑器（增删改模块/任务） |
| CompareSuggestions | LLM 对比建议展示 |
| MdViewer | Markdown 渲染查看器 |
| Toast | 全局消息通知 |

### 状态管理

使用 Svelte 5 Runes 进行响应式状态管理：

| Store | 文件 | 用途 |
|-------|------|------|
| decompose-state | stores/decompose-state.svelte.ts | 拆解预览中的模块/任务编辑状态（跨页面持久化） |
| kanban-state | stores/kanban-state.svelte.ts | 看板拖拽状态管理 |
| toast | stores/toast.ts | 全局消息通知 |

## CLI 工具架构

CLI 位于 packages/cli/，是独立的 npm 包。

### 配置解析优先级

配置文件：
1. --config <path> 显式指定
2. ./.mt-cli.json 当前目录
3. ~/.mt-cli.json 用户主目录

API Key：
1. MT_API_KEY 环境变量
2. .mt-env 文件（当前目录）
3. 配置文件中的 key 字段

### 命令结构

- mt-cli status — 查看里程碑状态
- mt-cli tasks list — 列出任务
- mt-cli tasks claim <id> [--agent] — 领取任务
- mt-cli tasks progress <id> -m <msg> — 上报进度
- mt-cli tasks complete <id> — 标记完成
- mt-cli tasks show <id> — 查看任务详情
- mt-cli tasks mine — 查看自己领取的任务

### 并发控制

CLI 内置并发锁机制，防止多个 Agent 同时操作同一任务。锁文件位于系统临时目录，默认超时 5 秒，--force 参数可跳过锁检查。

## 构建与部署

### adapter-node

项目使用 @sveltejs/adapter-node（不是 adapter-static），因为需要服务端 API 路由。构建产物是 Node.js 服务：

    npm run build    # 输出到 build/
    node build       # 启动服务，读取 .env 配置

### Tailwind CSS 4

使用 @tailwindcss/vite Vite 插件，无需 tailwind.config 文件。样式入口在 src/app.css：

    @import "tailwindcss";
