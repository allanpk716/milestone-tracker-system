# Bug Report: GSD Auto-Mode — complete-slice 死循环 + run-uat tools-policy 阻断

**GSD Version:** 2.82.0
**OS:** Windows (Git Bash / PowerShell)
**Date:** 2026-05-12
**Reporter:** User (milestone-tracker-system project)

---

## Summary

GSD auto-mode 在 `complete-slice` 和 `run-uat` 阶段分别陷入死循环和策略阻断，导致 auto-mode 无法正常完成 S01 slice。两个问题独立但相互叠加：complete-slice 因构建失败死循环 5 次；修复后 run-uat 又被 `tools-policy: "planning"` 阻断 3 次。

## Environment

- **GSD:** 2.82.0
- **Model:** glm-5.1 / glm-5-turbo (custom OpenAI-compatible provider)
- **Project type:** SvelteKit full-stack app + CLI tool (monorepo)
- **Isolation mode:** worktree (`git.isolation: worktree`)
- **Activity log size:** ~4.2 MB across 32 files

## Bug 1: complete-slice 死循环（5 次重复派发）

### What happened

`complete-slice/M001/S01` 被 auto-mode 连续派发了 **5 次**。每次都因 `vite build` 失败（exit code 2）而无法完成，但状态机没有检测到"相同错误重复出现"并熔断。

### Evidence

- **Activity log:** `012-complete-slice-M001-S01.jsonl` — 5 次派发，每次 ~55 tool calls
- **Journal:** `complete-slice` 出现 5 次 `unit-start` + `unit-end` 对
- **LLM last reasoning:** `"The rtk wrapper is interfering. Let me run it directly:"` — Agent 无法解决构建问题，但 auto-mode 继续重试
- **Build error:** `vite build` exit code 2，Svelte plugin 警告 + 编译错误

### Expected behavior

1. 连续 2-3 次相同错误后，auto-mode 应检测到"错误模式相同"并停止派发该 unit
2. 应产生一个明确的 doctor issue（如 `stuck_loop_detected`）并自动暂停，而不是无限制重试

### Actual behavior

- 5 次重试后 auto-mode 最终 crash（stale crash lock）
- 资源浪费：~55 tool calls × 5 = 275 次 LLM 调用

## Bug 2: run-uat tools-policy 阻断

### What happened

`run-uat/M001/S01` 被标记为 `tools-policy: "planning"`，只允许只读 bash 命令（`cat/grep/git log` 等）。但 UAT 流程需要运行 `npm run build` 和 `npm test`，导致每次都被 HARD BLOCK：

```
HARD BLOCK: unit "run-uat" runs under tools-policy "planning" — bash is restricted
to read-only commands (cat/grep/git log/etc); cannot run "npm run build 2>&1".
This is a mechanical gate enforced by manifest.tools (#4934).
```

### Evidence

- **Activity log:** `014-run-uat-M001-S01.jsonl` through `016-run-uat-M001-S01.jsonl` — 3 次派发
- **Doctor issue:** `uat_retry_exhausted` — "run-uat for M001/S01 exhausted 3 retry attempt(s) without an ASSESSMENT verdict"
- **LLM last reasoning:** `"Good, WAL mode and Zod validation are confirmed in code. Now let me start the dev server and run live API tests."` — Agent 做了正确的事（先检查代码再跑测试），但被策略锁死无法执行

### Expected behavior

1. `run-uat` unit 应该使用允许构建和测试命令的 tools-policy（如 `execution`），而不是 `planning`
2. 即使策略正确，HARD BLOCK 后应立即停止重试，而不是重试 3 次全部超时（每次 2 分钟 timeout + 1 次 30 分钟 timeout）

### Actual behavior

- 3 次重试全部因 tools-policy 被 HARD BLOCK
- 总耗时 ~34 分钟的无效等待

## Bug 3: Crash lock 残留（次要）

### What happened

两次独立的 crash lock 残留（PID 27472 和 PID 21720），进程已死但 auto-mode 的 worker 锁没清理。

### Evidence

- Doctor 能检测到（`stale_crash_lock`），标记为 `fixable: yes`
- 但 auto-mode 恢复后又撞回 Bug 1 或 Bug 2，形成"恢复→重试→再崩溃"的循环

### Assessment

这是前两个 bug 的副作用。如果死循环和策略阻断修复后，crash lock 频率应该大幅下降。Doctor 的自动检测和修复机制本身是正常的。

## Suggested Fixes

### For Bug 1 (complete-slice 死循环)

1. 在 dispatcher 中增加"相同 unit 连续失败熔断"：同一 unit 在同一 auto session 中连续失败 N 次（建议 N=3）且错误模式相同（比较 error trace hash），自动标记为 `stuck` 并暂停
2. 产生明确的 doctor issue，提供"跳过"或"手动重试"选项

### For Bug 2 (run-uat tools-policy)

1. 检查 `run-uat` unit 的 manifest 配置，确认其 tools-policy 是否正确
2. 如果 `planning` policy 是有意为之（限制 run-uat 只做代码审查），需要为需要执行命令的 UAT 场景提供 override 机制
3. HARD BLOCK 后应立即停止重试，不要消耗 retry quota

## Reproduction

1. 创建一个有构建错误的 SvelteKit 项目
2. 使用 GSD auto-mode 运行 complete-slice
3. 观察：auto-mode 会无限重试 complete-slice 而不熔断
4. 手动修复构建错误后，继续 auto-mode
5. 观察：run-uat 被 tools-policy 阻断，无法执行测试

## Attachments

Forensic reports are in `.gsd/forensics/`:
- `report-2026-05-12-10-46-08.md` — 初始发现（complete-slice 死循环）
- `report-2026-05-12-10-51-06.md` — 第二次分析（crash lock）
- `report-2026-05-12-12-41-41.md` — run-uat 阻断开始
- `report-2026-05-12-12-47-59.md` — 最终状态（3 次 run-uat 全部失败）
