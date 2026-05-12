# Milestone Tracker — 系统定义文档

> 创建时间: 2026-05-12
> 版本: MVP v0.2
> 状态: 设计阶段（已纳入架构师评审意见）

---

## 1. 系统定位

一个轻量级的**里程碑进度追踪中枢**。

不参与实际开发，只管三件事：
1. 里程碑里拆出了什么模块和任务
2. 谁领了什么任务
3. 任务执行到什么程度了

实际开发由 GSD-2 / Claude Code / Codex 等 Agent 完成，Agent 通过 CLI 上报进度回来。

---

## 2. 核心概念

```
Milestone（里程碑）
 └── Module（模块）     ← LLM 辅助拆解，用户确认
      └── Task（任务）  ← 系统分配唯一 ID，Agent 领取执行
```

### 2.1 Milestone

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | `MS-{seq}`，如 MS-001 |
| title | string | 里程碑标题 |
| source_md | text | 导入的原始讨论 MD |
| git_url | string | 项目 git 仓库地址，如 `https://github.com/org/repo` |
| status | enum | `draft` → `active` → `completed` |
| created_at | datetime | 创建时间 |

### 2.2 Module

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | `MOD-{ms_seq}-{seq}`，如 MOD-001-01 |
| milestone_id | FK | 所属里程碑 |
| name | string | 模块名称 |
| description | text | 模块描述 |
| status | enum | `pending` → `in-progress` → `done` |
| sort_order | int | 排序 |

### 2.3 Task

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | `TASK-{global_seq}`，如 TASK-0042（全局唯一，跨里程碑） |
| short_id | int | 全局递增数字，用于引用，如 `#42` |
| module_id | FK | 所属模块 |
| title | string | 任务标题 |
| description | text | 任务描述，支持 `#N` 引用其他任务 |
| references | int[] | 显式引用的任务 short_id 列表，如 `[37, 15]` |
| status | enum | 见下方状态流转 |
| assignee | string? | 领取者标识，如 `claude-code`、`codex`、`张三` |
| sub_total | int | Agent 内部子里程碑总数（Agent 上报，可动态增加） |
| sub_done | int | Agent 内部已完成的子里程碑数 |
| progress_message | text? | 最近一次进度消息 |
| reported_at | datetime? | 最后上报时间 |
| claimed_at | datetime? | 领取时间 |
| dev_completed_at | datetime? | Agent 标记开发完成时间 |
| uat_at | datetime? | UAT 通过时间 |
| merged_at | datetime? | 合并完成时间 |
| commit_hash | string? | Agent complete 时提交的 git commit hash（MVP 预留，非强制） |

### 2.4 任务引用规则

**ID 格式：**
- 正式 ID：`TASK-0042`（数据库主键，API 和 CLI 均可使用）
- 短引用：`#42`（人类友好，description/message 中使用）

**引用场景：**

```
1. 任务描述中引用：基于 #37 的权限模型，扩展角色继承功能
2. Agent 上报进度：修复 #37 发现的边界问题，新增修复里程碑
3. 创建新任务时指定关联：参考 #15 的接口风格
4. CLI 查看任务时自动展开引用上下文
```

**引用解析：**
- 系统存储时保存原始文本（包含 `#N`）
- API 返回任务时，自动解析 description 中的 `#N`，附带被引用任务的摘要
- 不做强关联约束（引用的任务被关闭不阻塞当前任务）

### 2.5 状态流转

```
Milestone:  draft ──(激活)──→ active ──(手动关闭)──→ completed

Module:     pending ──(有task被claim)──→ in-progress ──(所有task终态)──→ done

Task:
  open ──(claim)──→ claimed
    ──(首次progress)──→ in-progress
    ──(agent complete)──→ dev-complete       ← Agent 认为做完了
    ──(管理员UAT通过)──→ testing             ← 管理员验证
    ──(管理员确认合并)──→ merged             ← 代码合并完成
    ──(自动)──→ done                        ← 全部搞定

  特殊流转:
    任意状态 ──(管理员取消)──→ cancelled       ← 明确不做了，终态
    任意非终态 ──(管理员暂停)──→ halted        ← 暂时搁置，Agent 不可操作
    halted ──(管理员恢复)──→ open             ← 重新开放，回到池子里

    dev-complete ──(UAT不通过)──→ in-progress  ← 退回，Agent 继续修
```

**终态（不可逆转）：** `done`、`merged`、`cancelled`
**冻结态（可恢复）：** `halted`

Task 的完整生命周期（从管理视角）：

```
open           还没人领
  ↓ claim
claimed        Agent 领了，还没开始
  ↓ progress
in-progress    Agent 在做（可能有 N 个子里程碑，过程中可能新增）
  ↓ complete
dev-complete   Agent 说做完了（但管理员还没验证）
  ↓ UAT 通过 / UAT 不通过（退回 in-progress）
testing        管理员测试通过
  ↓ 确认合并
merged         代码已合并 ← Agent 不可再操作
  ↓ 自动
done           完结

── 特殊操作 ──

cancelled      任意状态 → 管理员取消，明确砍掉（终态）
halted         任意非终态 → 管理员暂停，搁置（冻结态，可恢复）
  ↓ 管理员恢复
open           重新回到任务池
```

**新增任务：** 里程碑 `active` 后，管理员随时可在 Web UI 追加新 Module 或新 Task（手动创建，不走 LLM 拆解）。系统分配新的全局唯一 short_id，Agent 可立即 claim。

### 2.6 Agent 操作权限边界

Agent（CLI）对 Task 的可操作范围：

| 状态 | claim | progress | complete | 可查看 |
|------|:-----:|:--------:|:--------:|:------:|
| open | ✓ | | | ✓ |
| claimed | | ✓ | | ✓ |
| in-progress | | ✓ | ✓ | ✓ |
| dev-complete | | | | ✓ |
| testing | | | | ✓ |
| merged | **✗** | **✗** | **✗** | ✓ 只读 |
| done | **✗** | **✗** | **✗** | ✓ 只读 |
| halted | **✗** | **✗** | **✗** | ✓ 只读 |
| cancelled | **✗** | **✗** | **✗** | ✓ 只读 |

**不可操作时 CLI 的错误提示：**
- merged/done: `Task #42 is closed (merged). No further actions allowed.`
- cancelled: `Task #42 has been cancelled. No further actions allowed.`
- halted: `Task #42 has been paused by admin. No further actions allowed until resumed.`

**CLI 行为规则：**
- 对 `merged` 或 `done` 状态的 Task 执行任何写操作 → 返回错误：`Task TASK-0042 is closed (merged), no further actions allowed`
- `mt-cli tasks list` 默认只显示 Agent 可操作的任务（排除 merged/done）
- `mt-cli tasks mine` 可以看到已 merged 的历史记录，但标注 `[closed]`
- 管理员可在 Web UI 重新打开已关闭的 Task（状态回退到 `in-progress`），此时 Agent 才能再次操作

**关闭通知场景：**
```
场景1: Agent 正在开发中... 管理员合并了代码
  → Agent 下次调用 mt-cli progress #42
  → 返回: ✗ Task #42 is closed (merged). No further actions allowed.

场景2: Agent 正在开发中... 管理员砍掉了这个任务
  → Agent 下次调用 mt-cli progress #42
  → 返回: ✗ Task #42 has been cancelled. No further actions allowed.

场景3: Agent 正在开发中... 管理员暂停了这个任务
  → Agent 下次调用 mt-cli progress #42
  → 返回: ✗ Task #42 has been paused by admin. No further actions allowed until resumed.
```

### 2.7 Agent 子里程碑进度跟踪

一个系统 Task 在 Agent 内部可能对应多个子里程碑，进度跟踪规则：

```
场景1: Agent 领任务后，拆解为 2 个子里程碑
  → mt-cli tasks progress TASK-0042 --sub-total 2 --sub-done 0 --message "拆解完成，共2个里程碑"
  → mt-cli tasks progress TASK-0042 --sub-done 1 --message "里程碑1完成"
  → mt-cli tasks progress TASK-0042 --sub-done 2 --message "里程碑2完成"
  → mt-cli tasks complete TASK-0042

场景2: Agent 验收时发现问题，新增子里程碑
  → mt-cli tasks progress TASK-0042 --sub-total 3 --message "验收发现问题，新增修复里程碑"
  → mt-cli tasks progress TASK-0042 --sub-done 3 --message "全部修复完成"
  → mt-cli tasks complete TASK-0042

进度百分比 = sub_total > 0 ? Math.round(sub_done / sub_total * 100) : 0
```

---

## 3. 功能清单（MVP）

### 3.1 系统配置

LLM 和 API Key 等敏感配置**独立管理**，不硬编码。

**配置文件 `.env` 或 Web 设置页：**
```
# LLM 配置（拆解任务时使用）
LLM_PROVIDER=claude          # claude | openai | ollama | openai-compatible
LLM_API_KEY=sk-xxx
LLM_MODEL=claude-sonnet-4-6
LLM_BASE_URL=                 # 可选，用于自部署或代理

# 服务器配置
PORT=5173
API_KEYS=mt_key_for_agent_1,mt_key_for_agent_2   # Agent 连接密钥，逗号分隔
```

MVP 阶段用 `.env` 文件即可，后续可加 Web 设置页面。

### 3.3 Web 界面

| 功能 | 描述 |
|------|------|
| **创建里程碑** | 粘贴/上传 MD 内容，填写标题和 git 仓库地址，创建为 draft 状态 |
| **拆解任务** | 点击按钮 → 调 LLM 分析 MD 内容 → 返回建议的 Module + Task 列表 → 用户勾选确认 → 系统分配 ID 写入数据库 |
| **生成项目配置** | 里程碑激活后，一键生成 `.mt-cli.json` 配置片段（不含密钥），提示用户放到 git 仓库根目录 |
| **看板视图** | 一个 Milestone 的视图，按 Module 分组，每列显示 Task 卡片、状态、子里程碑进度（如 2/3）、操作按钮 |
| **总览视图** | 所有 Milestone 列表，状态一目了然 |
| **管理员操作** | UAT 通过/不通过、确认合并、强制释放僵尸任务、重新打开已关闭任务、取消任务、暂停/恢复任务、手动新增 Module/Task、编辑任务（仅管理员可用，CLI 不提供） |
| **僵尸任务高亮** | 超过配置的超时时间（默认 24h）未更新的 claimed/in-progress 任务，看板高亮警告 |

### 3.4 拆解任务的交互流程

```
[导入 MD] → 里程碑(draft)
                │
        [点击「拆解任务」]
                │
        LLM 分析 MD 内容
        返回建议的模块和任务
                │
        ┌───────┴───────────┐
        │  预览界面（可编辑）  │
        │                    │
        │  ☑ 模块A: 用户认证  │
        │    ☑ T: 搭建 OAuth  │
        │    ☑ T: 登录页 UI   │
        │    ☐ T: 第三方登录   │  ← 取消勾选，不生成这个
        │                    │
        │  ☑ 模块B: 权限管理  │
        │    ☑ T: RBAC 模型   │
        │    ...              │
        └───────┬───────────┘
                │
        [确认] → 写入 DB，分配唯一 ID
                │
        里程碑状态变为 active
```

### 3.4 CLI 工具（给 Agent 用的）

一个独立的 CLI，类似 GSD-2 的 /github-sync 扩展。

**核心设计：配置随项目走，Agent 无需手动配置。**

当 Milestone 绑定了 git_url 后，Web UI 会生成一个 `.mt-cli.json` 配置文件，用户将其放入 git 仓库根目录。Agent clone 仓库后即可直接使用，无需额外配置步骤。

**项目配置文件 `.mt-cli.json`（放在 git 仓库根目录，不含敏感信息）：**
```json
{
  "server": "http://your-mt-server:5173/api",
  "milestone": "MS-001"
}
```

**敏感配置通过环境变量注入（不入 Git）：**
```bash
# 方式1: 环境变量
export MT_API_KEY=mt_key_for_agent_1

# 方式2: 本地 .env 文件（已 .gitignore）
echo "MT_API_KEY=mt_key_for_agent_1" > .mt-env
```

CLI 的配置查找优先级：
1. API Key: 环境变量 `MT_API_KEY` → `.mt-env` 文件 → `~/.mt-cli.json` 中的 key 字段
2. 服务器地址: 当前目录 `.mt-cli.json` → `~/.mt-cli.json`
3. 里程碑: 当前目录 `.mt-cli.json`（项目级绑定）

**命令：**
```bash
# Agent clone 仓库后，cd 到项目目录即可直接使用

# 查看当前里程碑的可用任务
mt-cli tasks list --status open
# 输出:
# #42  搭建 OAuth 服务端        模块A: 用户认证
# #43  登录页 UI 开发           模块A: 用户认证
# #46  RBAC 权限模型设计        模块B: 权限管理

# 领取任务（支持 short_id 和完整 ID）
mt-cli tasks claim #42 --agent claude-code
# 或
mt-cli tasks claim TASK-0042 --agent claude-code
# 输出:
# ✓ 已领取 #42「搭建 OAuth 服务端」

# 查看任务详情（自动展开引用上下文）
mt-cli tasks show #42
# 输出:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# #42 搭建 OAuth 服务端
# 状态: in-progress | 进度: 1/2 | 领取者: claude-code
# 描述: 基于 #37 的权限模型，扩展角色继承功能
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 引用的任务:
#   #37 [done] RBAC 权限模型 - 角色定义和权限分配
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 上报进度（Agent 内部拆了 N 个子里程碑）
mt-cli tasks progress TASK-0042 \
  --sub-total 2 \
  --sub-done 1 \
  --message "完成 OAuth 路由定义（子里程碑 1/2）"

# Agent 验收发现问题，新增子里程碑（sub_total 可动态增加）
mt-cli tasks progress TASK-0042 \
  --sub-total 3 \
  --sub-done 2 \
  --message "发现边界问题，新增修复里程碑（2/3）"

# Agent 全部完成
mt-cli tasks complete TASK-0042 \
  --message "OAuth 服务端开发完成，包含 token 签发和刷新"

# 查看我领取的任务（含进度）
mt-cli tasks mine --agent claude-code
# 输出:
# #42  搭建 OAuth 服务端  dev-complete  3/3  子里程碑全部完成

# 查看 CLI 连接状态
mt-cli status
# 输出:
# Server: http://your-mt-server:5173 ✓
# Milestone: MS-001「用户认证系统」
# Agent: claude-code
```

**管理员操作（Web UI 专用，CLI 不提供）：**
```
UAT 通过:     PATCH /api/tasks/:id  { action: "uat-pass" }
UAT 不通过:   PATCH /api/tasks/:id  { action: "uat-fail" }     → 退回 in-progress
确认合并:     PATCH /api/tasks/:id  { action: "merge" }
强制释放:     PATCH /api/tasks/:id  { action: "force-unclaim" } → 回到 open
重新打开:     PATCH /api/tasks/:id  { action: "reopen" }        → merged/done → in-progress
取消任务:     PATCH /api/tasks/:id  { action: "cancel" }        → 任意状态 → cancelled（终态）
暂停任务:     PATCH /api/tasks/:id  { action: "halt" }          → 任意非终态 → halted（冻结）
恢复任务:     PATCH /api/tasks/:id  { action: "resume" }        → halted → open
编辑任务:     PATCH /api/tasks/:id  { title, description, module_id }
新增模块:     POST /api/milestones/:id/modules  { name, description }
新增任务:     POST /api/modules/:id/tasks  { title, description, references? }
```

**自动化集成流程：**
```
1. 人工在 Web 上创建里程碑（绑定 git_url）→ 拆解任务 → 激活
2. Web 生成 .mt-cli.json，人工 commit 到仓库
3. Agent clone 仓库 → cd 到项目 → 直接 mt-cli tasks list
4. Agent 领取任务 → GSD-2 内部创建 milestone
5. 开发过程中自动上报进度 → 标记完成
6. Web 看板实时看到进度
```

**为更高自动化预留的扩展点：**
- `.mt-cli.json` 可包含 `agent_id` 字段，Agent 注册后可自动标识身份
- 未来可加 Agent 自动注册 API，无需人工预设 key
- 未来可加 webhook，Agent 订阅新任务通知

### 3.5 API 接口（Web 和 CLI 共用）

```
# Milestone
GET    /api/milestones                    # 列表
POST   /api/milestones                    # 创建 { title, source_md, git_url }
GET    /api/milestones/:id                # 详情（含 modules + tasks）
PATCH  /api/milestones/:id                # 更新
POST   /api/milestones/:id/decompose      # 触发 LLM 拆解
GET    /api/milestones/:id/cli-config     # 获取 .mt-cli.json 内容（前端展示用）

# Module
GET    /api/milestones/:id/modules        # 列表
PATCH  /api/modules/:id                   # 更新

# Task
GET    /api/tasks?status=open&milestone=MS-001  # 查询任务
GET    /api/tasks/:id                           # 任务详情（自动解析 #N 引用，附带被引用任务摘要）
POST   /api/tasks/:id/claim               # 领取 { agent }，乐观锁：仅 status=open 时成功，否则 409 Conflict，merged/done 状态拒绝
POST   /api/tasks/:id/progress            # 上报进度 { sub_total?, sub_done?, message }，merged/done 状态拒绝
POST   /api/tasks/:id/complete            # Agent 标记开发完成 { message }，merged/done 状态拒绝
PATCH  /api/tasks/:id                     # 管理员操作（Web 端）
       # { action: "uat-pass" }       → dev-complete → testing
       # { action: "uat-fail" }       → dev-complete → in-progress（退回）
       # { action: "merge" }          → testing → merged → done
       # { action: "force-unclaim" }  → claimed/in-progress → open（强制释放僵尸任务）
       # { action: "reopen" }         → merged/done → in-progress（重新打开）
       # { action: "cancel" }         → 任意状态 → cancelled（终态）
       # { action: "halt" }           → 任意非终态 → halted（冻结）
       # { action: "resume" }         → halted → open（恢复）
       # { title, description, module_id } → 编辑任务内容

POST   /api/milestones/:id/modules        # 管理员追加新模块 { name, description }
POST   /api/modules/:id/tasks             # 管理员追加新任务 { title, description, references? }

# 认证
Header: Authorization: Bearer mt_xxxx
Header: X-CLI-Version: 1.0.0              # CLI 版本号，服务端校验不兼容返回 426 Upgrade Required
```

---

## 4. 技术栈

| 层 | 选择 | 理由 |
|---|------|------|
| **框架** | SvelteKit | 全栈一体，前后端一套代码，体量小，改起来方便 |
| **数据库** | SQLite (via better-sqlite3) | 零配置，单文件部署，必须开启 WAL 模式解决并发写入锁 |
| **ORM** | Drizzle ORM | 类型安全，轻量，SvelteKit 生态首选 |
| **看板 UI** | 手写 CSS + svelte-dnd-action | 不引重型组件库，保持可改 |
| **LLM 调用** | 可配置 provider（Claude/OpenAI/Ollama/openai-compatible），通过 .env 配置 |
| **数据校验** | Zod | LLM 输出校验、API 入参校验、前后端共享 Schema |
| **CLI** | 同仓库，单独 package (packages/cli) | 共享 API 类型定义， Commander.js |
| **API 认证** | Bearer Token (静态密钥) | MVP 够用，数据库里存几个 key 就行 |
| **样式** | TailwindCSS | 快速出 UI，不纠结样式 |

### 项目结构

```
milestone-tracker/
├── src/
│   ├── lib/
│   │   ├── db/              # Drizzle schema + 迁移
│   │   │   ├── schema.ts
│   │   │   └── index.ts
│   │   ├── server/
│   │   │   ├── api.ts       # API 路由处理
│   │   │   ├── llm.ts       # LLM 调用（可配置 provider）
│   │   │   ├── config.ts    # 系统配置（LLM、API keys）
│   │   │   └── auth.ts      # Token 认证
│   │   └── types.ts         # 共享类型
│   ├── routes/
│   │   ├── +page.svelte     # 总览页（里程碑列表）
│   │   ├── milestones/
│   │   │   └── [id]/
│   │   │       ├── +page.svelte       # 看板视图
│   │   │       └── decompose/
│   │   │           └── +page.svelte   # 拆解预览页
│   │   └── api/
│   │       └── ...          # API routes
│   └── app.html
├── packages/
│   └── cli/                 # mt-cli 工具
│       ├── src/
│       │   ├── commands/
│       │   │   ├── config.ts
│       │   │   ├── tasks.ts
│       │   │   └── ...
│       │   └── client.ts    # HTTP client
│       └── package.json
├── .env.example            # 配置模板
├── drizzle.config.ts
├── package.json
└── svelte.config.js
```

---

## 5. MVP 开发阶段建议

| 阶段 | 内容 | 预估 |
|------|------|------|
| **P0: 协议与契约** | Zod 定义 Milestone/Module/Task Schema、API 入参出参类型、CLI 与服务端的协议格式 | 0.5天 |
| **P1: 骨架** | 项目初始化、DB schema（WAL 模式）、基础 CRUD API、最简页面 | 1天 |
| **P2: 核心流程** | 里程碑创建（导入MD，含字符数预检）、LLM 拆解（Zod 校验输出）、确认写入 | 1天 |
| **P3: 看板** | 看板视图、状态展示、管理员操作按钮（UAT/合并/强制释放/重新打开）、僵尸任务高亮 | 1天 |
| **P4: CLI** | mt-cli 工具、claim（乐观锁）/progress/complete、版本号校验、配置分离 | 0.5天 |
| **P5: 测试与打磨** | Dummy Agent 压力测试（并发 claim/progress）、错误处理、体验优化 | 0.5天 |

---

## 6. 与 GSD-2 的关系

```
┌─────────────────────────────────────────────────┐
│              Milestone Tracker                    │
│  (本系统 — 管理者视角)                              │
│                                                   │
│  里程碑 → 模块 → Task（TASK-0042）                  │
│                   ↑ claim      ↑ progress         │
└───────────────────┼────────────┼──────────────────┘
                    │            │
              mt-cli│            │mt-cli
                    │            │
┌───────────────────┼────────────┼──────────────────┐
│              GSD-2 (执行者视角)                     │
│                                                   │
│  Milestone(.gsd/) → Slice → Task                  │
│  GSD-2 内部为 TASK-0042 创建自己的执行计划            │
│  开发过程中通过 mt-cli 上报进度                       │
└───────────────────────────────────────────────────┘
```

两个系统通过 CLI 松耦合。GSD-2 不需要知道 Milestone Tracker 的存在，只需要在适当的时候调用 mt-cli 即可。

---

## 7. 架构师评审意见纳入清单

> 来源：milestone-tracker-architecture-review.md
> 状态：全部已纳入 v0.2

### 7.1 架构盲区修复

| # | 问题 | 纳入位置 | 状态 |
|---|------|---------|------|
| 1 | `.mt-cli.json` 泄露 API Key | 3.4 CLI 工具：配置分离为环境变量 | ✓ 已修 |
| 2 | SQLite 并发写入锁死 | 4. 技术栈：SQLite 强制 WAL 模式 | ✓ 已修 |
| 3 | 多 Agent 抢同一任务 | 3.5 API：claim 使用乐观锁，返回 409 | ✓ 已修 |
| 4 | LLM 输出不可控 | 4. 技术栈：新增 Zod 校验；P0 阶段锁定 Schema | ✓ 已修 |
| 5 | CLI 版本碎片化 | 3.5 API：X-CLI-Version Header，426 Upgrade Required | ✓ 已修 |

### 7.2 业务风险对策

| # | 风险 | 对策 | 状态 |
|---|------|------|------|
| 1 | 僵尸任务 | 3.3 Web 界面：超时高亮 + 管理员强制释放按钮 | ✓ MVP |
| 2 | 超大 MD 溢出 | P2 阶段：API 层字符数预检 | ✓ MVP |
| 3 | Agent 伪完成 | Task 表预留 commit_hash 字段；MVP 靠 UAT 退回 | ✓ MVP + 预留 |

### 7.3 后续行动建议纳入

| # | 建议 | 纳入方式 | 状态 |
|---|------|---------|------|
| 1 | P0 协议与契约设计 | 新增 P0 阶段，Zod Schema 优先 | ✓ 已纳入 |
| 2 | Dummy Agent 压力测试 | P5 阶段增加并发测试 | ✓ 已纳入 |
