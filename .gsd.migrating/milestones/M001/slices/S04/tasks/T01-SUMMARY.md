---
id: T01
parent: S04
milestone: M001
key_files:
  - src/routes/(app)/milestones/[id]/kanban/+page.server.ts
  - src/lib/server/task-service.ts
  - src/lib/schemas/task.ts
  - src/lib/schemas/index.ts
  - src/routes/api/tasks/[id]/+server.ts
  - src/routes/(app)/milestones/[id]/+page.svelte
  - src/lib/server/task-service.test.ts
  - src/lib/schemas/schemas.test.ts
  - src/lib/types.ts
key_decisions:
  - Zombie detection computed at query time (24h threshold on updatedAt) rather than stored in DB
  - Admin action schema extended with nullable assignee field for force release
  - PUT endpoint for task editing separate from PATCH admin action to maintain distinct concerns
duration: 
verification_result: passed
completed_at: 2026-05-12T23:59:09.665Z
blocker_discovered: false
---

# T01: Added kanban server data loader with zombie detection, updateTask service/PUT endpoint, admin assignee clearing, and navigation link

**Added kanban server data loader with zombie detection, updateTask service/PUT endpoint, admin assignee clearing, and navigation link**

## What Happened

Created the kanban page server data loader (`+page.server.ts`) that fetches milestone data with module-level progress stats (totalTasks, doneTasks, progressPercent, assignees) and per-task zombie detection flag (`isZombie: true` when in-progress task not updated in >24h).

Extended `adminTaskActionSchema` with optional `assignee` field (string|null) to support force release (clearing assignee) and reassignment via admin actions. Updated `adminTaskAction` service to apply assignee changes.

Added `updateTaskSchema` (title, description, assignee — all optional/nullable) and `updateTask` service function for editing task properties without changing status. Added `PUT /api/tasks/:id` endpoint with Zod validation and 200/400/404 responses.

Added "看板视图" navigation link on milestone detail page pointing to `/milestones/{id}/kanban`.

Added `listKanbanData` to task-service that queries milestone → modules → tasks with computed zombie flags, progress metrics, and unique assignee lists per module.

All 309 tests pass (18 new: 8 updateTask, 3 admin assignee, 6 zombie detection, 1 kanban data shape). Build succeeds cleanly.

## Verification

Ran `npx vitest run -t "update task"` (9 passed), `npx vitest run -t "zombie"` (6 passed), `npx vitest run` (309/309 passed across 14 files), and `npm run build` (SSR + client built successfully with kanban route included).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run -t "update task"` | 0 | ✅ pass | 9670ms |
| 2 | `npx vitest run -t "zombie"` | 0 | ✅ pass | 9730ms |
| 3 | `npx vitest run` | 0 | ✅ pass | 9709ms |
| 4 | `npm run build` | 0 | ✅ pass | 777ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/routes/(app)/milestones/[id]/kanban/+page.server.ts`
- `src/lib/server/task-service.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/index.ts`
- `src/routes/api/tasks/[id]/+server.ts`
- `src/routes/(app)/milestones/[id]/+page.svelte`
- `src/lib/server/task-service.test.ts`
- `src/lib/schemas/schemas.test.ts`
- `src/lib/types.ts`
