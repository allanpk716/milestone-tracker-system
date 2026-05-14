# S04: E2E 场景测试 — UAT

**Milestone:** M003
**Written:** 2026-05-13T17:17:27.630Z


# S04: E2E 场景测试 — UAT

**Milestone:** M003
**Written:** 2025-05-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is entirely test-based; verification is automated test execution against in-memory SQLite with real service-layer logic, no mocks.

## Preconditions

- Node.js runtime with vitest installed
- Source code compiled (TypeScript) or vitest transform configured
- No external services required (in-memory SQLite database)

## Smoke Test

Run `npx vitest run src/lib/server/agent-lifecycle.test.ts` — expect 26 passed, 0 failed.

## Test Cases

### 1. Full Agent Lifecycle — Happy Path

1. Seed 3 milestones, 3 modules, 9 tasks into in-memory SQLite
2. Call `listTasks()` to discover available tasks
3. Call `claimTask(id, 'agent-001')` to claim a task
4. Call `progressTask(id, {progressMessage: 'working'})` to update progress
5. Call `blockTask(id, {blockedReason: 'missing OAuth config'})` to report blocker
6. Call `unblockTask(id, {progressMessage: 'config resolved'})` to unblock
7. Call `completeTask(id, {evidence: [{command: 'npm test', exitCode: 0, verdict: 'pass'}], filesTouched: ['src/auth.ts']})` to complete with evidence
8. **Expected:** Each step returns correct status; final task has status 'completed' with evidence_json and files_touched populated

### 2. Error Scenario — 404 Not Found

1. Call `claimTask(99999, 'agent-001')` on non-existent task
2. **Expected:** Returns null or throws NOT_FOUND error

### 3. Error Scenario — 409 Conflict (Duplicate Claim)

1. Claim task with `agent-001`
2. Claim same task with `agent-002`
3. **Expected:** Second claim fails with conflict/already-claimed error

### 4. Error Scenario — Invalid Status Transition

1. Complete a task that is in 'blocked' status without unblocking first
2. **Expected:** Operation fails with invalid status guard error

### 5. Evidence and Files Touched Verification

1. Complete a task with structured evidence array and filesTouched array
2. Read back the task
3. **Expected:** evidence_json contains valid JSON array with command/exitCode/verdict; files_touched contains valid JSON array of file paths

## Edge Cases

### Multi-Agent Concurrent Operations

1. Two agents simultaneously claim different tasks from the same module
2. **Expected:** Both claims succeed; tasks are correctly assigned to respective agents

### Idempotent Operations

1. Call `progressTask()` twice with the same data
2. **Expected:** Both succeed; task state is consistent after second call

### Cross-Module Task Discovery

1. Call `listTasks()` without module filter
2. **Expected:** Returns tasks from all modules with correct module association

## Failure Signals

- Any test file reports failures (>0 failed tests)
- Test suite exit code non-zero
- Tests timeout (stuck database operations)

## Not Proven By This UAT

- Real HTTP API endpoint behavior (tested via service layer, not HTTP)
- CLI `--json` flag output format (covered by S01-S03 tests)
- GSD2 extension integration (deferred to S05)
- Concurrent real database access (in-memory SQLite is single-threaded)

## Notes for Tester

- All tests use in-memory SQLite — no database setup or cleanup needed
- The agent-lifecycle.test.ts file is the primary deliverable; lifecycle.test.ts was updated to maintain compatibility
- The 26 agent-lifecycle tests exercise all S01-S03 capabilities in sequence, serving as integration verification for the entire milestone except S05

