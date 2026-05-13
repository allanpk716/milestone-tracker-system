# S06: 端到端集成验证 — UAT

**Milestone:** M001
**Written:** 2026-05-13T00:37:40.037Z

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S06 is an integration verification slice. The 27 automated tests prove the lifecycle end-to-end at the service layer. Production build and full test suite regression are automated. No runtime UI testing is needed beyond what S03/S04 already validated.

## Preconditions

- Node.js 18+ installed
- SQLite3 available (in-memory for tests)
- All dependencies installed (`npm install`)
- No environment variables required (tests use in-memory DB, no LLM calls)

## Smoke Test

```bash
npx vitest run src/lib/server/lifecycle.test.ts
```
Expected: 27 tests pass in under 5 seconds.

## Test Cases

### 1. Full Happy Path Lifecycle

1. Run `npx vitest run src/lib/server/lifecycle.test.ts --reporter=verbose`
2. Observe the "happy path lifecycle" describe block (8 tests)
3. **Expected:** All 8 tests pass, logging milestone creation, module/task confirmation (2 modules × 3 tasks), activation, individual claim/progress/complete cycles, UAT-pass, and final kanban state showing 100% progress.

### 2. Concurrent Claim Conflict

1. Within the same verbose output, observe the "concurrent claim verification" block (4 tests)
2. **Expected:** Sequential claim conflict returns 409, done-task claim returns invalid_status, same-agent re-claim succeeds idempotently, cross-agent conflict detected.

### 3. Error Paths

1. Observe the "error paths and boundary conditions" block (10 tests)
2. **Expected:** All boundary conditions correctly rejected — confirm on non-draft, non-existent milestones, complete on todo tasks, progress on missing tasks, etc.

### 4. Cross-Slice Data Flow

1. Observe the "cross-slice data flow" block (5 tests)
2. **Expected:** Nested module/task retrieval works, kanban enrichment includes zombie flags, references preserved through full lifecycle.

### 5. Production Build

1. Run `npm run build`
2. **Expected:** Exit 0, no TypeScript errors, SvelteKit output generated.

### 6. Full Regression

1. Run `npx vitest run`
2. **Expected:** 336 tests pass across 15 test files, 0 failures.

## Edge Cases

### Zombie Detection Timing

1. Tests create tasks and verify `listKanbanData` correctly flags tasks with `updated_at > 24h ago` as zombies.
2. **Expected:** Only stale claimed/in-progress tasks flagged; fresh tasks not flagged.

### Idempotent Re-claim

1. Same agent claims already-claimed task.
2. **Expected:** Success (idempotent), not 409.

## Failure Signals

- Any of the 27 lifecycle tests failing
- `npm run build` exiting non-zero
- Any of the 336 total tests failing
- TODO/FIXME/HACK appearing in production source

## Not Proven By This UAT

- Live LLM integration (decompose/compare use real API keys — tested separately in S02/S03)
- Web UI rendering (tested in S03/S04)
- CLI binary execution (tested in S05)
- Runtime server startup and HTTP middleware (tested in S01)
- Concurrent load beyond 2 agents (optimistic lock proven at service level)

## Notes for Tester

- Tests are fully automated and require no manual intervention.
- No external services or API keys needed.
- The lifecycle test file (`src/lib/server/lifecycle.test.ts`) serves as both verification and living documentation of the milestone state machine.
