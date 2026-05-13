---
id: T03
parent: S01
milestone: M001
key_files:
  - src/lib/schemas/common.ts
  - src/lib/schemas/milestone.ts
  - src/lib/schemas/module.ts
  - src/lib/schemas/task.ts
  - src/lib/schemas/auth.ts
  - src/lib/schemas/index.ts
  - src/lib/types.ts
  - src/lib/schemas/schemas.test.ts
key_decisions:
  - Status enums imported from Drizzle DB schema (single source of truth); Task status transitions enforced via isValidTransition() state machine; source_md capped at 1MB; totalPages allows 0 for empty result sets; TypeScript types re-exported from src/lib/types.ts
duration: 
verification_result: passed
completed_at: 2026-05-12T09:42:27.542Z
blocker_discovered: false
---

# T03: Defined comprehensive Zod schemas for all API contracts (milestone, module, task, auth, common) with 94 passing validation tests

**Defined comprehensive Zod schemas for all API contracts (milestone, module, task, auth, common) with 94 passing validation tests**

## What Happened

Created 7 files in `src/lib/schemas/` covering all API request/response contracts: milestone (create/update/response), module (create/update/response), task (claim/progress/complete/admin action/response with status transition validation), auth (login request/response), common (pagination, error response, ID format validators, source_md size limit), barrel index, and `src/lib/types.ts` for re-exported TypeScript types. Schemas import status enums directly from the Drizzle DB schema to maintain single source of truth. Task schemas include a `isValidTransition()` function enforcing state machine transitions (todo→in-progress→blocked→review→done). A `progressTaskSchema` refinement ensures sub_done ≤ sub_total. 94 tests validate all happy paths, error paths, boundary conditions (oversized source_md, invalid ID formats, negative values, status transition rules), and barrel export completeness. Fixed two initial test failures: totalPages allowed 0 for empty results, and adjusted URL validation test (ftp is a valid URL).

## Verification

All 117 tests pass (94 schema tests + 22 DB tests + 1 scaffold test). Verified: valid inputs accepted, invalid inputs rejected (missing fields, wrong types, invalid status transitions, oversized source_md, invalid ID formats), status transition state machine works correctly, pagination coerces strings and enforces bounds, barrel exports all schemas, TypeScript types import cleanly from types.ts.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm test` | 0 | ✅ pass | 2950ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/schemas/common.ts`
- `src/lib/schemas/milestone.ts`
- `src/lib/schemas/module.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/auth.ts`
- `src/lib/schemas/index.ts`
- `src/lib/types.ts`
- `src/lib/schemas/schemas.test.ts`
