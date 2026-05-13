---
estimated_steps: 19
estimated_files: 3
skills_used: []
---

# T03: Frontend Streaming Decompose UI

在里程碑详情页添加「拆解」按钮和流式模块渲染。使用 fetch + ReadableStream 消费 SSE（因为需要 POST）。模块卡片逐步渲染，完成后显示统计。处理错误状态（toast 提示）和部分结果。

## Steps

1. 创建 `src/lib/client/sse-client.ts`：postSse() 函数，接收 URL 和 body，用 fetch POST 获取 ReadableStream，手动解析 SSE 格式（split by \n\n，提取 event/data），回调 onModule / onError / onDone
2. 创建 `src/lib/components/DecomposeStream.svelte`：
   - Props: milestoneId, sourceMd
   - State: modules[], errors[], isStreaming, isDone, stats
   - 拆解按钮：仅在 status=draft 且有 sourceMd 时显示
   - 点击后调用 postSse，回调中更新 modules 数组触发渐进渲染
   - 每个 module 渲染为卡片（名称、描述、任务列表）
   - 错误模块标记红色边框和错误消息
   - 完成后显示统计（N 个模块，M 个任务）
3. 修改 `src/routes/(app)/milestones/[id]/+page.svelte`：引入 DecomposeStream 组件，传递 milestoneId 和 sourceMd
4. 确保 `npm run build` 通过

## Must-Haves

- [ ] 拆解按钮仅在 draft + 有 sourceMd 时可见
- [ ] 模块卡片逐个流式出现，无需等待全部完成
- [ ] 错误模块有视觉标记，不阻断整体流程
- [ ] 完成后显示模块/任务数量统计
- [ ] build 无错误

## Inputs

- `src/routes/(app)/milestones/[id]/+page.svelte`
- `src/routes/(app)/milestones/[id]/+page.server.ts`
- `src/lib/components/ModuleSection.svelte`
- `src/lib/components/Toast.svelte`
- `src/lib/stores/toast.ts`
- `src/lib/schemas/decompose.ts`

## Expected Output

- `src/lib/client/sse-client.ts`
- `src/lib/components/DecomposeStream.svelte`
- `src/routes/(app)/milestones/[id]/+page.svelte`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm run build
