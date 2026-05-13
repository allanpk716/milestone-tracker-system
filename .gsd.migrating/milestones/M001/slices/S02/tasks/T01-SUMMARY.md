---
id: T01
parent: S02
milestone: M001
key_files:
  - src/lib/schemas/decompose.ts
  - src/lib/server/llm-client.ts
  - src/lib/server/decompose-service.ts
  - src/lib/server/llm-client.test.ts
  - src/lib/server/decompose-service.test.ts
  - src/lib/schemas/index.ts
key_decisions:
  - Used native fetch + ReadableStream instead of openai SDK for zero extra dependencies
  - Incremental JSON parser tracks brace/bracket depth with string/escape state awareness
  - Array-unwrapping fallback: when whole-array parse fails, strip brackets and re-extract individual objects for best-effort recovery
duration: 
verification_result: passed
completed_at: 2026-05-12T13:51:07.798Z
blocker_discovered: false
---

# T01: Created LLM client (fetch-based SSE streaming), decompose Zod schemas, incremental JSON parser, and decompose service with full test coverage (35 new tests passing)

**Created LLM client (fetch-based SSE streaming), decompose Zod schemas, incremental JSON parser, and decompose service with full test coverage (35 new tests passing)**

## What Happened

Implemented the full backend pipeline for LLM-based milestone decomposition:

1. **`src/lib/schemas/decompose.ts`** — Zod schemas for DecomposeModule (name, description, tasks[]) and DecomposeTask (title, description), plus SSE event type union (module/error/done).

2. **`src/lib/server/llm-client.ts`** — Minimal OpenAI-compatible streaming client using native `fetch` + `ReadableStream`. Reads `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` from env. `chatCompletionStream()` is an AsyncGenerator yielding content deltas. Handles SSE `data:` lines, `[DONE]` signal, timeouts (30s), and HTTP errors. API key is never logged.

3. **`src/lib/server/decompose-service.ts`** — Orchestration service with:
   - Chinese system prompt instructing LLM to output structured JSON array
   - `extractCompleteJsonObjects()` — incremental parser tracking brace depth, string state, and escape state. Handles nested objects, strings containing braces, escaped chars, and cross-chunk boundaries.
   - `streamDecompose()` — reads sourceMd → calls LlmClient → incremental parse → per-module Zod validation → yields DecomposeEvents. Handles malformed JSON within arrays by stripping brackets and re-extracting individual objects. Always emits a `done` event even on errors.

4. **`src/lib/server/llm-client.test.ts`** — 12 tests covering SSE parsing, empty responses, malformed lines, HTTP errors, network failures, timeouts, and correct request body construction.

5. **`src/lib/server/decompose-service.test.ts`** — 23 tests covering the incremental JSON parser (12 edge cases: nested objects, braces in strings, escapes, partial input, etc.) and the full stream decompose flow (valid modules, Zod failures, malformed JSON, connection errors, mid-stream errors, empty responses, sequential indexing).

Key design decision: when the entire JSON array arrives as one chunk (common), we unwrap arrays and validate each element. When the array contains malformed elements, we fall back to stripping outer brackets and re-extracting individual objects — valid ones are yielded, invalid ones produce error events.

## Verification

All 35 new tests pass, plus 198 existing tests (233 total, 0 failures). Verified with `npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/llm-client.test.ts` and full suite `npx vitest run`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/llm-client.test.ts` | 0 | ✅ pass | 5635ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 7398ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/schemas/decompose.ts`
- `src/lib/server/llm-client.ts`
- `src/lib/server/decompose-service.ts`
- `src/lib/server/llm-client.test.ts`
- `src/lib/server/decompose-service.test.ts`
- `src/lib/schemas/index.ts`
