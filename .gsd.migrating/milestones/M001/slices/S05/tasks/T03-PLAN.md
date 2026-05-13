---
estimated_steps: 31
estimated_files: 2
skills_used: []
---

# T03: Concurrent claim verification and integration test suite

Write integration tests that prove the optimistic locking behavior on task claim: two agents claiming the same task simultaneously, only one succeeds while the other gets 409 Conflict. Also verify CLI error output produces correct Chinese guidance messages for all error scenarios. Ensure the full project build passes with the CLI package integrated.

## Steps

1. Write `packages/cli/src/__tests__/concurrency.test.ts` — test concurrent claim scenario: create two claim requests for the same task, verify one returns the task and the other returns 409 with Chinese error message. Use the existing task-service.ts directly for deterministic testing
2. Add test for claim-after-complete scenario: task is already done, attempt to claim → error message about task being closed
3. Add test for claim-after-halt scenario: task is halted, attempt to claim → error about admin pause
4. Write `packages/cli/src/__tests__/error-output.test.ts` — verify CLI error formatting: 404 → task not found message, 401 → auth error message, 409 → conflict with guidance, 400 → invalid status message. All must be Chinese natural language
5. Verify `npm run build` passes at project root with CLI package present (add npm workspaces or adjust build config if needed)
6. Verify `cd packages/cli && npx vitest run` — all tests pass including concurrency and error output tests

## Must-Haves

- [ ] Concurrent claim test proves one 409 response when two agents claim the same task
- [ ] Error output tests verify Chinese text for 404, 401, 409, 400 status codes
- [ ] `npm run build` passes at project root with CLI package integrated
- [ ] All CLI tests pass

## Verification

- `npx vitest run packages/cli/src/__tests__/concurrency.test.ts` — concurrent claim test passes
- `npx vitest run packages/cli/src/__tests__/error-output.test.ts` — error formatting tests pass
- `npm run build` — exit 0 at project root

## Negative Tests

- **Malformed inputs**: Invalid task IDs (#0, #abc, empty string) → clear error
- **Error paths**: 401 unauthenticated, 404 task not found, 409 conflict, 500 server error
- **Boundary conditions**: Claim already-done task, claim already-claimed-by-same-agent task, claim halted task

## Inputs

- `packages/cli/src/client.ts` — HTTP client (from T01)
- `packages/cli/src/commands/claim.ts` — Claim command (from T02)
- `packages/cli/src/utils/format.ts` — Format helpers (from T02)
- `packages/cli/src/utils/id.ts` — ID utilities (from T02)
- `src/lib/server/task-service.ts` — Task service for direct testing of optimistic lock
- `src/routes/api/tasks/[id]/claim/+server.ts` — Claim API route

## Expected Output

- `packages/cli/src/__tests__/concurrency.test.ts` — Concurrent claim integration tests
- `packages/cli/src/__tests__/error-output.test.ts` — Error output formatting tests

## Inputs

- `packages/cli/src/client.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/utils/format.ts`
- `packages/cli/src/utils/id.ts`
- `src/lib/server/task-service.ts`
- `src/routes/api/tasks/[id]/claim/+server.ts`

## Expected Output

- `packages/cli/src/__tests__/concurrency.test.ts`
- `packages/cli/src/__tests__/error-output.test.ts`

## Verification

cd packages/cli && npx vitest run && cd ../.. && npm run build

## Observability Impact

Concurrency tests expose the exact error messages and HTTP codes for failure scenarios, making future debugging of claim conflicts straightforward.
