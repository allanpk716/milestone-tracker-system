---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Fix existing lifecycle.test.ts CREATE_TABLES_SQL and add block/unblock lifecycle tests

Update the CREATE_TABLES_SQL in lifecycle.test.ts to include the new columns (blocked_reason, evidence_json, files_touched) added by S02 and S03. Add new test cases for the block/unblock lifecycle within the existing lifecycle test file, exercising: claim → block (with reason) → unblock → complete. Also add tests for complete with evidence and filesTouched.

## Inputs

- `src/lib/server/lifecycle.test.ts — existing lifecycle test with outdated CREATE_TABLES_SQL`
- `src/lib/db/schema.ts — canonical DB schema with blocked_reason/evidence_json/files_touched columns`
- `src/lib/server/task-service.ts — blockTask/unblockTask/completeTask with evidence support`
- `src/lib/schemas/task.ts — blockTaskSchema/unblockTaskSchema/completeTaskSchema`

## Expected Output

- `src/lib/server/lifecycle.test.ts — updated CREATE_TABLES_SQL and new block/unblock/evidence lifecycle tests`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/lifecycle.test.ts

## Observability Impact

Tests expose blockedReason, evidenceJson, filesTouched fields on assertion failures — providing clear diagnostic signals for agent lifecycle debugging.
