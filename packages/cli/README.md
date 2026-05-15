# mt-cli — AI Agent 任务回报命令行工具

`mt-cli` 是 Milestone Tracker 系统的 CLI 前端，专为 AI Agent（Claude Code、Codex、GSD-2、Cursor 等）设计。Agent 通过它领取任务、上报进度、标记完成、报告阻塞。

## 安装

```bash
# 从源码构建
cd packages/cli
npm install
npm run build

# 全局安装（可选）
npm link
```

构建产物在 `dist/`，入口文件 `dist/index.js`。需要 Node.js >= 18。

## 配置

### 配置文件

在项目根目录或 HOME 目录创建 `.mt-cli.json`：

```json
{
  "serverUrl": "http://your-server:3000",
  "milestoneId": "MS-xxxx",
  "agentName": "my-agent",
  "key": "your-api-key"
}
```

| 字段 | 必填 | 说明 |
|------|:----:|------|
| `serverUrl` | 是 | Milestone Tracker 服务地址 |
| `milestoneId` | 是 | 要操作的里程碑 ID |
| `agentName` | 否 | 默认 Agent 名称，可被 `--agent` 参数覆盖 |
| `key` | 否 | API 密钥（建议用环境变量代替） |

### 配置优先级

文件查找顺序（高优先级在前）：

1. `--config <path>` 命令行参数
2. 当前目录 `.mt-cli.json`
3. `~/.mt-cli.json`

### API 密钥优先级

1. `MT_API_KEY` 环境变量
2. 当前目录 `.mt-env` 文件（内容格式：`MT_API_KEY=sk-xxx`）
3. 配置文件中的 `key` 字段

## 命令参考

所有命令支持 `--json` 参数，输出结构化 JSON，适合 AI Agent 解析。

### 全局

```
mt-cli status                    # 检查服务器连通性和配置
mt-cli status --json             # JSON 格式输出
```

### 任务管理

```bash
# 列出任务（默认排除已完成和已跳过）
mt-cli tasks list
mt-cli tasks list --status todo
mt-cli tasks list --json

# 查看任务详情（含 #N 引用解析）
mt-cli tasks show <taskId>
mt-cli tasks show <taskId> --json

# 领取任务（乐观锁，冲突返回 409）
mt-cli tasks claim <taskId> --agent my-bot
mt-cli tasks claim <taskId> --json

# 上报进度
mt-cli tasks progress <taskId> --sub-total 5 --sub-done 2 --message "完成数据库 schema"
mt-cli tasks progress <taskId> --json

# 阻塞任务
mt-cli tasks block <taskId> --reason "缺少 OAuth 配置"
mt-cli tasks block <taskId> --json

# 解除阻塞
mt-cli tasks unblock <taskId> --message "配置已就绪"
mt-cli tasks unblock <taskId> --json

# 完成任务
mt-cli tasks complete <taskId> --message "全部完成" --commit abc123
mt-cli tasks complete <taskId> \
  --evidence '[{"command":"npm test","exitCode":0,"verdict":"pass"}]' \
  --files-touched '["src/api/auth.ts","src/lib/session.ts"]' \
  --json

# 查看自己领取的任务
mt-cli tasks mine
mt-cli tasks mine --agent my-bot --json
```

### 模块管理

```bash
# 列出当前里程碑的所有模块
mt-cli modules list
mt-cli modules list --json

# 查看模块详情
mt-cli modules show <moduleId>
mt-cli modules show <moduleId> --json
```

### 任务 ID 格式

支持两种格式：

- 短 ID：`3` 或 `#3`
- 完整 ID：`TS-xxxxxxxx`

短 ID 会自动解析为完整 ID。

## JSON 输出格式

### 成功响应

所有命令加 `--json` 后返回对应的 `TaskResponse` 或 `TaskResponse[]`：

```json
{
  "id": "TS-xxxxxxxx",
  "shortId": 3,
  "moduleId": "MD-xxxxxxxx",
  "title": "实现用户认证 API",
  "description": "...",
  "references": null,
  "status": "in-progress",
  "assignee": "my-agent",
  "subTotal": 5,
  "subDone": 2,
  "progressMessage": "完成数据库 schema",
  "blockedReason": null,
  "commitHash": null,
  "evidenceJson": null,
  "filesTouched": null,
  "createdAt": "2026-05-15T12:00:00.000Z",
  "updatedAt": "2026-05-15T13:00:00.000Z",
  "reportedAt": "2026-05-15T13:00:00.000Z"
}
```

### 错误响应

```json
{
  "error": "任务已被其他 Agent 领取",
  "code": "HTTP_409",
  "details": {
    "url": "http://server:3000/api/tasks/TS-xxx/claim",
    "suggestion": "先查询最新状态 (mt-cli list)，再尝试操作"
  }
}
```

错误码：`HTTP_4xx`（服务端错误）、`TIMEOUT`（超时）、`NETWORK_ERROR`（网络不可达）、`UNKNOWN_ERROR`。

## 任务状态流转

```
todo ──claim──→ in-progress ──complete──→ done
                  │      ↑
                  │      └──unblock────┘
                  │
                  └──block──→ blocked
```

| 状态 | 说明 |
|------|------|
| `todo` | 待领取 |
| `in-progress` | 已领取，执行中 |
| `blocked` | 阻塞中，需要外部介入 |
| `done` | 已完成（终态） |
| `skipped` | 已跳过（终态，仅管理端可设置） |
| `review` | 待审核（仅管理端可设置） |

## 测试

```bash
cd packages/cli
npm test              # 运行全部测试
npm run test:watch    # 监听模式
```

## 许可

Private
