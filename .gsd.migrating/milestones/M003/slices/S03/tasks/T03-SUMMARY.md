---
id: T03
parent: S03
milestone: M003
key_files:
  - src/lib/server/module-service.ts
  - src/routes/api/modules/[id]/+server.ts
  - src/lib/server/module-service.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-05-13T16:49:32.081Z
blocker_discovered: false
---

# T03: Added GET /api/modules/[id] server endpoint and getModule service function

**Added GET /api/modules/[id] server endpoint and getModule service function**

## What Happened

Added `getModule(db, id)` function to module-service.ts that fetches a single module by ID using the existing `eq(modules.id, id)` filter and returns null if not found. Added GET handler to `src/routes/api/modules/[id]/+server.ts` that calls getModule and returns 404 with `{error: 'not_found'}` if the module doesn't exist. Added 3 new unit tests: get by ID returns module, non-existent ID returns null, and all fields populated correctly. All 12 module-service tests pass.

## Verification

Ran module-service test suite (12 tests pass, 3 new). Verified getModule returns formatted module response. Verified null for non-existent ID. Verified all fields (description, sortOrder, status) are populated.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/lib/server/module-service.test.ts` | 0 | ✅ pass | 6005ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/server/module-service.ts`
- `src/routes/api/modules/[id]/+server.ts`
- `src/lib/server/module-service.test.ts`
