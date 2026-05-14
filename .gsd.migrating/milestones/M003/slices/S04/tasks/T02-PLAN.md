---
estimated_steps: 24
estimated_files: 1
skills_used: []
---

# T02: Create agent-lifecycle.test.ts — full AI Agent E2E scenario test

Create a new test file `src/lib/server/agent-lifecycle.test.ts` that simulates a complete third-party AI Agent lifecycle as described in the roadmap. This is the core E2E scenario test.

The test should follow the pattern from lifecycle.test.ts (in-memory SQLite, service-layer calls, no mocks) and cover:

**Happy path — full agent lifecycle:**
1. Seed milestone + confirm modules → 3 modules, 9 tasks total
2. Agent discovers tasks: `listTasks(db, { milestoneId })` → verify task list with correct statuses
3. Agent claims a task: `claimTask(db, taskId, { assignee: 'agent-001' })` → verify in-progress
4. Agent reports progress: `progressTask(db, taskId, { progressMessage: 'Setting up auth module', subTotal: 5, subDone: 2 })` → verify counters
5. Agent hits blocker: `blockTask(db, taskId, { reason: '缺少 OAuth 配置，无法继续' })` → verify blocked + blockedReason
6. Admin resolves blocker: `unblockTask(db, taskId, { message: 'OAuth config已添加，可继续' })` → verify in-progress, blockedReason cleared
7. Agent completes with evidence: `completeTask(db, taskId, { commitHash: 'a1b2c3d', evidence: [{ command: 'npm test', exitCode: 0, verdict: 'pass' }], filesTouched: ['src/api/auth.ts', 'src/lib/oauth.ts'] })` → verify done + evidenceJson + filesTouched
8. Second task: claim → progress → block with reason → different agent tries claim → conflict → unblock → complete
9. Drive all remaining tasks to done, verify kanban shows 100%

**Error scenarios:**
- Claim already-claimed task by different agent → conflict error with currentAssignee
- Block a todo task → invalid_status error
- Unblock a non-blocked task → invalid_status error  
- Complete a todo task (skip claim) → invalid_status error
- Complete with invalid evidence structure → verify Zod validation
- Operations on non-existent task → not_found error

**Cross-cutting checks:**
- evidenceJson and filesTouched persisted correctly as JSON, parseable on read
- blockedReason persists through block and clears on unblock
- listKanbanData after full completion shows 100% progress
- getTask detail includes all new fields (blockedReason, evidence, filesTouched)

## Inputs

- `src/lib/server/task-service.ts — claimTask/progressTask/completeTask/blockTask/unblockTask/listTasks/listKanbanData`
- `src/lib/server/milestone-service.ts — createMilestone/getMilestone`
- `src/lib/server/confirm-service.ts — confirmMilestone`
- `src/lib/db/schema.ts — canonical DB schema with all columns`
- `src/lib/server/lifecycle.test.ts — pattern reference for in-memory SQLite setup`
- `src/lib/schemas/task.ts — Zod schemas for task operations`

## Expected Output

- `src/lib/server/agent-lifecycle.test.ts — new E2E agent lifecycle scenario test covering full happy path + error scenarios`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/agent-lifecycle.test.ts

## Observability Impact

Agent lifecycle test provides end-to-end observable signal: each lifecycle phase is a separate test case, making failure localization precise. Evidence and blockedReason fields are asserted at each transition.
