# Milestone Tracker — 里程碑进度追踪系统

一个轻量级的里程碑进度追踪中枢，用于管理项目里程碑的模块拆解、任务分配和进度追踪。

**系统定位：** 不参与实际开发，只管三件事——里程碑里拆出了什么模块和任务、谁领了什么任务、任务执行到什么程度。实际开发由 GSD-2 / Claude Code / Codex 等 AI Agent 完成，Agent 通过 CLI 上报进度。

## 功能特性

- **里程碑管理** — 创建、导入原始需求文档、状态流转（draft → in-progress → completed → archived）
- **LLM 辅助拆解** — 调用 OpenAI 兼容的 LLM API，将需求文档自动拆解为模块和任务，支持流式预览和编辑
- **需求对比** — LLM 对比原始需求与拆解结果，给出遗漏/优化建议
- **看板视图** — 按任务状态分列展示，支持拖拽排序、任务编辑和上下文操作
- **Agent CLI** — 命令行工具供 AI Agent 领取任务、上报进度、标记完成
- **双认证模式** — Web 端使用密码登录 + 签名 Cookie，Agent 端使用 Bearer API Key

## 文档

- [架构文档](docs/architecture.md) — 系统架构、认证机制、数据库设计、LLM 集成、前端组件和 CLI 架构的详细说明
- [开发注意事项](docs/development-notes.md) — 数据库事务、认证、SvelteKit 配置、LLM 集成等方面的踩坑记录和关键注意事项
- [系统定义文档](docs/设计输入、需求文档/milestone-tracker-system-spec-2026-05-12.md) — 原始需求和设计规格说明

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | SvelteKit 2 + Svelte 5 (Runes) |
| 样式 | Tailwind CSS 4 (`@tailwindcss/vite` 插件) |
| 数据库 | SQLite (better-sqlite3) + Drizzle ORM |
| LLM 集成 | OpenAI 兼容 API，流式 SSE 输出 |
| 认证 | HMAC-SHA256 签名会话 + Bearer Token |
| 构建 | Vite 6 + adapter-node |
| 测试 | Vitest |
| CLI | Commander.js (独立包 `packages/cli`) |

## 项目结构

```
milestone-tracker/
├── src/
│   ├── hooks.server.ts              # 全局认证中间件
│   ├── lib/
│   │   ├── db/schema.ts             # Drizzle ORM 数据库 Schema
│   │   ├── schemas/                 # Zod 验证 Schema
│   │   ├── types.ts                 # TypeScript 类型导出
│   │   ├── server/
│   │   │   ├── auth.ts              # 认证逻辑（会话、Bearer Token）
│   │   │   ├── llm-client.ts        # OpenAI 兼容 LLM 流式客户端
│   │   │   ├── decompose-service.ts # LLM 拆解服务
│   │   │   ├── compare-service.ts   # LLM 需求对比服务
│   │   │   ├── confirm-service.ts   # 确认拆解结果并写入 DB
│   │   │   ├── milestone-service.ts # 里程碑 CRUD
│   │   │   ├── module-service.ts    # 模块 CRUD
│   │   │   └── task-service.ts      # 任务 CRUD
│   │   ├── client/sse-client.ts     # POST-based SSE 客户端
│   │   ├── components/              # Svelte UI 组件
│   │   └── stores/                  # Svelte 5 响应式状态
│   └── routes/
│       ├── (app)/                   # 需认证的页面路由
│       │   ├── +page.svelte         # 里程碑列表
│       │   ├── milestones/create/   # 新建里程碑
│       │   ├── milestones/[id]/     # 里程碑详情（模块/任务列表）
│       │   ├── milestones/[id]/kanban/   # 看板视图
│       │   └── milestones/[id]/preview/  # LLM 拆解预览与编辑
│       ├── login/                   # 登录页
│       └── api/                     # REST API 路由
├── packages/cli/                    # Agent CLI 工具 (mt-cli)
├── docs/                            # 架构和开发文档
└── drizzle/                         # 数据库迁移文件
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 安装

```bash
# 安装主项目依赖
npm install

# 安装 CLI 依赖
cd packages/cli && npm install && cd ../..
```

### 配置

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

关键配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_PASSWORD` | Web 管理员登录密码 | 必填 |
| `API_KEYS` | Agent 使用的 API Key（逗号分隔） | 必填 |
| `LLM_API_KEY` | LLM API 密钥 | 拆解功能需要 |
| `LLM_BASE_URL` | LLM API 基础 URL | `https://api.openai.com/v1` |
| `LLM_MODEL` | LLM 模型名称 | `gpt-4o-mini` |
| `DATABASE_PATH` | SQLite 数据库路径 | `./data/tracker.db` |
| `PORT` | 服务端口 | `5173` |

### 数据库初始化

```bash
# 生成迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate
```

### 运行

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产运行
node build
```

### CLI 工具

CLI 工具供 AI Agent 使用，需要单独配置：

```bash
# 在项目根目录创建 .mt-cli.json
{
  "serverUrl": "http://localhost:5173",
  "milestoneId": "MS-1",
  "key": "mt_key_for_agent_1"
}

# 或使用环境变量
export MT_API_KEY=mt_key_for_agent_1
```

常用命令：

```bash
mt-cli status                          # 查看里程碑状态
mt-cli tasks list                      # 列出所有任务
mt-cli tasks claim <task-id>           # 领取任务
mt-cli tasks progress <task-id> -m "消息"  # 上报进度
mt-cli tasks complete <task-id>        # 标记任务完成
mt-cli tasks mine                      # 查看自己领取的任务
mt-cli tasks show <task-id>            # 查看任务详情
```

## 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch
```

## API 概览

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 密码登录，返回签名 Cookie |
| POST | `/api/auth/logout` | 登出，清除 Cookie |

### 里程碑

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/milestones` | 列出所有里程碑 |
| POST | `/api/milestones` | 创建里程碑 |
| GET | `/api/milestones/:id` | 获取里程碑详情（含模块和任务） |
| PATCH | `/api/milestones/:id` | 更新里程碑 |
| POST | `/api/milestones/:id/decompose` | LLM 拆解（SSE 流式） |
| POST | `/api/milestones/:id/confirm` | 确认拆解结果并写入 DB |
| POST | `/api/milestones/:id/compare` | LLM 需求对比（SSE 流式） |
| GET | `/api/milestones/:id/modules` | 获取里程碑下的模块列表 |

### 模块

| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | `/api/modules/:id` | 更新模块 |

### 任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 列出任务（支持筛选） |
| PATCH | `/api/tasks/:id` | 更新任务 |
| POST | `/api/tasks/:id/claim` | 领取任务 |
| POST | `/api/tasks/:id/complete` | 标记完成 |
| POST | `/api/tasks/:id/progress` | 上报进度 |

## 数据模型

```
Milestone（里程碑）
 └── Module（模块）     ← LLM 辅助拆解，用户确认
      └── Task（任务）  ← 系统分配唯一 ID，Agent 领取执行
```

**ID 格式：**
- 里程碑：`MS-{seq}`（如 MS-1）
- 模块：`MOD-{ms_seq}-{seq}`（如 MOD-1-1）
- 任务：`TASK-{global_seq}`（如 TASK-42），短引用 `#42`

**任务状态流转：**

```
todo → in-progress → review → done
  │         │
  │         └→ blocked → todo
  │
  └→ skipped
```

## 许可

Private
