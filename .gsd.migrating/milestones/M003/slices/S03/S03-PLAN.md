# S03: complete 验证证据 + modules 命令

**Goal:** Extend the complete command to accept verification evidence (--evidence, --files-touched) persisted via the server API, and add modules list/show CLI commands consuming existing module APIs. Both features support --json structured output following S01 patterns.
**Demo:** Agent 完成任务时提交验证证据（mt-cli tasks complete <id> --evidence '[{command: npm test, exitCode: 0, verdict: pass}]' --files-touched '[src/api/auth.ts]' --json）。Agent 能查看模块级视图（mt-cli modules list --json）。

## Must-Haves

- 1. `mt-cli tasks complete <id> --evidence '[{command,exitCode,verdict}]' --files-touched '["path/to/file.ts"]' --json` stores and returns evidence data
- 2. `mt-cli modules list --json` returns modules for configured milestoneId via GET /api/milestones/{id}/modules
- 3. `mt-cli modules show <moduleId> --json` returns single module detail via GET /api/modules/{id} (new endpoint)
- 4. DB schema includes evidence_json and files_touched columns on tasks table
- 5. All new server endpoints have unit tests; all CLI commands have --json integration tests
- 6. Full test suite passes (existing + new tests)

## Proof Level

- This slice proves: contract — tests verify API contract, CLI parsing, and JSON output shapes against mocked/stubbed server responses

## Integration Closure

Upstream surfaces consumed:
- S01 outputJson/outputJsonError pattern from packages/cli/src/utils/json-output.ts
- Existing GET /api/milestones/{id}/modules endpoint
- Existing PATCH /api/modules/{id} endpoint (show uses new GET)
- Existing POST /api/tasks/{id}/complete endpoint (extended with evidence fields)
New wiring introduced:
- Two new DB columns (evidence_json, files_touched) on tasks table
- One new server endpoint GET /api/modules/{id}
- Two new CLI commands registered in index.ts (modules list, modules show)
- Extended complete command options
What remains: S04 (E2E) will exercise the full lifecycle including evidence submission and modules queries

## Verification

- Evidence data provides agent verification audit trail — future agents can inspect what tests/commands were run when a task was completed. Module commands give agents project structural awareness. No new logging or metrics needed beyond existing patterns.

## Tasks

- [x] **T01: Add evidence_json + files_touched columns to DB schema and extend complete endpoint** `est:45m`
  Add two new nullable text columns to the tasks table in the Drizzle schema (evidence_json, files_touched). Extend the Zod completeTaskSchema to accept optional `evidence` (array of {command, exitCode, verdict} objects) and `filesTouched` (array of strings). Update completeTask() in task-service.ts to JSON.stringify and persist these fields. Update formatTaskResponse() to parse and return them. Update CREATE_TABLES_SQL strings in all test files (task-service.test.ts, module-service.test.ts, schema.test.ts) to include the new columns. Write server-side tests for complete with evidence.
  - Files: `src/lib/db/schema.ts`, `src/lib/schemas/task.ts`, `src/lib/server/task-service.ts`, `src/routes/api/tasks/[id]/complete/+server.ts`, `src/lib/server/task-service.test.ts`, `src/lib/db/schema.test.ts`, `src/lib/server/module-service.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/task-service.test.ts src/lib/db/schema.test.ts

- [x] **T02: Extend CLI complete command with --evidence and --files-touched options** `est:30m`
  Update TaskResponse type in packages/cli/src/types.ts to include evidenceJson and filesTouched fields. Add --evidence <json> and --files-touched <json> options to the complete command in packages/cli/src/commands/complete.ts. Parse the JSON strings, validate they are arrays, and include them in the POST body. The --json flag (already present) will output the enriched response. Add CLI integration tests exercising the new options in both success and error paths.
  - Files: `packages/cli/src/types.ts`, `packages/cli/src/commands/complete.ts`, `packages/cli/src/__tests__/json-commands.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run packages/cli/src/__tests__/json-commands.test.ts

- [x] **T03: Add GET /api/modules/[id] server endpoint for single module retrieval** `est:20m`
  Add a getModule(db, id) function to src/lib/server/module-service.ts that fetches a single module by ID. Add a GET handler to src/routes/api/modules/[id]/+server.ts that calls getModule and returns 404 if not found. Write unit tests in module-service.test.ts for the new function.
  - Files: `src/lib/server/module-service.ts`, `src/routes/api/modules/[id]/+server.ts`, `src/lib/server/module-service.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/module-service.test.ts

- [x] **T04: Add modules list and show CLI commands with --json support** `est:30m`
  Create packages/cli/src/commands/modules-list.ts and packages/cli/src/commands/modules-show.ts. Register a new 'modules' command group in index.ts with 'list' and 'show' subcommands. modules list calls GET /api/milestones/{milestoneId}/modules using config.milestoneId. modules show calls GET /api/modules/{id}. Both commands support --json flag using outputJson/outputJsonError from S01. Write integration tests covering both commands in success, error, and --json modes.
  - Files: `packages/cli/src/commands/modules-list.ts`, `packages/cli/src/commands/modules-show.ts`, `packages/cli/src/index.ts`, `packages/cli/src/__tests__/modules-commands.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run packages/cli/src/__tests__/modules-commands.test.ts

## Files Likely Touched

- src/lib/db/schema.ts
- src/lib/schemas/task.ts
- src/lib/server/task-service.ts
- src/routes/api/tasks/[id]/complete/+server.ts
- src/lib/server/task-service.test.ts
- src/lib/db/schema.test.ts
- src/lib/server/module-service.test.ts
- packages/cli/src/types.ts
- packages/cli/src/commands/complete.ts
- packages/cli/src/__tests__/json-commands.test.ts
- src/lib/server/module-service.ts
- src/routes/api/modules/[id]/+server.ts
- packages/cli/src/commands/modules-list.ts
- packages/cli/src/commands/modules-show.ts
- packages/cli/src/index.ts
- packages/cli/src/__tests__/modules-commands.test.ts
