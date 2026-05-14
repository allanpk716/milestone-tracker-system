---
estimated_steps: 49
estimated_files: 7
skills_used: []
---

# T01: Server-side block/unblock (schema + service + routes + tests)

Add blockedReason column to tasks DB schema, Zod validation schemas for block/unblock input, blockTask/unblockTask service functions with status guards, and API route handlers. Update formatTaskResponse and taskResponseSchema to include blockedReason. Write comprehensive unit tests for the service layer.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| better-sqlite3 | Throw DB error, 500 response | N/A (sync driver) | N/A |

## Negative Tests

- **Malformed inputs**: block without reason field, unblock with empty body
- **Error paths**: block a non-existent task (404), block a todo/blocked/done task (400 invalid_status), unblock a non-blocked task (400)
- **Boundary conditions**: reason at max length (2000 chars), reason with special characters

## Steps

1. Add `blockedReason` column (TEXT, nullable) to `tasks` table in `src/lib/db/schema.ts`, following the existing column pattern (e.g. `progressMessage`)
2. Add `blockTaskSchema` (z.object with `reason: z.string().min(1).max(2000)`) and `unblockTaskSchema` (z.object with optional `message: z.string().max(5000).optional()`) to `src/lib/schemas/task.ts`
3. Add `blockedReason: z.string().nullable()` to `taskResponseSchema` in `src/lib/schemas/task.ts`
4. Export new schemas/types from `src/lib/schemas/index.ts`
5. Add `blockTask(db, id, data)` function in `src/lib/server/task-service.ts`: verify task exists (not_found), verify status is `in-progress` (invalid_status), set status to `blocked`, set `blockedReason` from data.reason, update `updatedAt`, return `{ task: formatTaskResponse(result) }`
6. Add `unblockTask(db, id, data)` function: verify task exists (not_found), verify status is `blocked` (invalid_status), set status to `in-progress`, clear `blockedReason` to null, optionally set `progressMessage` from data.message, update `updatedAt`, return `{ task: formatTaskResponse(result) }`
7. Update `formatTaskResponse` in task-service.ts to include `blockedReason: row.blockedReason ?? null`
8. Update `CREATE_TABLES_SQL` in `src/lib/server/task-service.test.ts` to include `blocked_reason TEXT` column in tasks table
9. Add unit tests for blockTask: success (in-progress→blocked, blockedReason set), not_found, invalid_status (todo, blocked, done, review, skipped)
10. Add unit tests for unblockTask: success (blocked→in-progress, blockedReason cleared, optional message), not_found, invalid_status (in-progress, todo, done)
11. Create `src/routes/api/tasks/[id]/block/+server.ts` — POST handler following exact pattern of claim/+server.ts: parse JSON body, validate with blockTaskSchema, call blockTask, handle error responses (not_found→404, invalid_status→400 with currentStatus), return updated task as JSON
12. Create `src/routes/api/tasks/[id]/unblock/+server.ts` — POST handler following same pattern with unblockTaskSchema and unblockTask

## Must-Haves

- [ ] blockedReason column added to tasks table in Drizzle schema
- [ ] blockTaskSchema and unblockTaskSchema with proper Zod validation
- [ ] blockTask and unblockTask service functions with status guards
- [ ] formatTaskResponse includes blockedReason field
- [ ] Both API route handlers follow existing error response pattern
- [ ] Unit tests cover success, not_found, and invalid_status for both functions

## Verification

- `npx vitest run src/lib/server/task-service.test.ts` — all tests pass including new block/unblock tests
- `grep -c "blockedReason" src/lib/db/schema.ts` returns >= 1
- `grep -c "blockTask\|unblockTask" src/lib/server/task-service.ts` returns >= 2
- Both route files exist: `test -f src/routes/api/tasks/\[id\]/block/+server.ts && test -f src/routes/api/tasks/\[id\]/unblock/+server.ts`

## Inputs

- `src/lib/db/schema.ts` — existing Drizzle schema to add blockedReason column
- `src/lib/schemas/task.ts` — existing Zod schemas to add block/unblock schemas
- `src/lib/schemas/index.ts` — schema re-exports
- `src/lib/server/task-service.ts` — existing service to add blockTask/unblockTask
- `src/lib/server/task-service.test.ts` — existing test suite to extend
- `src/routes/api/tasks/[id]/claim/+server.ts` — route handler pattern reference

## Expected Output

- `src/lib/db/schema.ts` — modified: added blockedReason column to tasks table
- `src/lib/schemas/task.ts` — modified: added blockTaskSchema, unblockTaskSchema, updated taskResponseSchema
- `src/lib/schemas/index.ts` — modified: re-exported new schemas and types
- `src/lib/server/task-service.ts` — modified: added blockTask, unblockTask functions, updated formatTaskResponse
- `src/lib/server/task-service.test.ts` — modified: updated CREATE_TABLES_SQL, added block/unblock tests
- `src/routes/api/tasks/[id]/block/+server.ts` — new: block API route handler
- `src/routes/api/tasks/[id]/unblock/+server.ts` — new: unblock API route handler

## Inputs

- `src/lib/db/schema.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/index.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/task-service.test.ts`
- `src/routes/api/tasks/[id]/claim/+server.ts`

## Expected Output

- `src/lib/db/schema.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/index.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/task-service.test.ts`
- `src/routes/api/tasks/[id]/block/+server.ts`
- `src/routes/api/tasks/[id]/unblock/+server.ts`

## Verification

npx vitest run src/lib/server/task-service.test.ts && test -f src/routes/api/tasks/[id]/block/+server.ts && test -f src/routes/api/tasks/[id]/unblock/+server.ts && grep -q blockedReason src/lib/db/schema.ts

## Observability Impact

Signals added: blockedReason field on task responses, status transitions in-progress↔blocked visible in API responses. Future agents can inspect `mt-cli tasks show <id> --json` to see block reason and decide remediation strategy.
