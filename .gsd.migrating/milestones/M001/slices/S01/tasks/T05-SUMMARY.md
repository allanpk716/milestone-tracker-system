---
id: T05
parent: S01
milestone: M001
key_files:
  - src/lib/server/milestone-service.ts
  - src/lib/server/module-service.ts
  - src/lib/server/task-service.ts
  - src/routes/api/milestones/+server.ts
  - src/routes/api/milestones/[id]/+server.ts
  - src/routes/api/milestones/[id]/modules/+server.ts
  - src/routes/api/modules/[id]/+server.ts
  - src/routes/api/tasks/+server.ts
  - src/routes/api/tasks/[id]/+server.ts
  - src/routes/api/tasks/[id]/claim/+server.ts
  - src/routes/api/tasks/[id]/progress/+server.ts
  - src/routes/api/tasks/[id]/complete/+server.ts
  - src/lib/server/milestone-service.test.ts
  - src/lib/server/module-service.test.ts
  - src/lib/server/task-service.test.ts
key_decisions:
  - Separated business logic into service modules (testable without SvelteKit) with thin route handler wrappers
  - ID generation uses JS-side parsing (parseInt) instead of Drizzle sql template with CAST/SUBSTR to avoid ORM interpolation issues
  - Used Drizzle inArray() for SQL IN clauses instead of raw sql template tag
  - Module createModule service accepts Omit<CreateModuleInput, 'milestoneId'> since milestoneId comes from URL param
duration: 
verification_result: passed
completed_at: 2026-05-12T09:51:18.637Z
blocker_discovered: false
---

# T05: Implemented milestone/module/task CRUD API endpoints with Zod validation, auth, and 51 passing integration tests

**Implemented milestone/module/task CRUD API endpoints with Zod validation, auth, and 51 passing integration tests**

## What Happened

Created 3 service modules (milestone-service, module-service, task-service) with testable business logic, and 9 SvelteKit route handlers covering all CRUD endpoints. Milestone routes: POST/GET /api/milestones, GET/PATCH /api/milestones/[id]. Module routes: GET/POST /api/milestones/[id]/modules, PATCH /api/modules/[id]. Task routes: GET /api/tasks, GET/PATCH /api/tasks/[id], POST claim/progress/complete. Auth is handled by hooks.server.ts (401 for unauthenticated). All handlers use Zod schema validation with 400 errors. ID generation uses JS-side parsing for reliability with Drizzle ORM. Tests cover: full CRUD cycle, status transitions, claim conflict (409), invalid action for current status (400), and a complete lifecycle test (create → claim → progress → complete). Pre-existing build issue: login page references missing app.css (from T04).

## Verification

Ran full test suite: 198 tests pass across 7 test files (51 new API tests). Verified milestone CRUD (13 tests), module CRUD (9 tests), task CRUD + actions (29 tests). Build fails due to pre-existing missing CSS file from T04, not from this task's changes.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm test` | 0 | ✅ pass | 3730ms |

## Deviations

Task plan listed `src/routes/api/modules/[id]/tasks/+server.ts` as an output but it wasn't needed — tasks are listed via GET /api/tasks?moduleId= filter instead of a nested route.

## Known Issues

Pre-existing build failure: src/routes/login/+page.svelte references ../app.css which doesn't exist (from T04). Not introduced by this task.

## Files Created/Modified

- `src/lib/server/milestone-service.ts`
- `src/lib/server/module-service.ts`
- `src/lib/server/task-service.ts`
- `src/routes/api/milestones/+server.ts`
- `src/routes/api/milestones/[id]/+server.ts`
- `src/routes/api/milestones/[id]/modules/+server.ts`
- `src/routes/api/modules/[id]/+server.ts`
- `src/routes/api/tasks/+server.ts`
- `src/routes/api/tasks/[id]/+server.ts`
- `src/routes/api/tasks/[id]/claim/+server.ts`
- `src/routes/api/tasks/[id]/progress/+server.ts`
- `src/routes/api/tasks/[id]/complete/+server.ts`
- `src/lib/server/milestone-service.test.ts`
- `src/lib/server/module-service.test.ts`
- `src/lib/server/task-service.test.ts`
