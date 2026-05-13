---
id: T02
parent: S02
milestone: M001
key_files:
  - src/routes/api/milestones/[id]/decompose/+server.ts
  - src/lib/server/decompose-endpoint.test.ts
key_decisions:
  - Fixed test import path from ./+server.js to ../../routes/api/milestones/[id]/decompose/+server.js for correct module resolution
duration: 
verification_result: passed
completed_at: 2026-05-12T14:02:00.206Z
blocker_discovered: false
---

# T02: Created POST /api/milestones/:id/decompose SSE endpoint with precondition validation and 8 tests

**Created POST /api/milestones/:id/decompose SSE endpoint with precondition validation and 8 tests**

## What Happened

The endpoint and tests were already implemented from a prior session. The only fix needed was the test import path — the test file at `src/lib/server/decompose-endpoint.test.ts` imported `./+server.js` which didn't resolve (no `+server.ts` in `src/lib/server/`). Fixed to use the correct relative path `../../routes/api/milestones/[id]/decompose/+server.js`.

The endpoint:
- Validates milestone exists (404), has sourceMd (400), and status is 'draft' (400) — returning JSON errors, not SSE
- Calls `streamDecompose(sourceMd)` and wraps the AsyncGenerator in a ReadableStream with proper SSE formatting
- Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Three SSE event types: `module` (valid module), `error` (validation/parsing failure), `done` (completion stats)

8 tests cover: 404, 400 no sourceMd, 400 wrong status, SSE headers, event sequence order, sourceMd passthrough, JSON-not-SSE for precondition errors, and all-errors stream.

## Verification

All 31 tests pass (8 endpoint + 23 service): `npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/decompose-endpoint.test.ts` — exit 0, 2 test files passed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/lib/server/decompose-endpoint.test.ts` | 0 | ✅ pass | 5554ms |
| 2 | `npx vitest run src/lib/server/decompose-service.test.ts` | 0 | ✅ pass | 5584ms |
| 3 | `npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/decompose-endpoint.test.ts` | 0 | ✅ pass | 5684ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/routes/api/milestones/[id]/decompose/+server.ts`
- `src/lib/server/decompose-endpoint.test.ts`
