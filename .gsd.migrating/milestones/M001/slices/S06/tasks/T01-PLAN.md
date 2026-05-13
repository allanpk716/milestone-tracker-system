---
estimated_steps: 30
estimated_files: 1
skills_used: []
---

# T01: End-to-end lifecycle integration test

Write `src/lib/server/lifecycle.test.ts` exercising the full milestone lifecycle through service-layer calls:

1. **Happy path lifecycle** (~15 tests):
   - Create milestone with sourceMd → verify draft status
   - Confirm 2 modules with 3 tasks each → verify atomic write, milestone activated to 'in-progress'
   - Agent A claims task #1 → verify todo→in-progress, assignee set
   - Agent A reports progress on task #1 → verify progressMessage, subDone/subTotal updated
   - Agent A completes task #1 → verify in-progress→done, reportedAt set
   - Repeat claim→progress→complete for tasks #2-#6
   - Admin UAT-pass (review→done) on all tasks via adminTaskAction
   - Verify kanban data shows 100% progress, no zombies

2. **Concurrent claim verification** (~8 tests, real service-level, NOT mocked):
   - Two sequential claimTask() calls on same task: first succeeds, second returns conflict
   - Claim on non-todo task returns invalid_status
   - Same-agent re-claim idempotency (already claimed by same agent)
   - Claim on task already claimed by different agent returns conflict

3. **Error paths and boundary conditions** (~10 tests):
   - Confirm on non-draft milestone → bad_request
   - Confirm on milestone without sourceMd → bad_request
   - Confirm on non-existent milestone → not_found
   - Complete on non-in-progress task → invalid_status
   - Progress on non-existent task → not_found
   - Admin action with invalid status → validation error
   - Update task properties (title, description, assignee) via updateTask

4. **Cross-slice data flow** (~5 tests):
   - After confirm, getMilestone returns modules with tasks nested
   - listTasks with milestoneId filter returns correct tasks
   - listKanbanData returns enriched data with zombie flags, progress percentages
   - Task reference field preserved through claim/progress/complete cycle
   - Module status tracks child task completion

Uses in-memory SQLite DB with standard CREATE_TABLES_SQL pattern from existing tests.

## Inputs

- `src/lib/server/milestone-service.ts`
- `src/lib/server/module-service.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/confirm-service.ts`
- `src/lib/schemas/index.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/confirm.ts`
- `src/lib/db/schema.ts`

## Expected Output

- `src/lib/server/lifecycle.test.ts`

## Verification

npx vitest run src/lib/server/lifecycle.test.ts

## Observability Impact

Lifecycle test logs each step with module/task counts and status values, providing a replayable audit trail for debugging integration failures.
