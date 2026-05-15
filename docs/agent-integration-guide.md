# AI Agent 集成指南

> 本文面向希望将 AI Agent（Claude Code、Codex、Cursor、自定义 Agent 等）接入 Milestone Tracker 的操作者。

## 概述

Milestone Tracker 的 Agent 接入模型：

```
管理员在 Web UI 创建里程碑 → 拆解为模块和任务
        ↓
Agent 通过 mt-cli 发现、领取、执行、回报任务
        ↓
管理员在 Web UI 或看板视图查看进度
```

Agent 不参与里程碑规划，只做三件事：**领取任务、执行开发、回报结果**。

## 前置条件

| 条件 | 说明 |
|------|------|
| Milestone Tracker 服务已部署 | 管理员提供 `serverUrl`（如 `http://192.168.1.100:30002`） |
| 里程碑已创建并拆解 | 管理员在 Web UI 完成需求导入和模块/任务拆解 |
| 已分配 API Key | 管理员在服务端 `.env` 的 `API_KEYS` 中配置，提供给 Agent 操作者 |
| mt-cli 已安装 | `npm run build` 后 `mt-cli` 可用（需要 Node.js >= 18） |

## 快速接入（5 分钟）

### 1. 安装 mt-cli

```bash
# 方式 A：从源码构建
git clone <repo-url> && cd milestone-tracker-system/packages/cli
npm install && npm run build
npm link  # 可选，全局可用

# 方式 B：直接复制构建产物
# 将 packages/cli/dist/ 复制到目标机器，确保 node_modules 中有 commander
```

验证安装：

```bash
mt-cli --version
```

### 2. 配置连接

在 Agent 的工作目录创建 `.mt-cli.json`：

```json
{
  "serverUrl": "http://your-server:30002",
  "milestoneId": "MS-xxxxxxxx",
  "agentName": "claude-code"
}
```

> `milestoneId` 和 `serverUrl` 由管理员提供。

### 3. 配置认证

**推荐方式** — 环境变量：

```bash
export MT_API_KEY="your-api-key"
```

或创建 `.mt-env` 文件（不要提交到 git）：

```
MT_API_KEY=your-api-key
```

### 4. 验证连通

```bash
mt-cli status
```

成功输出示例：

```
  ✅ 服务器连接成功
  里程碑标题:  My Project v2
  里程碑状态:  in-progress
```

## Agent 工作流

### 典型生命周期

```
1. 发现    mt-cli tasks list --json
           mt-cli modules list --json
               ↓
2. 领取    mt-cli tasks claim 3 --agent claude-code --json
               ↓
3. 执行    （Agent 自行开发）
           mt-cli tasks progress 3 --sub-total 5 --sub-done 1 --message "已完成 API 设计"
               ↓
           遇到障碍？
           mt-cli tasks block 3 --reason "缺少第三方 API 文档" --json
               ↓ （管理员解除阻塞）
           mt-cli tasks unblock 3 --message "文档已提供" --json
               ↓
4. 完成    mt-cli tasks complete 3 \
             --message "全部完成" \
             --commit abc123 \
             --evidence '[{"command":"npm test","exitCode":0,"verdict":"pass"}]' \
             --files-touched '["src/api/auth.ts"]' \
             --json
```

### 命令速查表

| 阶段 | 命令 | 用途 |
|------|------|------|
| 诊断 | `mt-cli status` | 检查连接和配置 |
| 发现 | `mt-cli tasks list --json` | 查看可用任务 |
| 发现 | `mt-cli tasks show <id> --json` | 查看任务详情（含描述和引用） |
| 发现 | `mt-cli modules list --json` | 查看模块列表 |
| 发现 | `mt-cli modules show <id> --json` | 查看模块详情 |
| 领取 | `mt-cli tasks claim <id> --agent <name>` | 领取任务（乐观锁） |
| 进度 | `mt-cli tasks progress <id> --message "..."` | 上报进度 |
| 进度 | `mt-cli tasks progress <id> --sub-total N --sub-done M` | 更新子任务进度 |
| 阻塞 | `mt-cli tasks block <id> --reason "..."` | 报告阻塞 |
| 恢复 | `mt-cli tasks unblock <id> --message "..."` | 解除阻塞 |
| 完成 | `mt-cli tasks complete <id> --message "..."` | 标记完成 |
| 监控 | `mt-cli tasks mine --json` | 查看自己领取的任务 |

### `--json` 标志

**所有命令**都支持 `--json`，返回结构化数据。Agent 集成时应始终使用此标志，避免解析人类可读的中文输出。

成功时返回 `TaskResponse` 或 `TaskResponse[]`，失败时返回：

```json
{
  "error": "描述信息",
  "code": "HTTP_409",
  "details": { "url": "...", "suggestion": "..." }
}
```

## 各平台接入方式

### Claude Code

在项目的 `CLAUDE.md` 或 `.claude/instructions.md` 中添加：

```markdown
## 任务管理

本项目使用 Milestone Tracker 管理任务。使用 mt-cli 与系统交互。

### 工作流
1. 开始工作前：`mt-cli tasks list --json` 查看可用任务
2. 领取任务：`mt-cli tasks claim <id> --agent claude-code --json`
3. 工作中定期上报：`mt-cli tasks progress <id> --message "进度描述"`
4. 遇到障碍：`mt-cli tasks block <id> --reason "障碍原因"`
5. 完成时：`mt-cli tasks complete <id> --message "完成描述" --commit <hash> --json`
6. 查看我的任务：`mt-cli tasks mine --json`

### 规则
- 始终使用 --json 标志获取结构化输出
- 不要领取已被其他 Agent 领取的任务
- 完成任务时附上验证证据（--evidence）
```

同时确保：
- `.mt-cli.json` 在项目根目录（已 gitignore）
- `MT_API_KEY` 环境变量已设置

### GSD-2 (pi)

GSD-2 通过扩展机制集成，无需手动调用 CLI 命令。

```bash
# 安装扩展
cp -r .gsd/agent/extensions/mt-cli/ ~/.gsd/agent/extensions/mt-cli/

# 或使用符号链接
ln -s "$(pwd)/.gsd/agent/extensions/mt-cli" ~/.gsd/agent/extensions/mt-cli
```

扩展会自动 hook 到 auto-mode 的 task 生命周期：
- `execute-task` → 自动 claim
- `complete-task` → 自动 complete
- `complete-slice` → 批量完成 slice 内任务

详见 [mt-cli GSD Extension 文档](mt-cli-extension.md)。

### Codex / OpenAI Agent

Codex 的 `AGENTS.md` 中添加类似的指令：

```markdown
## Task Management

Use mt-cli to interact with the Milestone Tracker.

Before starting work:
- Run: mt-cli tasks list --json
- Claim a task: mt-cli tasks claim <id> --agent codex --json

During work:
- Update progress: mt-cli tasks progress <id> --message "description"
- If blocked: mt-cli tasks block <id> --reason "blocker description"

When done:
- mt-cli tasks complete <id> --message "summary" --commit <hash> --json
```

配置文件 `.mt-cli.json` 放在 Codex 的工作目录中。

### Cursor / Windsurf / 其他 Agent

任何能执行 shell 命令的 Agent 都可以使用 mt-cli。通用步骤：

1. **安装** — 确保 `mt-cli` 在 Agent 的 PATH 中
2. **配置** — 在 Agent 的工作目录放 `.mt-cli.json` 和 `.mt-env`
3. **指令** — 在 Agent 的系统提示/指令文件中说明 mt-cli 的用法
4. **始终加 `--json`** — 让 Agent 解析结构化数据

## 安全注意事项

| 事项 | 建议 |
|------|------|
| API Key 保护 | 使用环境变量或 `.mt-env`，不要将 key 提交到 git |
| `.mt-cli.json` | 加入 `.gitignore`（含 key 时），或使用不含 key 的版本 + 环境变量 |
| `.mt-env` | 始终加入 `.gitignore` |
| 服务端 | `API_KEYS` 支持多个 key，为每个 Agent 分配独立 key |
| HTTPS | 生产环境建议在反向代理层启用 TLS |

## 故障排除

| 问题 | 诊断命令 | 常见原因 |
|------|----------|----------|
| 连接失败 | `mt-cli status` | serverUrl 错误或服务未运行 |
| 认证失败 | `mt-cli status` | API Key 无效或未配置 |
| 领取冲突 (409) | `mt-cli tasks show <id> --json` | 任务已被其他 Agent 领取 |
| 任务不存在 (404) | `mt-cli tasks list --json` | milestoneId 错误或任务 ID 无效 |
| 配置未找到 | 检查 `.mt-cli.json` 位置 | 文件不在 cwd 或 HOME 目录 |

## 许可

Private
