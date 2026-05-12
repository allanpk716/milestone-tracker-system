作为架构师，我认为 **当前的 v0.2 规范已经完全具备了进入 P0/P1 实际编码阶段的成熟度**。

为了让接下来的开发更加丝滑，我们不需要对这份文档做大的结构性修改了。但我梳理了几个在 **实际编码（特别是 P0 和 P1 阶段）时容易踩坑的实现细节**。你可以把这些作为补充建议带给开发者，供他们在写代码时参考：

---

### 1. SQLite 的数组存储痛点 (关于 `references` 字段)

*   **文档定义：** Task 表中有个 `references` 字段，类型写的是 `int[]`。
*   **实现提醒：** SQLite **原生并不支持真正的 Array 类型**。
*   **避坑指南：** 在 P1 阶段写 Drizzle Schema 时，对于 `references` 字段，需要使用 Text 类型并配合 JSON 解析。Drizzle 提供了很方便的写法：
    ```typescript
    // Drizzle Schema 示例
    references: text('references', { mode: 'json' }).$type<number[]>().default(sql`'[]'`),
    ```
    这样在代码层面依然可以把它当做 `number[]` 来处理，底层会自动序列化为 JSON 字符串。

### 2. 为“僵尸任务扫描”和“列表查询”建立索引

*   **业务场景：**
    1.  Agent 频繁调用 `mt-cli tasks list --status open`。
    2.  Web 看板需要频繁扫描 `claimed`/`in-progress` 且 `reported_at < 24h` 的任务以高亮僵尸任务。
*   **实现提醒：** 在 Drizzle Schema 中，务必为 Task 表建立联合索引，否则后期任务多了一定会卡。
    ```typescript
    // 建议的索引设计：
    // 1. 针对 CLI 查询：index('idx_task_status_ms', [status, milestone_id])
    // 2. 针对僵尸扫描：index('idx_task_zombie', [status, reported_at])
    ```

### 3. CLI 异常输出需“符合 LLM 直觉” (Agent DX)

*   **业务场景：** 我们在 v0.2 中加入了 HTTP 409 (并发抢占失败) 和 HTTP 426 (版本过低)。
*   **实现提醒：** 传统 CLI 报错通常是打印 `Error: 409 Conflict` 然后退出 `exit(1)`。但在这里，**CLI 的使用者是 LLM**。如果只是冷冰冰地报 409，Agent 可能会陷入困惑，甚至反复重试。
*   **避坑指南：** CLI 在捕获这些特定状态码时，输出到控制台的文本必须是**自然语言的指导性提示**：
    *   **409 触发时输出：** `✗ Claim failed. Task #42 has just been claimed by another agent. Please run 'mt-cli tasks list --status open' to find a new task.` (明确告诉 Agent 下一步该干嘛)。
    *   **426 触发时输出：** `✗ Fatal: mt-cli version is too old. You MUST run 'npm install -g mt-cli@latest' before continuing.`

### 4. 状态重置的边界处理 (Force Unclaim / Reopen)

*   **业务场景：** 管理员点击“强制释放(Force Unclaim)”，把一个干了一半的任务打回 `open`。
*   **探讨点：** 被打回 `open` 后，之前的 `sub_done` (子里程碑进度) 和 `progress_message` 要清空吗？
*   **架构建议：** **不要清空**。
    *   将 `assignee` 置空，状态改为 `open`。
    *   保留 `sub_done`、`sub_total` 和 `progress_message`。
    *   为什么？因为下一个接手的 Agent 在执行 `mt-cli tasks show #42` 时，可以看到上一个崩溃的 Agent 留下的进度（比如：“完成 OAuth 路由定义（子里程碑 1/2）”），这对于 LLM 续写代码是非常宝贵的上下文。

### 5. CLI 的 Commit Hash 参数传参 (为未来铺垫)

*   **文档定义：** Task 表中预留了 `commit_hash`。
*   **实现提醒：** 在 P4 写 CLI 时，即使现在不强制校验，也可以顺手把这个参数加上，让 Agent 养成习惯。
    ```bash
    # 建议顺手支持这个参数
    mt-cli tasks complete TASK-0042 --message "xxx" --commit "a1b2c3d"
    ```

---

### 总结

这份架构文档已经非常严密，形成了**闭环**。
从导入需求 $\rightarrow$ 拆解 $\rightarrow$ 分发 $\rightarrow$ 认领并发控制 $\rightarrow$ 进度闭环 $\rightarrow$ 异常兜底（僵尸处理/降级）。

你可以告诉开发者：**“规范已经冻结，架构师亮了绿灯，可以直接进入 P0 阶段定义 Zod Schema 和 Drizzle 表结构了！”**

如果有在 P1 建表或者写 API 接口时遇到了具体的技术细节（比如 Drizzle 的写法，或者 SvelteKit 的 action 怎么处理并发），随时把代码贴过来，我们一起 review！祝开发顺利！