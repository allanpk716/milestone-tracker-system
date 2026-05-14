---
estimated_steps: 1
estimated_files: 7
skills_used: []
---

# T01: Add evidence_json + files_touched columns to DB schema and extend complete endpoint

Add two new nullable text columns to the tasks table in the Drizzle schema (evidence_json, files_touched). Extend the Zod completeTaskSchema to accept optional `evidence` (array of {command, exitCode, verdict} objects) and `filesTouched` (array of strings). Update completeTask() in task-service.ts to JSON.stringify and persist these fields. Update formatTaskResponse() to parse and return them. Update CREATE_TABLES_SQL strings in all test files (task-service.test.ts, module-service.test.ts, schema.test.ts) to include the new columns. Write server-side tests for complete with evidence.

## Inputs

- `src/lib/db/schema.ts`
- `src/lib/schemas/task.ts`
- `src/lib/server/task-service.ts`
- `src/routes/api/tasks/[id]/complete/+server.ts`
- `src/lib/server/task-service.test.ts`
- `src/lib/db/schema.test.ts`
- `src/lib/server/module-service.test.ts`

## Expected Output

- `src/lib/db/schema.ts`
- `src/lib/schemas/task.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/task-service.test.ts`
- `src/lib/db/schema.test.ts`
- `src/lib/server/module-service.test.ts`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/task-service.test.ts src/lib/db/schema.test.ts

## Observability Impact

Evidence data stored in DB provides verification audit trail for completed tasks. Future agents can query task detail to see what tests were run.
