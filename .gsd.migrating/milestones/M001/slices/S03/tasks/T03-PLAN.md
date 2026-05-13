---
estimated_steps: 31
estimated_files: 4
skills_used: []
---

# T03: Wire confirm flow, compare SSE display, and verify build

Connect the preview page to backend APIs and complete the integration:

1. **Confirm handler** in preview page:
   - On "确认拆解" click: collect checked modules/tasks from DecomposeEditor state
   - POST to /api/milestones/[id]/confirm with filtered modules
   - Show loading state during API call
   - On success: store created data, proceed to compare step
   - On error: show toast with Chinese error message

2. **Compare SSE consumption** (`src/lib/client/sse-client.ts` update):
   - Add `postSseGeneric()` function or extend existing `postSse()` to support generic SSE event callbacks (onData callback for any event type)
   - Or create a simpler `fetchSseText()` that concatenates all suggestion text chunks

3. **CompareSuggestions component** (`src/lib/components/CompareSuggestions.svelte`):
   - Props: milestoneId, confirmedModules (the text summary sent to compare)
   - On mount: POST to /api/milestones/[id]/compare, consume SSE
   - Progressively renders suggestion text as it streams in
   - Shows loading spinner during streaming
   - Dismissable panel (advisory, non-blocking)
   - "继续" button to dismiss and navigate to milestone detail page

4. **Post-confirm flow** in preview page:
   - After confirm succeeds, show CompareSuggestions component
   - Compare runs automatically (non-blocking advisory)
   - User can dismiss compare panel any time
   - On dismiss: navigate to /milestones/[id] (detail page, now shows activated milestone with modules)

5. **Edge cases**:
   - Confirm called with zero modules → show error "请至少选择一个模块"
   - Confirm called on non-draft milestone → redirect to detail page
   - Compare fails → show error panel, still allow dismissal
   - Back button → confirm before leaving if edits made

6. **Build verification**:
   - Run `npm run build` — must pass clean
   - All existing tests still pass
   - New components compile without TypeScript errors

## Inputs

- `src/lib/server/confirm-service.ts`
- `src/lib/server/compare-service.ts`
- `src/routes/api/milestones/[id]/confirm/+server.ts`
- `src/routes/api/milestones/[id]/compare/+server.ts`
- `src/lib/client/sse-client.ts`
- `src/lib/components/DecomposeEditor.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.server.ts`

## Expected Output

- `src/lib/components/CompareSuggestions.svelte`

## Verification

npm run build && npx vitest run

## Observability Impact

Compare SSE events (suggestion/error/done) provide real-time status. Confirm endpoint returns structured response for audit. Console logging for confirm/compare outcomes.
