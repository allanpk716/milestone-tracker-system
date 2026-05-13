# S05: CLI 工具与并发验证 — UAT

**Milestone:** M001
**Written:** 2026-05-13T00:27:05.114Z

# UAT: S05 — CLI 工具与并发验证

**UAT Type:** Integration Test (CLI → API mocked endpoints)

## Preconditions

1. mt-cli package built and available at `packages/cli/`
2. Node.js runtime available
3. Test suite dependencies installed (`npm install` in monorepo root)

## Test Cases

### UC-01: mt-cli status 命令验证连接
**Steps:**
1. 配置有效的 `.mt-cli.json`（含 apiUrl、apiKey、milestoneId）
2. 运行 `mt-cli status`
3. 验证输出包含服务器地址、里程碑信息、Agent 身份

**Expected:** 输出中文格式，包含服务器 URL 和当前里程碑状态

### UC-02: mt-cli tasks list 按状态过滤
**Steps:**
1. 运行 `mt-cli tasks list --status todo`
2. 验证返回任务列表为中文格式
3. 验证默认排除已完成/已跳过的任务

**Expected:** 表格输出含任务编号、标题、状态（中文标签）

### UC-03: mt-cli tasks claim 领取任务
**Steps:**
1. 运行 `mt-cli tasks claim #42 --agent test-agent`
2. 验证成功消息为中文
3. 验证输出包含任务标题和新状态

**Expected:** 输出「✅ 成功领取任务 #42: [标题]」，状态变为「进行中」

### UC-04: mt-cli tasks show 显示任务详情
**Steps:**
1. 运行 `mt-cli tasks show #42`
2. 验证任务详情包含完整信息（标题、描述、状态、Agent、进度）
3. 验证描述中的 #N 引用自动展开为任务摘要

**Expected:** 结构化中文输出，#N 引用替换为被引用任务的标题和状态

### UC-05: mt-cli tasks progress 更新进度
**Steps:**
1. 运行 `mt-cli tasks progress #42 --percent 50 --note "完成一半"`
2. 验证进度条更新显示
3. 验证输出包含 ASCII 进度条

**Expected:** 进度条 `[████████░░░░░░░░] 50%`，中文确认消息

### UC-06: mt-cli tasks complete 完成任务
**Steps:**
1. 运行 `mt-cli tasks complete #42 --commit abc123`
2. 验证完成确认消息

**Expected:** 输出「✅ 任务 #42 已标记完成」

### UC-07: mt-cli tasks mine 查看自己的任务
**Steps:**
1. 运行 `mt-cli tasks mine --agent test-agent`
2. 验证只显示分配给该 Agent 的任务
3. 验证按状态优先级排序

**Expected:** 仅显示 test-agent 的任务，按待领取→进行中→阻塞排序

### UC-08: 并发 Claim 冲突验证（409）
**Steps:**
1. 两个 Agent 同时 claim 同一任务（Promise.allSettled）
2. 验证一个成功（200），一个冲突（409）
3. 验证 409 响应为中文提示，包含下一步建议

**Expected:** 成功者获得任务，失败者收到中文错误「❌ 任务已被其他 Agent 领取」及建议「请运行 mt-cli tasks list 查看可领取的任务」

### UC-09: 全部错误场景中文提示
**Steps:**
1. 模拟 401（无效 API Key）
2. 模拟 404（任务不存在）
3. 模拟 500（服务器错误）
4. 模拟网络超时

**Expected:** 每种场景输出中文错误消息，包含 HTTP 状态码、描述、建议下一步操作

### UC-10: #N 和 TASK-{seq} ID 格式兼容
**Steps:**
1. 使用 `#5` 格式运行 claim
2. 使用 `TASK-0005` 格式运行 show
3. 使用裸数字 `5` 格式运行 progress

**Expected:** 三种格式均正确解析并执行对应命令

### UC-11: npm run build 通过
**Steps:**
1. 在项目根目录运行 `npm run build`

**Expected:** 构建成功，无错误，CLI 包正确集成

## Edge Cases Covered

- 缺少配置文件时的错误提示和退出码
- `.mt-cli.json` 格式错误时静默跳过
- 引用不存在的任务时显示「#N (引用的任务不存在)」
- API Key 缺失时明确中文提示如何配置
- 服务器不可达时的超时和重试建议

## Not Proven By This UAT

- 真实 HTTP 服务器端到端交互（需 S06 集成验证）
- 大量任务列表的性能表现
- Windows/Linux 跨平台兼容性（开发环境为 Windows）
- npm install -g mt-cli 全局安装体验

