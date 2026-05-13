# S02: LLM 流式拆解 — UAT

**Milestone:** M001
**Written:** 2026-05-12T14:50:28.779Z

# S02 UAT: LLM 流式拆解

## UAT Type: Manual + Automated Hybrid

## Preconditions
1. Application running locally (`npm run dev`)
2. Database seeded with at least one milestone in `draft` status with `sourceMd` content
3. Valid LLM API credentials configured in `.env` (`LLM_API_KEY`, `LLM_API_BASE_URL`, `LLM_MODEL`)
4. No existing modules/tasks for the test milestone (clean decompose state)

## Test Cases

### TC-01: Decompose Button Visibility
1. Navigate to milestone detail page for a draft milestone with sourceMd
2. **Expected**: "拆解" button is visible on the page
3. Navigate to milestone detail page for an active milestone
4. **Expected**: "拆解" button is NOT visible
5. Navigate to milestone detail page for a draft milestone without sourceMd
6. **Expected**: "拆解" button is NOT visible

### TC-02: Successful Streaming Decompose
1. Click the "拆解" button on a valid draft milestone
2. **Expected**: Module cards appear progressively (one by one) as LLM streams
3. Each module card shows: module name, description, task list (title + description + estimate)
4. After stream completes: summary statistics displayed (module count, task count, duration)
5. **Expected**: No error cards in the result

### TC-03: Partial Failure Handling
1. (Automated) Run `npx vitest run src/lib/server/decompose-service.test.ts` — tests for partial Zod validation failures
2. **Expected**: Tests pass confirming valid modules are preserved, invalid ones show error details
3. Verify error cards have visual distinction (different styling) and do not block other modules

### TC-04: Error States (API Level)
1. (Automated) Run `npx vitest run src/lib/server/decompose-endpoint.test.ts`
2. **Expected**: Tests pass confirming:
   - Non-existent milestone → 404 with Chinese error message
   - Milestone without sourceMd → 400 with Chinese error message
   - Non-draft milestone → 400 with Chinese error message

### TC-05: Build Verification
1. Run `npm run build`
2. **Expected**: Exit code 0, no errors or warnings
3. Run `npx vitest run` (full suite)
4. **Expected**: All tests pass (43 S02 tests + all existing tests)

## Edge Cases Covered
- LLM returns non-JSON output → error event, no crash
- LLM returns partial JSON array → valid modules extracted, invalid ones marked
- Network failure during streaming → error event with phase information
- Empty sourceMd → 400 precondition error (not LLM call)
- SSE event types: `module`, `error`, `done` all handled

## Not Proven By This UAT
- Actual LLM API call with real credentials (requires live API key)
- Performance with 50,000+ character sourceMd documents
- S03 confirmation write-back to database
- Concurrent decompose requests on same milestone
- Browser compatibility beyond Chromium (tested via Playwright build only)
