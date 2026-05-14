# mt-cli 第三方 AI 适配性评估

> 创建时间: 2026-05-13
> 对标系统: GSD2 github-sync extension
> 目标: 评估当前 mt-cli 是否能满足第三方 AI Agent（Claude Code、Codex、自定义 Agent 等）回报模块级任务的需求

---

## 1. 系统定位对比

| 维度 | **mt-cli** | **GSD2 github-sync** |
|------|------|------|
| 本质 | 任务状态 API 的 CLI 前端 — 第三方 Agent 主动拉取/推送任务状态 | 单向同步管道 — GSD 内部状态变更自动镜像到 GitHub Issues/PRs/Milestones |
| 数据流方向 | 双向（Agent 可读可写） | 单向（GSD → GitHub，只读回写 mapping） |
| 触发方 | Agent 自行决定何时调用 | GSD auto-mode 引擎在 postUnit 钩子中自动调用 |
| 数据存储 | 集中式 SQLite（服务端） | 本地 `.gsd/github-sync.json` mapping + GitHub API |
| 目标用户 | 第三方 AI Agent | GSD 自身与 GitHub 的集成 |

**结论：** 两者定位完全不同，不是替代关系。github-sync 是内部发布同步管道，mt-cli 是外部 Agent 接口。

---

## 2. GSD2 github-sync 能力参考

github-sync 在 GSD2 auto-mode 的 `postUnit` 阶段自动触发，提供以下能力：

### 2.1 实体映射

| GSD 实体 | GitHub 实体 | 创建时机 |
|----------|------------|---------|
| Milestone | GH Milestone + Tracking Issue | plan-milestone |
| Slice | Draft PR + Branch | plan-slice |
| Task | Sub-issue（挂在 Milestone tracking issue 下） | plan-slice |

### 2.2 状态同步

- **任务完成** → 向 GitHub issue 添加 summary comment（oneLiner + narrative + frontmatter）
- **Slice 完成** → PR ready for review → squash merge → 关闭 slice PR
- **Milestone 完成** → 关闭 tracking issue + 关闭 GH milestone
- **提交关联** → commit message 自动注入 `Resolves #N`（`auto_link_commits` 配置）

### 2.3 关键设计模式值得借鉴

1. **幂等 bootstrap** — `bootstrapSync()` 可安全重复调用，只创建缺失的映射
2. **非阻塞** — 所有同步错误被 catch，不阻塞主流程
3. **mapping 持久化** — 本地 JSON 文件记录 GSD ID ↔ GitHub issue number 的双向映射
4. **配置化** — labels、project、slice_prs、auto_link_commits 均可配置

---

## 3. 当前 mt-cli 能力盘点

### 3.1 已有能力

| 命令 | 功能 | 第三方 AI 可用性 |
|------|------|:---:|
| `mt-cli status` | 服务器连通性诊断 | ✅ |
| `mt-cli tasks list [--status X]` | 按里程碑/状态筛选任务 | ✅ |
| `mt-cli tasks claim <id> --agent <name>` | 领取任务（乐观锁） | ✅ |
| `mt-cli tasks progress <id> [--sub-total N] [--sub-done N] [--message X]` | 更新子任务进度 | ✅ |
| `mt-cli tasks complete <id> [--message X] [--commit <hash>]` | 完成任务 | ⚠️ 功能偏弱 |
| `mt-cli tasks show <id>` | 查看任务详情（含 #N 引用解析） | ✅ |
| `mt-cli tasks mine [--agent <name>]` | 查看自己领取的任务 | ✅ |

### 3.2 认证与配置

- ✅ Bearer Token 认证（API_KEYS 多 key 支持）
- ✅ 配置分层：`--config` > `.mt-cli.json`(cwd) > `~/.mt-cli.json`
- ✅ API Key 分层：`MT_API_KEY`(env) > `.mt-env`(file) > `key`(config)
- ✅ `agentName` 配置字段

### 3.3 服务端状态流转

当前 DB schema 定义了 6 种任务状态：

```
todo → in-progress → review → done
                ↓         ↑
              blocked ────┘
todo → skipped (终态)
```

| 转换 | 触发方 | CLI 支持 |
|------|--------|:---:|
| todo → in-progress | `claim`（自动） | ✅ |
| in-progress → blocked | 管理员 or Agent | ❌ CLI 无 `block` 命令 |
| blocked → in-progress | 管理员 or Agent | ❌ CLI 无 `unblock` 命令 |
| in-progress → review | 管理员 | ❌ 仅 API |
| review → done | `complete` | ⚠️ 必须 review 才能 complete |
| in-progress → done | `complete` | ✅ |
| review → in-progress | 管理员退回 | ❌ 仅 API |
| 任意 → skipped | 管理员 | ❌ 仅 API |

---

## 4. 缺口分析

### P0 — 没有这些第三方 AI 无法正常工作

| 缺口 | 现状 | 影响 |
|------|------|------|
| **无 `--json` 输出** | 所有命令输出 `console.log` 的人类中文文本 | AI Agent 无法可靠解析命令输出，只能用正则或 LLM 理解自然语言输出 |
| **无 `block` 命令** | Agent 遇到障碍（API 缺失、需求不清、外部依赖不可用）无法结构化上报 | 第三方 AI 遇阻只能放弃或在 `progress --message` 里写非结构化文本，管理员无法区分"在做事"和"卡住了" |
| **complete 缺结构化验证证据** | 只接受 `message` + `commitHash` | 管理员无法自动验证 Agent 声称完成的工作是否真的通过了测试。对比 GSD2 的 `verificationEvidence`：`[{command, exitCode, verdict, durationMs}]` |

### P1 — 显著影响使用效率

| 缺口 | 现状 | 影响 |
|------|------|------|
| **无模块级命令** | 没有 `modules list/show` | Agent 不知道自己的任务属于哪个模块、模块整体进度、模块间的依赖关系 |
| **无 SSE/WebSocket 推送** | Agent 必须轮询感知状态变更 | 管理员暂停/取消任务后，Agent 可能继续无效工作很长时间 |
| **无批量操作** | 每次只能操作一个任务 | AI Agent 调用大量 CLI 进程开销大，特别是初始发现阶段 |
| **无任务依赖查询** | `show` 解析了 #N 引用但没有 `tasks deps` 命令 | Agent 无法了解前置依赖是否已完成 |
| **complete 的状态前置条件过严** | 必须 `review` 或 `in-progress` 才能 complete，但 CLI 无法将状态推到 `review` | Agent 无法完整走完 `in-progress → review → done` 流程 |

### P2 — 锦上添花

| 缺口 | 说明 |
|------|------|
| **无心跳机制** | 服务端无法区分 Agent 正常工作还是已崩溃，依赖 `reportedAt` 时间差间接判断 |
| **无文件变更上报** | 没有 `--files-touched` 字段，管理员不知道 Agent 改了哪些文件 |
| **无偏差/deviation 上报** | GSD2 支持记录执行偏差（偏离计划的原因），mt-cli 没有这个概念 |
| **无配置自发现** | Agent 需要人工配置 `.mt-cli.json`，无法通过环境变量或项目标记自动发现 tracker |

---

## 5. 第三方 AI Agent 的理想工作流

```
                     mt-cli 理想生命周期
                     ==================

  1. 发现阶段
     mt-cli tasks list --json
     mt-cli tasks show <id> --json
     mt-cli modules list --json          ← 缺失

  2. 领取阶段
     mt-cli tasks claim <id> --agent my-bot

  3. 执行阶段（循环）
     mt-cli tasks progress <id> \
       --sub-total 5 --sub-done 2 \
       --message "已完成数据库 schema 和 API 端点"

     mt-cli tasks block <id>             ← 缺失
       --reason "缺少 OAuth 配置，无法继续"

     ... 管理员解除阻塞 ...

     mt-cli tasks unblock <id>           ← 缺失
       --message "OAuth 配置已就绪，继续开发"

  4. 完成阶段
     mt-cli tasks complete <id> \
       --message "全部完成" \
       --commit abc123 \
       --evidence '[{"command":"npm test","exitCode":0,"verdict":"pass","durationMs":3200}]' \
                                          ← 缺失
       --files-touched '["src/api/auth.ts","src/lib/session.ts"]' \
                                          ← 缺失

  5. 监控阶段
     mt-cli tasks mine --json
     mt-cli status
```

---

## 6. 优先实施建议

### 第一阶段：AI 可用性基线（预计 2-3 天）

1. **所有命令添加 `--json` 输出模式**
   - `list --json` → 返回 `TaskResponse[]`
   - `show --json` → 返回 `TaskResponse`（含模块/里程碑上下文）
   - `mine --json` → 返回 `TaskResponse[]`
   - `claim/progress/complete --json` → 返回操作后的 `TaskResponse`
   - 错误时输出 `{ error: string, code: string, details?: unknown }`

2. **添加 `block` 和 `unblock` 命令**
   - `mt-cli tasks block <id> --reason "xxx"`
   - `mt-cli tasks unblock <id> [--message "xxx"]`
   - 服务端 task-service 已支持 `blocked` 状态，只需加 API 端点和 CLI 命令

3. **扩展 `complete` 的验证证据字段**
   - 新增 `--evidence <json>` 参数，接受结构化验证数组
   - DB tasks 表新增 `evidence_json TEXT` 列
   - 参考 GSD2 格式：`{ command, exitCode, verdict, durationMs }`

### 第二阶段：效率提升（预计 1-2 天）

4. **添加 `modules` 命令组**
   - `mt-cli modules list --json`
   - `mt-cli modules show <id> --json`（含该模块下所有任务）

5. **修复 complete 的状态前置条件**
   - 允许 `in-progress → done` 直接完成（跳过 review），或
   - 添加 `mt-cli tasks submit <id>` 命令将状态推到 `review`

6. **添加 `--format` 全局选项**
   - `--format text`（默认，当前的人类可读输出）
   - `--format json`（机器可解析）

### 第三阶段：增强（按需）

7. SSE 推送 / WebSocket 通知
8. 批量操作
9. 心跳机制
10. 文件变更和偏差上报
11. 配置自发现

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| AI Agent 解析中文输出不稳定 | 高 | Agent 误判状态 | `--json` 一劳永逸 |
| Agent 遇阻无标准上报渠道 | 高 | 任务卡死，管理员无感知 | `block` 命令 + 服务端僵尸检测（已有 24h 阈值） |
| complete 缺验证证据 | 中 | 虚假完成无法自动发现 | 结构化 evidence + 管理员 review |
| 无模块级视图 | 中 | Agent 缺乏上下文，可能做出错误的优先级决策 | `modules` 命令组 |
| 轮询导致服务端压力 | 低 | 大量 Agent 同时轮询 | 短期可接受，长期加 SSE |

---

## 8. 结论

当前 mt-cli **可以支撑基本的 claim → progress → complete 工作循环**，第三方 AI Agent 能领取任务、上报进度、标记完成。

但要达到**生产可用的第三方 AI 集成**，必须补齐三个核心缺口：

1. `--json` 结构化输出（AI 解析可靠性）
2. `block` / `unblock` 命令（遇阻上报机制）
3. `complete` 验证证据扩展（结果可信度）

这三个做完后，mt-cli 就可以正式作为第三方 AI Agent 的标准任务回报接口使用。
