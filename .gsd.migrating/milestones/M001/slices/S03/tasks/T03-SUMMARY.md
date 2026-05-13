---
id: T03
parent: S03
milestone: M001
key_files:
  - src/lib/client/sse-client.ts
  - src/lib/components/CompareSuggestions.svelte
  - src/routes/(app)/milestones/[id]/preview/+page.svelte
  - src/lib/components/DecomposeEditor.svelte
key_decisions:
  - Added postSseGeneric() as separate function rather than overloading postSse() — keeps decompose-specific typing clean while enabling generic SSE consumption for compare
  - CompareSuggestions auto-starts on mount with $effect cleanup for abort — no manual trigger needed, follows Svelte 5 lifecycle patterns
  - Beforeunload guard uses native browser dialog for unsaved edits — lightweight approach without routing library dependency
duration: 
verification_result: passed
completed_at: 2026-05-12T23:45:01.968Z
blocker_discovered: false
---

# T03: Wired confirm flow with CompareSuggestions SSE panel, generic SSE client, edge-case guards, and verified build

**Wired confirm flow with CompareSuggestions SSE panel, generic SSE client, edge-case guards, and verified build**

## What Happened

Connected the preview page to backend APIs and completed the full integration flow:

1. **SSE client extension** (`sse-client.ts`): Added `GenericSseCallbacks` interface and `postSseGeneric()` function for consuming any SSE event stream (compare suggestions, etc.) with typed callbacks for suggestion/error/done events.

2. **CompareSuggestions component** (`CompareSuggestions.svelte`): Built a modal overlay that auto-starts compare SSE on mount, progressively renders suggestion text as it streams, handles error states with retry, and provides dismiss/continue buttons. Non-blocking advisory panel with clear "参考性建议" labeling.

3. **Preview page update** (`+page.svelte`): Replaced immediate redirect after confirm with CompareSuggestions modal display. Added beforeunload guard for unsaved edits, zero-module validation ("请至少选择一个模块"), console logging of confirm outcomes (module/task counts + IDs), and proper success banner with detail link.

4. **DecomposeEditor enhancement**: Added `onchange` callback prop so the preview page can track user edits for the unsaved-changes guard.

All 277 tests pass, build is clean.

## Verification

npm run build passes clean. All 277 tests pass across 14 test files. New components compile without TypeScript errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | 797ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 9526ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/client/sse-client.ts`
- `src/lib/components/CompareSuggestions.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.svelte`
- `src/lib/components/DecomposeEditor.svelte`
