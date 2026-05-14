# 开发注意事项

本文档记录开发过程中的关键技术决策、踩坑记录和注意事项，供后续开发者参考。

## 数据库相关

### better-sqlite3 事务不支持异步

better-sqlite3 的 `transaction()` 不支持 async 回调——会抛出 "Transaction function cannot return a promise" 错误。

**正确模式：** 在进入同步事务之前，预计算所有异步值（如通过 DB 查询生成 ID），然后在同步事务块内执行写入。

```typescript
// ❌ 错误：事务内有异步操作
db.transaction(() => {
  const id = await generateNextId(); // 报错！
  db.insert(tasks).values({ id }).run();
})();

// ✅ 正确：预生成 ID，事务内纯同步
const id = await generateNextId();
db.transaction(() => {
  db.insert(tasks).values({ id }).run();
})();
```

这个模式在 `confirm-service.ts` 中使用，任何未来的事务写入都应遵循。

### SQLite 保留字 references

`references` 是 SQLite 保留字。Drizzle ORM 的查询构建器会自动加引号，但如果使用原生 SQL（`sql` 模板标签），必须手动加引号：

```sql
-- ❌ 会报语法错误
SELECT references FROM tasks;

-- ✅ 需要加引号
SELECT "references" FROM tasks;
```

### Drizzle ORM sql 模板标签的限制

Drizzle ORM 的 `sql` 模板标签在 `max()` + `CAST(SUBSTR(...))` 等 ID 序列提取场景中不可靠——列引用在聚合函数中可能不会正确插值为原始 SQL 列名。

**替代方案：** 使用简单 SELECT + JS 端 parseInt 解析来生成 ID 序列。

### 测试中的 SQLite 注意

内存 SQLite 数据库（`:memory:`）使用 `memory` 日志模式而非 `wal`，测试代码需考虑此差异。

## 认证相关

### timingSafeEqual 的字节长度限制

Node.js 的 `timingSafeEqual` 要求两个 Buffer 长度必须相同，否则抛出 `RangeError`。在调用前必须先校验长度：

```typescript
// ❌ 可能抛 RangeError
timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ✅ 先校验长度
const bufA = Buffer.from(a);
const bufB = Buffer.from(b);
if (bufA.length !== bufB.length) return false;
return timingSafeEqual(bufA, bufB);
```

这个模式在 `auth.ts` 的 `validateBearerToken()` 和 `validatePassword()` 中使用。

### 会话签名机制

会话 token 不存储在服务端——使用无状态的 HMAC-SHA256 签名验证：
- Token 格式：`{randomHex}.{hmac-sha256-hex}`
- 签名密钥从 ADMIN_PASSWORD 派生（HMAC with fixed salt）
- 24 小时有效期
- 修改 ADMIN_PASSWORD 会使所有现有会话失效

## SvelteKit 相关

## 使用 adapter-node 而非 adapter-static

项目必须使用 `@sveltejs/adapter-node`，因为系统需要服务端 API 路由（Agent 通过 REST API 上报进度）。`adapter-static` 不支持服务端路由。

## 路由分组布局

`(app)` 是 SvelteKit 的路由分组（group），不影响 URL 路径但共享布局：
- 根 `+layout.svelte` — 全局 HTML 骨架
- `(app)/+layout.svelte` — 认证后的应用布局（导航栏、侧边栏等）
- `login/+page.svelte` — 在 (app) 之外，不需要认证

### Svelte 5 Runes

项目使用 Svelte 5 的 Runes API，不使用旧的 `$:` 响应式语法：
- `$state()` — 可变状态
- `$derived()` / `$derived.by()` — 派生计算值
- `$props()` — 组件属性
- `$effect()` — 副作用

### Tailwind CSS 4 配置

Tailwind CSS 4 使用 `@tailwindcss/vite` 插件，配置方式与 v3 不同：
- 无需 `tailwind.config.js` 文件
- 样式入口在 `src/app.css`，使用 `@import "tailwindcss"`
- Vite 插件在 `vite.config.ts` 中配置，需放在 sveltekit() 之前

## LLM 集成相关

### LLM Client 是零依赖实现

`llm-client.ts` 基于原生 `fetch` + `ReadableStream`，不依赖 OpenAI SDK。这意味着：
- 支持 OpenAI 兼容 API（通过 LLM_BASE_URL 配置，如 Azure OpenAI、Claude API 等）
- 需要手动解析 SSE 格式（`data:` 行）
- 超时使用 AbortController（默认 30 秒）

### SSE 拆解流式处理

LLM 拆解服务使用增量 JSON 解析策略：
1. LLM 输出 JSON 数组 `[{...}, {...}]`
2. 服务端跟踪大括号栈深度
3. 当栈深度回到 1（数组层级）时，提取一个完整的模块对象
4. 使用 Zod schema 逐个校验，通过 SSE 推送

这种方式避免了等待完整 JSON 输出，实现真正的流式体验。

### POST-based SSE

标准 EventSource 只支持 GET 请求。本项目的 decompose/compare 端点使用 POST，因此客户端 (`sse-client.ts`) 基于 `fetch` + `ReadableStream` 自行解析 SSE 协议。

## 类型系统

### Schema → Type 的单向数据流

```
src/lib/db/schema.ts          # Drizzle ORM schema（数据库层）
       ↓ 导出状态枚举
src/lib/schemas/*.ts          # Zod 验证 schema（API 层）
       ↓ z.infer
src/lib/types.ts              # TypeScript 类型导出（应用层）
```

**原则：**
- 状态枚举（如 milestoneStatusEnum）在 DB schema 中定义，Zod schema 引用它们
- 所有 TypeScript 类型从 Zod schema 推导，统一从 types.ts 导出
- 不要在组件或 service 中直接重定义类型

## CLI 工具

### 配置文件格式

CLI 使用 JSON 配置文件（`.mt-cli.json`），不是 YAML 或 TOML：

```json
{
  "serverUrl": "http://localhost:5173",
  "milestoneId": "MS-1",
  "key": "mt_key_for_agent_1",
  "agentName": "claude-code"
}
```

### API Key 解析

三种方式（按优先级从高到低）：
1. `MT_API_KEY` 环境变量
2. 当前目录的 `.mt-env` 文件（格式：`MT_API_KEY=xxx`）
3. 配置文件中的 `key` 字段

## 测试相关

### 测试框架

使用 Vitest，配置在 `vitest.config.ts`：
- 测试环境：jsdom
- 测试文件匹配：`src/**/*.{test,spec}.{js,ts}`

### 运行测试

```bash
npm test           # 单次运行
npm run test:watch  # 监视模式
```

## 日志相关

### createLogger 使用模式

```typescript
import { createLogger } from '$lib/server/logger';

const log = createLogger('my-module');
log.info('Server started', { port: 3000 });
log.error('Failed to connect', { host: 'db.example.com' });
```

每个模块创建独立的 logger 实例，`module` 参数出现在日志行中用于区分来源。

### 日志级别控制

通过 `LOG_LEVEL` 环境变量设置，支持 `debug`、`info`、`warn`、`error`（默认 `info`）。低于设定级别的日志不会产生任何 I/O。

### 日志文件位置与轮转

- 文件路径：`logs/app-YYYY-MM-DD.log`（相对于 cwd）
- 按日期自动切换文件
- 启动时自动清理 7 天前的旧日志（通过 `pruneOldLogs` 函数）

### _resetLoggerState（仅测试用）

`_resetLoggerState()` 重置 logger 单例状态（初始化标记和日志目录），确保测试之间互不干扰。此函数仅应在测试代码中调用。

### 密钥脱敏

日志模块自动脱敏 meta 中包含敏感键名（`api_key`、`password`、`secret`、`authorization`、`token`）或敏感值模式（如 `bearer xxx`）的内容。不需要手动处理。

## 部署相关

### bat 脚本编码

所有 `.bat` 脚本以 `chcp 65001 > nul 2>&1` 开头，将控制台代码页切换为 UTF-8，确保中文输出正确显示。

### 部署配置加载顺序

`deploy.bat` 按以下顺序查找配置文件：
1. 项目根目录 `deploy-config.bat`
2. `scripts/config/deploy-config.bat`

找到第一个即停止查找，未找到则报错退出。

### NSSM 远程管理

部署脚本通过 SSH 远程执行 NSSM 命令管理 Windows 服务：
- `nssm restart <SERVICE_NAME>` — 重启服务
- `nssm status <SERVICE_NAME>` — 查看状态
- 默认服务名：`MilestoneTracker`

### verify-no-secrets.sh

`scripts/verify-no-secrets.sh` 扫描 Git 跟踪文件中的敏感信息（API 密钥、密码赋值、私钥标记等）。自动排除 `.env.example`、注释行和占位符值（`changeme`、`xxx`、`your-` 等）。支持 `--fail-fast` 模式。

## E2E 测试相关

### 独立配置

E2E 测试使用独立的 Vitest 配置文件 `tests/e2e/e2e.config.ts`，与单元测试隔离：
- 运行环境：`node`（非 jsdom）
- 超时：单测 15 秒，钩子 10 秒
- 运行命令：`npm run test:e2e`

### 环境变量配置

通过环境变量控制 E2E 测试目标（均提供默认值）：

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `E2E_BASE_URL` | `http://172.18.200.47:30002` | 目标服务器地址 |
| `E2E_ADMIN_PASSWORD` | `admin123` | 管理员密码 |
| `E2E_API_KEY` | `dev-api-key-2025` | Agent API 密钥 |

### 使用原生 fetch

E2E 测试使用 Node 22 内置的 `fetch` API（`tests/e2e/helpers.ts`），无需额外 HTTP 库。提供 `api()` 函数封装认证请求和 JSON 解析，`login()` 函数处理登录流程。

## M004 交付运维闭环

### deploy.bat Git Bash 非 TTY 限制

`deploy.bat` 使用 `@echo off` + `chcp 65001 > nul 2>&1`。在 Git Bash 的非 TTY 环境下（如 GSD agent 通过 bash 调用），这些命令会吞掉所有 stdout 输出，导致看不到任何部署进度。

**解决方案：**
1. 通过 `cmd.exe /c scripts\\deploy.bat` 调用（`/release` 技能采用此方式）
2. 或将 deploy.bat 的 6 个阶段拆分为独立 bash 命令逐个执行

### deploy.bat NSSM_PATH 修复

远程服务器上 `nssm` 不在系统 PATH 中。原始 deploy.bat 直接调用 `nssm restart`，导致 "command not found" 错误。

**修复：** 引入 `NSSM_PATH` 可配置变量，默认值 `C:\WorkSpace\milestone-tracker\nssm.exe`，在 `deploy-config.bat` 中可覆盖。所有 NSSM 命令（restart、status、stop）均使用 `%NSSM_PATH%`。

### deploy.bat SCP 端口冲突

当配置了 `SSH_ALIAS` 时，SSH config 已经定义了连接端口。如果此时 SCP 还传递 `-P` 标志，会导致端口冲突。

**修复：** deploy.bat 在 `SSH_ALIAS` 模式下不传递 `-P` 标志给 SCP，让 SSH config 控制端口。仅在 `REMOTE_HOST` 模式（无 alias）下才传递 `-P %SSH_PORT%`。

### Agent E2E spawn-based CLI 测试模式

Agent E2E 测试通过 `child_process.spawn` 调用编译后的 `mt-cli` 二进制文件，而非 HTTP API：

**架构：**
- `global-setup.ts` — 创建临时 SQLite 数据库、种子数据、启动测试服务器
- 测试文件通过 `spawn('mt-cli', [...args, '--json'])` 调用 CLI
- 所有输出以 JSON 格式解析，验证 `{error, code}` 错误结构
- `global-teardown.ts` — 停止测试服务器、清理临时文件

**关键注意：** spawn 的 stdin 必须通过 `child.stdin.end()` 关闭，否则 CLI 会等待输入而挂起。

### Dual Auth Pattern (双认证)

系统使用两套独立的认证机制，各有适用场景：

| 机制 | 传输方式 | 适用场景 | 验证方式 |
|------|----------|----------|----------|
| Bearer API Key | `Authorization: Bearer <key>` header | CLI、Agent API 调用 | 直接匹配 `API_KEYS` 列表 |
| Cookie Session | `Cookie: session=<token>` | Web UI | HMAC-SHA256 签名验证 |

**关键规则：** 永远不要将 session token 作为 Bearer header 使用，也不要将 API key 放在 Cookie 中。两套认证的验证逻辑完全独立。

### CLI --json 错误格式一致性

所有 CLI 命令在 `--json` 模式下的错误输出必须遵循统一结构：

```json
{
  "error": "Error description",
  "code": "HTTP_401"
}
```

HTTP 状态码映射：`HTTP_401`（未认证）、`HTTP_403`（无权限）、`HTTP_404`（未找到）、`HTTP_409`（冲突）、`HTTP_500`（服务器错误）。测试验证时需同时检查 `error` 字段存在性和 `code` 格式。

### Empty MT_API_KEY is Falsy

空字符串 `""` 在 JavaScript 中是 falsy 值。当测试 401 认证失败时，如果使用空字符串作为 API key，某些代码路径可能不会触发认证检查（因为 `if (!key)` 跳过了验证）。

**测试注意：** 401 测试必须使用非空的无效 key（如 `"invalid-key"`），并确保使用隔离的临时配置（避免污染全局 `.mt-cli.json`）。通过 `MT_API_KEY` 环境变量或独立的 `.mt-env` 文件传递测试用 key。

## Agent E2E 测试架构

### spawn-based 测试模式

Agent E2E 测试通过 `child_process.spawn` 调用编译后的 `mt-cli` 二进制文件，而非 HTTP API：

- `global-setup.ts` — 创建临时 SQLite 数据库、种子数据、启动测试服务器
- 测试文件通过 `spawn('mt-cli', [...args, '--json'])` 调用 CLI
- `global-teardown.ts` — 停止测试服务器、清理临时文件

**spawn 注意事项：** stdin 必须通过 `child.stdin.end()` 关闭，否则 CLI 会等待输入而挂起。

### 测试覆盖范围

38 个测试用例覆盖全部 11 个 CLI 命令：
- 全局命令：`health`, `login`, `status`
- 里程碑命令：`create-milestone`, `list-milestones`, `show-milestone`
- 任务命令：`create-task`, `list-tasks`, `update-task`, `show-task`
- 模块命令：`list-modules`

### JSON 输出验证

所有 CLI `--json` 输出测试需验证：
- 成功响应包含预期的数据字段
- 错误响应包含 `{error, code}` 结构
- `code` 遵循 `HTTP_{status}` 格式

## 常见问题

### Q: 修改 ADMIN_PASSWORD 后为什么所有用户都登出了？

A: 会话签名密钥从 ADMIN_PASSWORD 派生，修改密码会使所有现有会话的签名验证失败。这是设计预期行为。

### Q: 为什么不用 UUID 作为 ID？

A: 人类可读 ID（MS-1、TASK-42）方便在沟通、CLI 命令、任务引用（#42）中使用。short_id 是全局自增整数，专门用于人类快速引用。

### Q: 如何添加新的 LLM 供应商？

A: 设置 `LLM_BASE_URL` 指向供应商的 OpenAI 兼容端点，`LLM_MODEL` 设置对应的模型名。只要供应商兼容 OpenAI 的 chat completion + streaming API 格式，无需改代码。

### Q: 任务 description 中的 #N 引用如何工作？

A: 前端渲染时，`#N` 模式会被 ``TaskRefChip`` 组件替换为可点击的引用芯片，链接到对应任务。这不是数据库层功能，纯前端渲染。
