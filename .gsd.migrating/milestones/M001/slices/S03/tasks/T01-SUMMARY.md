---
id: T01
parent: S03
milestone: M001
key_files:
  - src/lib/schemas/confirm.ts
  - src/lib/schemas/index.ts
  - src/lib/server/confirm-service.ts
  - src/lib/server/compare-service.ts
  - src/routes/api/milestones/[id]/confirm/+server.ts
  - src/routes/api/milestones/[id]/compare/+server.ts
  - src/lib/server/confirm-service.test.ts
  - src/lib/server/compare-service.test.ts
  - src/lib/server/confirm-endpoint.test.ts
  - src/lib/server/compare-endpoint.test.ts
key_decisions:
  - Pre-generate all IDs in async phase before synchronous better-sqlite3 transaction (MEM022)
  - Confirm service uses synchronous db.transaction() with pre-computed IDs instead of async transaction
  - Compare service outputs advisory plain text (not structured JSON) per plan
  - SSE events follow decompose-service pattern: type discriminator + data field
duration: 
verification_result: passed
completed_at: 2026-05-12T15:05:32.270Z
blocker_discovered: false
---

# T01: Built confirm service (atomic module/task writes + milestone activation), compare service (LLM streaming SSE), both API endpoints, and 36 passing tests

**Built confirm service (atomic module/task writes + milestone activation), compare service (LLM streaming SSE), both API endpoints, and 36 passing tests**

## What Happened

Implemented the full backend infrastructure for S03:

1. **Zod schemas** (`src/lib/schemas/confirm.ts`): Defined `confirmRequestSchema` (modules with name/description/tasks), `compareRequestSchema`, `confirmModuleResponseSchema`, and SSE event types (`CompareSuggestionEvent`, `CompareErrorEvent`, `CompareDoneEvent`). Re-exported from `index.ts`.

2. **Confirm service** (`src/lib/server/confirm-service.ts`): Validates milestone preconditions (exists, draft status, has sourceMd), pre-generates all module and task IDs in a single async scan (to work around better-sqlite3's synchronous transaction constraint), then atomically inserts all modules/tasks and activates the milestone in a synchronous `db.transaction()`. Returns structured response with all generated IDs.

3. **Compare service** (`src/lib/server/compare-service.ts`): Takes sourceMd + confirmed modules, constructs a system prompt asking for LLM comparison, streams via `LlmClient.chatCompletionStream()`, yielding SSE events (suggestion/done/error). Logs request params without API key leakage.

4. **Confirm endpoint** (`POST /api/milestones/:id/confirm`): Validates body with Zod, checks preconditions, calls confirmService, returns JSON with all created module/task IDs.

5. **Compare endpoint** (`POST /api/milestones/:id/compare`): Validates milestone exists and body, streams CompareEvents as SSE ReadableStream.

6. **Tests**: 36 tests across 4 files covering transactional writes, ID generation, status transitions, precondition failures, validation errors, LLM streaming, SSE formatting, and error handling. Key pattern: in-memory SQLite + mock LlmClient (same as S02).

Key discovery: better-sqlite3 does not support async transaction callbacks. Fixed by pre-computing all IDs in the async phase, then doing synchronous inserts inside the transaction block.

## Verification

All 36 tests pass across 4 test files: confirm-service (9 tests), compare-service (7 tests), confirm-endpoint (10 tests), compare-endpoint (10 tests). Tests cover: transactional atomic writes, correct ID generation (MOD-{seq}-{seq} and TASK-{seq}), milestone status transition (draft→in-progress), sortOrder assignment, precondition failures (not_found, bad status, no sourceMd), Zod validation errors, SSE event formatting, LLM streaming with mock client, and error handling with stage info.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/lib/server/confirm-service.test.ts src/lib/server/compare-service.test.ts src/lib/server/confirm-endpoint.test.ts src/lib/server/compare-endpoint.test.ts` | 0 | ✅ pass | 2950ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/schemas/confirm.ts`
- `src/lib/schemas/index.ts`
- `src/lib/server/confirm-service.ts`
- `src/lib/server/compare-service.ts`
- `src/routes/api/milestones/[id]/confirm/+server.ts`
- `src/routes/api/milestones/[id]/compare/+server.ts`
- `src/lib/server/confirm-service.test.ts`
- `src/lib/server/compare-service.test.ts`
- `src/lib/server/confirm-endpoint.test.ts`
- `src/lib/server/compare-endpoint.test.ts`
