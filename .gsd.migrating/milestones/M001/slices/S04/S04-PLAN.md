# S04: 看板视图与管理员操作

**Goal:** 看板页面展示模块卡片（折叠/展开）含进度条、百分比、Agent 名称、子里程碑数值；展开后显示任务详情卡片。右键菜单提供全部管理员操作（UAT 通过/不通过、确认合并、强制释放、重新打开、取消、暂停/恢复、编辑任务）。僵尸任务（>24h 未更新的 in-progress）琥珀色高亮。任务描述和引用中的 #N 自动展开为任务摘要芯片。
**Demo:** 看板页面：模块卡片折叠显示进度条/百分比/Agent/子里程碑数值，展开显示任务详情卡片。右键菜单提供全部管理员操作。僵尸任务（>24h）高亮。任务引用 #N 自动展开

## Must-Haves

- 1. 看板页面在 `/milestones/[id]/kanban` 加载并正确显示模块卡片
- 2. 模块卡片折叠时显示进度条、完成百分比、唯一 Agent 名称、子里程碑 done/total
- 3. 展开模块卡片显示任务详情卡片（shortId、标题、状态、负责人、进度、描述）
- 4. 右键任务弹出管理员上下文菜单，菜单项根据任务状态动态禁用
- 5. 上下文菜单支持：UAT 通过、UAT 不通过、确认合并、强制释放、重新打开、取消、暂停、恢复、编辑任务
- 6. 僵尸任务（in-progress 且 updatedAt > 24h）琥珀色左边框 + ⚠️ 图标高亮
- 7. #N 引用在描述中自动展开为可查看的任务摘要芯片
- 8. 任务编辑弹窗可修改标题、描述、负责人并保存
- 9. `npm run build` 无错误
- 10. 新增服务逻辑有对应 vitest 测试覆盖

## Proof Level

- This slice proves: contract — kanban page compiles and renders with enriched server data; admin actions wire to existing PATCH API; zombie detection and reference resolution tested at service level

## Integration Closure

- Upstream consumed: S01 task/module/milestone services and API routes, S01 StatusBadge/Toast components, S01 auth middleware and hooks
- New wiring: kanban page route at `/milestones/[id]/kanban/`, PUT endpoint on `/api/tasks/:id` for task editing, extended admin action schema with assignee override
- Remaining before milestone usable end-to-end: S05 CLI tool, S06 integration verification

## Verification

- Zombie detection adds computed `isZombie` flag to task data in server response
- Task reference resolution enriches API responses with referenced task summaries
- Admin operations log via existing HTTP status codes (200/400/404/409)
- Toast notifications provide user-facing feedback for all admin operations

## Tasks

- [x] **T01: Kanban Server Data Loader, Task Edit API & Service Tests** `est:1.5h`
  Create kanban page server data loader with zombie detection (in-progress tasks not updated in >24h). Extend admin action schema to support assignee clearing for force release. Add updateTask service function and PUT /api/tasks/:id endpoint for editing task properties (title, description, assignee). Add navigation link to kanban from milestone detail page. Write vitest tests for updateTask, zombie detection, and extended admin action.
  - Files: `src/routes/(app)/milestones/[id]/kanban/+page.server.ts`, `src/routes/api/tasks/[id]/+server.ts`, `src/lib/server/task-service.ts`, `src/lib/schemas/task.ts`, `src/lib/schemas/index.ts`, `src/routes/(app)/milestones/[id]/+page.svelte`
  - Verify: npx vitest run -t "update task" && npx vitest run -t "zombie" && npm run build

- [x] **T02: Kanban Page UI — Module Cards, Task Cards, Zombie Highlighting & Reference Expansion** `est:2h`
  Build the kanban page Svelte component at /milestones/[id]/kanban. Create KanbanModuleCard component: collapsible card with header showing module name, status badge, progress bar with percentage, unique agent names, sub-milestone counts (subDone/subTotal). Create KanbanTaskCard component: expanded detail view with shortId badge, title, status badge, assignee avatar, progress bar, sub-milestone values, description text, progress message. Implement zombie highlighting: amber/orange left border + ⚠️ icon with tooltip showing last update time for isZombie tasks. Create TaskRefChip component: parse #N patterns from description field, look up referenced tasks by shortId in loaded milestone data, render inline clickable chips showing referenced task title and status. All UI text in Chinese.
  - Files: `src/routes/(app)/milestones/[id]/kanban/+page.svelte`, `src/lib/components/KanbanModuleCard.svelte`, `src/lib/components/KanbanTaskCard.svelte`, `src/lib/components/TaskRefChip.svelte`
  - Verify: npm run build

- [x] **T03: Context Menu, Task Edit Modal & Admin Action Wiring** `est:1.5h`
  Create kanban-state.svelte.ts shared reactive state for selected task, context menu position/visibility, and edit modal state. Create TaskContextMenu component: right-click positioned menu with status-aware admin operations. Action-to-status mapping: UAT pass (review→done), UAT fail (review→in-progress), confirm merge (review→done with progressMessage), force release (in-progress→todo + assignee:null), reopen (done→in-progress), cancel (non-terminal→skipped), pause (in-progress→blocked), resume (blocked→in-progress), edit (opens modal). Items disabled (gray text, not hidden) when status doesn't match. Create TaskEditModal: form with title (required), description (optional), assignee (optional) fields, Chinese labels, calls PUT /api/tasks/:id. Wire all context menu actions to PATCH /api/tasks/:id with appropriate status values. After each action, show toast notification and refresh task data from server.
  - Files: `src/lib/stores/kanban-state.svelte.ts`, `src/lib/components/TaskContextMenu.svelte`, `src/lib/components/TaskEditModal.svelte`
  - Verify: npm run build && npx vitest run -t "admin action"

## Files Likely Touched

- src/routes/(app)/milestones/[id]/kanban/+page.server.ts
- src/routes/api/tasks/[id]/+server.ts
- src/lib/server/task-service.ts
- src/lib/schemas/task.ts
- src/lib/schemas/index.ts
- src/routes/(app)/milestones/[id]/+page.svelte
- src/routes/(app)/milestones/[id]/kanban/+page.svelte
- src/lib/components/KanbanModuleCard.svelte
- src/lib/components/KanbanTaskCard.svelte
- src/lib/components/TaskRefChip.svelte
- src/lib/stores/kanban-state.svelte.ts
- src/lib/components/TaskContextMenu.svelte
- src/lib/components/TaskEditModal.svelte
