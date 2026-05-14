# 部署指南

本文档介绍 Milestone Tracker 在 Windows 服务器上的完整部署流程。

## 环境要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | ≥ 18 | 运行时环境 |
| NSSM | 最新版 | Windows 服务管理器，[下载地址](https://nssm.cc/download) |
| SSH 客户端 | — | Windows 内置 OpenSSH 或 Git Bash |
| curl | — | 健康检查使用，Windows 10+ 内置 |

**SSH 访问要求：** 本地机器需要能通过 SSH 连接到目标服务器，建议配置 SSH 密钥认证（`ssh-keygen` + `ssh-copy-id`）。

## 配置

### 1. 环境变量 (.env)

复制 `.env.example` 为 `.env`，按需修改：

```bash
# 服务器配置
PORT=5173
DATABASE_PATH=./data/tracker.db

# 管理员密码
ADMIN_PASSWORD=<your-password>

# API Keys（Agent 连接密钥，逗号分隔）
API_KEYS=your-key-1,your-key-2

# 日志级别（debug / info / warn / error）
LOG_LEVEL=info
```

> ⚠️ `.env` 包含敏感信息，确保不被提交到版本控制。

### 2. 部署配置 (deploy-config.bat)

```bash
copy scripts\config\deploy-config.bat.example deploy-config.bat
```

编辑 `deploy-config.bat`，填入实际服务器信息：

| 变量 | 说明 | 示例 |
|------|------|------|
| `REMOTE_HOST` | 服务器地址 | `172.18.200.47` |
| `REMOTE_USER` | SSH 用户名 | `username` |
| `REMOTE_PATH` | 远程部署路径 | `C:\WorkSpace\milestone-tracker` |
| `SSH_ALIAS` | SSH 别名（可选） | `update-hub` |
| `SERVICE_NAME` | NSSM 服务名 | `MilestoneTracker` |
| `SERVICE_PORT` | 服务端口 | `30002` |
| `NODE_PATH` | 远程 Node.js 路径 | `C:\Program Files\nodejs\node.exe` |
| `HEALTH_CHECK_URL` | 健康检查地址 | `http://172.18.200.47:30002/api/health` |
| `HEALTH_CHECK_RETRIES` | 健康检查重试次数 | `3` |
| `HEALTH_CHECK_INTERVAL` | 重试间隔（秒） | `2` |
| `AUTO_RESTART` | 部署后自动重启 | `yes` |
| `NSSM_PATH` | 远程 NSSM 可执行文件路径 | `C:\WorkSpace\milestone-tracker\nssm.exe` |

> `deploy-config.bat` 已被 `.gitignore` 排除。

## 部署流程

运行一键部署脚本：

```bash
scripts\deploy.bat
```

脚本执行 6 个阶段：

```
[1/6] 预检查  — 加载配置、验证 SSH 连接和 Node.js
[2/6] 构建    — npm run build（Vite 生产构建）
[3/6] 裁剪    — npm prune --production（减少传输体积）
[4/6] 推送    — SCP 推送 build/ + node_modules/ + package.json
[5/6] 重启    — NSSM restart 远程服务
[6/6] 验证    — 健康检查（带重试）
```

部署失败时，脚本会自动输出诊断信息（服务状态、错误日志）。

## NSSM 服务管理

### 安装服务

首次部署前，在**远程服务器**上以管理员身份运行：

```bash
scripts\install-service.bat
```

该脚本会：
- 检查管理员权限和 NSSM
- 验证构建产物 (`build/index.js`)
- 注册 NSSM 服务并配置自动启动
- 设置崩溃重启策略（5 秒延迟）
- 配置日志输出和轮转
- 从 `.env` 加载环境变量到服务

### 服务生命周期

| 操作 | 命令 | 说明 |
|------|------|------|
| 启动 | `scripts\start-service.bat` | 通过 SSH 远程启动 |
| 停止 | `scripts\stop-service.bat` | 通过 SSH 远程停止 |
| 重启 | `ssh <target> "nssm restart MilestoneTracker"` | 远程重启 |
| 查看状态 | `ssh <target> "nssm status MilestoneTracker"` | 查看运行状态 |
| 编辑配置 | `ssh <target> "nssm edit MilestoneTracker"` | 打开 NSSM GUI 编辑器 |
| 卸载 | `scripts\uninstall-service.bat` | 停止并移除服务 |

### NSSM 配置参数

安装后服务的关键参数：

| 参数 | 值 | 说明 |
|------|-----|------|
| 启动类型 | `SERVICE_AUTO_START` | 开机自动启动 |
| 入口文件 | `build\index.js` | Node.js 入口 |
| 崩溃重启 | 5 秒延迟 | 进程退出后自动重启 |
| 日志轮转 | 10MB / 保留 5 份 | stdout 和 stderr 日志 |
| stdout | `logs\milestone-tracker.out.log` | 标准输出 |
| stderr | `logs\milestone-tracker.err.log` | 标准错误 |

### NSSM 启动脚本 (start.bat)

`scripts/start.bat` 是 NSSM 调用的启动脚本，替代直接指向 `node.exe`：

```bat
chcp 65001 >nul 2>&1
cd /d "C:\WorkSpace\milestone-tracker"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
"%NODE_EXE%" --import dotenv/config build/index.js
```

**关键特性：**
- `chcp 65001` — UTF-8 代码页，确保中文日志正确输出
- `--import dotenv/config` — dotenv v17+ ESM 加载方式（替代 `require('dotenv').config()`，后者在 ESM 模式下不可用）

### NSSM_PATH 配置

`deploy.bat` 使用 `NSSM_PATH` 变量指定远程服务器上 NSSM 的完整路径：

```bat
set NSSM_PATH=C:\WorkSpace\milestone-tracker\nssm.exe
```

**为什么需要 NSSM_PATH：** 远程服务器上 `nssm` 不在系统 PATH 中，直接调用 `nssm` 会失败。`NSSM_PATH` 可在 `deploy-config.bat` 中配置为 NSSM 的实际安装路径。所有 NSSM 命令（restart、status、stop）均使用此变量。

## 日志系统

### 应用日志

应用使用结构化日志系统，每日自动轮转：

- **路径：** `logs/app-YYYY-MM-DD.log`
- **格式：** `[ISO时间戳] [级别] [模块] 消息 {元数据JSON}`
- **轮转：** 按日期自动切换，启动时清理超过 7 天的旧日志
- **控制：** 通过 `LOG_LEVEL` 环境变量控制（默认 `info`）

示例输出：

```
[2025-01-15T10:30:00.000Z] [INFO] [server] Server started {"port":30002}
[2025-01-15T10:30:01.000Z] [DEBUG] [health] Health check {"db":"connected"}
[2025-01-15T10:30:02.000Z] [ERROR] [db] Connection failed {"error":"ECONNREFUSED"}
```

敏感字段（password、api_key、token、secret、authorization）会自动替换为 `[REDACTED]`。

### NSSM 服务日志

NSSM 管理的 stdout/stderr 日志：

- `logs/milestone-tracker.out.log` — 应用标准输出
- `logs/milestone-tracker.err.log` — 应用标准错误
- 单文件达到 10MB 时自动轮转，保留最近 5 份

## 健康检查

部署完成后，验证服务状态：

```bash
curl http://172.18.200.47:30002/api/health
```

预期响应：

```json
{
  "status": "ok",
  "version": "x.x.x",
  "uptime": 123.456,
  "db": "connected"
}
```

字段说明：
- `status` — 固定为 `"ok"`
- `version` — 应用版本号（来自 package.json）
- `uptime` — 进程运行时长（秒）
- `db` — 数据库状态：`"connected"` 或 `"error"`

## E2E 测试

部署后运行端到端测试验证服务功能：

### API E2E 测试

```bash
npm run test:e2e
```

测试使用 Vitest 执行，覆盖三个层面：

1. **健康检查** — `GET /api/health` 返回正确状态
2. **认证流程** — 登录/登出/会话管理
3. **业务流程** — 里程碑 CRUD 操作

测试配置（通过环境变量覆盖）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `E2E_BASE_URL` | `http://172.18.200.47:30002` | 目标服务地址 |
| `E2E_ADMIN_PASSWORD` | `admin123` | 管理员密码 |
| `E2E_API_KEY` | `dev-api-key-2025` | API 密钥 |

### Agent E2E 测试

```bash
npm run test:agent-e2e
```

Agent E2E 测试通过 `child_process.spawn` 调用编译后的 `mt-cli` 二进制文件，覆盖全部 **11 个 CLI 命令、38 个测试用例**：

- 全局命令：`health`, `login`, `status`
- 里程碑命令：`create-milestone`, `list-milestones`, `show-milestone`
- 任务命令：`create-task`, `list-tasks`, `update-task`, `show-task`
- 模块命令：`list-modules`

**测试架构：**
- `global-setup.ts` — 创建临时数据库、种子数据、启动测试服务器
- 测试文件通过 `spawn` 调用 CLI，传递 `--json` 标志获取结构化输出
- `global-teardown.ts` — 停止测试服务器、清理临时文件和数据库

测试结果以 JSON 格式持久化到 `tests/e2e/results.json`。

## /release 技能（5 阶段流水线）

使用内置的 `/release` 技能执行完整的发布流程：

```
/release
```

技能按 **5 阶段门控流水线** 执行，每阶段必须通过才进入下一阶段：

```
Phase 1: Preflight   — 验证配置、Git 工作区干净、构建通过
Phase 2: Audit       — 运行 verify-no-secrets.sh 扫描敏感信息
Phase 3: Version     — 交互式版本号升级、Git tag 创建与推送
Phase 4: Deploy      — 委托 deploy.bat 执行 6 阶段部署
Phase 5: Verify      — 独立健康检查 + 服务状态确认 + 部署报告
```

### 各阶段详情

| 阶段 | 名称 | 说明 | 失败行为 |
|------|------|------|----------|
| 1 | Preflight | 检查 deploy-config.bat 存在、Git 工作区干净、`npm run build` 通过 | **停止**，提示修复 |
| 2 | Security Audit | `bash scripts/verify-no-secrets.sh` 扫描 Git 跟踪文件 | **阻止部署**，输出发现 |
| 3 | Version Tag | 读取 package.json 版本，检查/创建 Git tag，推送 commit + tag | **停止**，提示手动处理 |
| 4 | Deploy | 通过 `cmd.exe /c scripts\\deploy.bat` 执行实际部署 | **不自动重试**，输出诊断建议 |
| 5 | Verify | curl 健康检查 + SSH 查询 NSSM 服务状态 | **警告**，报告响应供手动排查 |

### deploy.bat 执行方式

`/release` 通过 `cmd.exe /c` 调用 deploy.bat，**不在 Git Bash 中直接运行**（Git Bash 非 TTY 环境下 `@echo off` + `chcp 65001` 会吞掉所有 stdout）。如果 cmd.exe 不可用，则回退到逐阶段 bash 命令执行。

### 回滚

如果部署失败：
1. 检查服务状态：`ssh <SSH_ALIAS> "<NSSM_PATH> status <SERVICE_NAME>"`
2. 查看错误日志：`ssh <SSH_ALIAS> "powershell -Command \"Get-Content <REMOTE_PATH>\\logs\\milestone-tracker.err.log -Tail 20\""`
3. 重启服务：`ssh <SSH_ALIAS> "<NSSM_PATH> restart <SERVICE_NAME>"`
4. 回退版本：`git checkout v{PREV_VERSION} -- package.json && npm run build`

## 敏感信息扫描

部署前使用 `verify-no-secrets.sh` 扫描 Git 跟踪文件中的敏感信息：

```bash
bash scripts/verify-no-secrets.sh          # 扫描全部
bash scripts/verify-no-secrets.sh --fail-fast  # 发现即停止
```

**检测模式：**
- OpenAI/API 密钥（`sk-*`）
- 密码赋值（`password=`、`PASSWORD=`）
- 密钥赋值（`secret=`、`token=`、`api_key=`）
- AWS 凭证（`AKIA*`）
- 私钥标记（`BEGIN RSA PRIVATE KEY`）

**排除规则：**
- `.env.example`、`deploy-config.bat.example` 等模板文件
- 注释行（`#` 或 `//` 开头）
- 占位符值（`changeme`、`xxx`、`your-`、`example` 等）
- `.gsd.migrating/` 目录（迁移中的文件）
- 二进制文件（图片、字体、压缩包、数据库）

> `/release` 技能的 Phase 2 会自动运行此扫描。扫描发现敏感信息将阻止部署。

## 故障排除

### SSH 连接失败

```
[错误] 无法连接到远程服务器
```

**排查：**
1. 确认服务器地址和端口正确
2. 检查 SSH 密钥是否已配置：`ssh <target> "echo ok"`
3. 检查网络连通性：`ping <server>`
4. 如使用密钥认证，确认密钥权限：`ls -la ~/.ssh/`

### 构建失败

```
[错误] 构建失败，中止部署
```

**排查：**
1. 检查 Node.js 版本：`node -v`（需 ≥ 18）
2. 手动运行构建：`npm run build`，查看详细错误
3. 清理缓存重试：`rm -rf node_modules/.vite && npm run build`

### 服务启动失败

```
[错误] 服务重启失败
```

**排查：**
1. 查看服务状态：`ssh <target> "nssm status MilestoneTracker"`
2. 查看 NSSM 错误日志：`ssh <target> "type <REMOTE_PATH>\logs\milestone-tracker.err.log"`
3. 检查 `.env` 配置是否正确加载
4. 确认 `build/index.js` 存在且 Node.js 路径正确

### 健康检查失败

```
[错误] 健康检查失败（已重试 3 次）
```

**排查：**
1. 服务可能需要更长时间启动，增加 `HEALTH_CHECK_INTERVAL`
2. 检查端口是否被占用：`ssh <target> "netstat -ano | findstr <PORT>"`
3. 查看应用日志：`ssh <target> "type <REMOTE_PATH>\logs\app-<date>.log"`
4. 确认数据库文件路径正确且可访问

### 端口冲突

```
Error: listen EADDRINUSE: address already in use
```

**排查：**
1. 查看占用端口的进程：`netstat -ano | findstr <PORT>`
2. 终止占用进程或修改 `PORT` / `SERVICE_PORT` 配置
3. 使用 `nssm edit MilestoneTracker` 更新服务端口

### 数据库连接错误

健康检查返回 `"db": "error"`：

**排查：**
1. 确认 `DATABASE_PATH` 指向的目录存在
2. 检查文件权限：`ssh <target> "icacls <path>"`
3. 确认磁盘空间充足
