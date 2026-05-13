---
id: S02
parent: M001
milestone: M001
provides:
  - ["POST /api/milestones/:id/decompose SSE streaming endpoint", "LLM client (src/lib/server/llm-client.ts) for OpenAI-compatible API streaming calls", "Decompose service (src/lib/server/decompose-service.ts) with incremental JSON parser and Zod validation", "DecomposeStream Svelte component for progressive module rendering", "POST-based SSE client (src/lib/client/sse-client.ts) for browser consumption"]
requires:
  - slice: S01
    provides: Database tables (Milestone/Module/Task), Zod schemas, auth middleware, milestone CRUD API, milestone service
affects:
  - ["S03"]
key_files:
  - ["src/lib/schemas/decompose.ts", "src/lib/server/llm-client.ts", "src/lib/server/decompose-service.ts", "src/lib/server/llm-client.test.ts", "src/lib/server/decompose-service.test.ts", "src/lib/server/decompose-endpoint.test.ts", "src/lib/schemas/index.ts", "src/routes/api/milestones/[id]/decompose/+server.ts", "src/lib/client/sse-client.ts", "src/lib/components/DecomposeStream.svelte", "src/routes/(app)/milestones/[id]/+page.svelte"]
key_decisions:
  - ["Used native fetch + ReadableStream instead of openai SDK for zero extra dependencies", "Incremental JSON parser tracks brace/bracket depth with string/escape state for streaming extraction from LLM JSON arrays", "POST + ReadableStream for SSE consumption instead of EventSource (which only supports GET)", "Moved endpoint test file out of routes dir because SvelteKit reserves +-prefixed files in routes directories", "Endpoint is thin wrapper over service layer for testability and reuse (S03 will reuse decompose-service)"]
patterns_established:
  - ["Fetch-based SSE streaming pattern for LLM integration (reusable for S03 comparison API)", "Incremental JSON extraction from streaming LLM output with partial failure tolerance", "Progressive UI rendering pattern: Svelte 5 $state reactivity for streaming data display"]
observability_surfaces:
  - ["SSE event types (module/error/done) provide real-time status for each decompose operation", "console.info logging of LLM request parameters and response summaries (no API key leakage)", "Error events include phase information (connecting/streaming/parsing) and original error messages", "Zod validation errors include field-level detail for debugging"]
drill_down_paths:
  - [".gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md", ".gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-12T14:50:28.778Z
blocker_discovered: false
---

# S02: LLM 流式拆解

**POST /api/milestones/:id/decompose SSE endpoint with LLM streaming, incremental JSON parsing, Zod validation, and frontend progressive module rendering (43 tests passing, build clean)**

## What Happened

## What was built

Slice S02 implements the LLM-powered milestone decomposition pipeline with streaming SSE delivery.

### T01: LLM Client, Decompose Schemas & Service (35 tests)
Created the core infrastructure:
- **LLM client** (`src/lib/server/llm-client.ts`): Fetch-based SSE streaming to OpenAI-compatible APIs. Uses native `fetch` + `ReadableStream` instead of the `openai` SDK to avoid extra dependencies. Parses SSE events from the LLM response stream.
- **Decompose schemas** (`src/lib/schemas/decompose.ts`): Zod schemas for LLM output validation — `decomposeModuleSchema` validates each module object (name, description, tasks array with title/description/estimate), `decomposeResultSchema` validates the full result.
- **Decompose service** (`src/lib/server/decompose-service.ts`): Core business logic — constructs system prompt from sourceMd, calls LLM client, implements incremental JSON parser that tracks brace/bracket depth with string/escape state awareness to extract complete module objects from the streaming JSON array. Each module is individually Zod-validated; valid ones are yielded, invalid ones are marked with error details. Includes array-unwrapping fallback for recovery.

### T02: SSE Decompose API Endpoint (8 tests)
Created the thin API wrapper:
- **POST /api/milestones/:id/decompose** (`src/routes/api/milestones/[id]/decompose/+server.ts`): Validates milestone exists, has sourceMd, and is in `draft` status. Returns a `ReadableStream` with standard SSE format (event: module/error/done + data: JSON). Core logic is in the service layer; endpoint handles precondition checks and HTTP response formatting.
- Test file moved to `src/lib/server/decompose-endpoint.test.ts` because SvelteKit reserves `+`-prefixed files in routes directories.

### T03: Frontend Streaming Decompose UI
Created the client-side streaming experience:
- **SSE client** (`src/lib/client/sse-client.ts`): POST-based SSE consumer using fetch + ReadableStream with custom SSE parser (splits on `\n\n`, extracts event/data fields).
- **DecomposeStream component** (`src/lib/components/DecomposeStream.svelte`): Self-contained Svelte 5 component managing streaming state via `$state`. Progressively renders module cards as they arrive, shows error cards with visual distinction, displays completion statistics (module/task counts, duration).
- **Milestone detail page** (`src/routes/(app)/milestones/[id]/+page.svelte`): Shows "拆解" button when milestone is draft with sourceMd. Integrates DecomposeStream component on click.

## Key decisions
- Native fetch over openai SDK — zero extra dependencies
- Incremental JSON parser tracks state (brace depth, string mode, escape) for streaming extraction
- POST + ReadableStream for SSE instead of EventSource (which only supports GET)
- Partial failure tolerance: valid modules preserved, invalid ones marked with error details
- Endpoint is thin wrapper; business logic lives in service layer for testability and reuse (S03 will reuse decompose-service)

## Integration surfaces for downstream slices
- **S03** will consume: `decompose-service.ts` for confirmation logic, `llm-client.ts` for comparison suggestions
- S03 will add: DB write for confirmed modules, LLM comparison API

## Verification

## Verification Results

### Test Suite
- **3 test files, 43 tests, all passing** (exit 0)
  - `src/lib/server/llm-client.test.ts`: LLM client SSE parsing, error handling, streaming
  - `src/lib/server/decompose-service.test.ts`: Service logic, incremental JSON parser, Zod validation, partial failures
  - `src/lib/server/decompose-endpoint.test.ts`: API endpoint preconditions, SSE formatting, error responses
- Verified via: `npx vitest run src/lib/server/decompose-service.test.ts src/lib/server/llm-client.test.ts src/lib/server/decompose-endpoint.test.ts`

### Build
- `npm run build` passes with exit 0 — client + server bundles built successfully
- Frontend components (DecomposeStream.svelte, +page.svelte) compile cleanly

### Must-Haves Checklist
1. ✅ POST /api/milestones/:id/decompose returns SSE stream with per-module events
2. ✅ Each SSE event is a Zod-validated module object or error event
3. ✅ Invalid LLM output: valid modules preserved, failed modules marked with error
4. ✅ Milestone detail page shows 拆解 button when status=draft with sourceMd
5. ✅ Progressive module card rendering during streaming, statistics on completion
6. ✅ Missing milestone / no sourceMd / non-draft returns Chinese error messages
7. ✅ All tests pass, build clean

## Requirements Advanced

- R002 — Implemented full LLM streaming decompose pipeline: POST endpoint returns SSE, incremental JSON parser extracts modules, Zod validates each module, partial failures preserved with error details

## Requirements Validated

- R002 — 43 automated tests covering SSE endpoint, LLM client streaming, incremental JSON parsing, Zod validation, partial failure handling, and precondition checks. Build passes clean.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/lib/schemas/decompose.ts` — New file: Zod schemas for decompose module and result validation
- `src/lib/server/llm-client.ts` — New file: Fetch-based LLM client with SSE streaming to OpenAI-compatible APIs
- `src/lib/server/decompose-service.ts` — New file: Decompose service with incremental JSON parser and per-module Zod validation
- `src/lib/server/llm-client.test.ts` — New file: 12 tests for LLM client SSE parsing, error handling, streaming
- `src/lib/server/decompose-service.test.ts` — New file: 23 tests for service logic, incremental parser, partial failures
- `src/lib/server/decompose-endpoint.test.ts` — New file: 8 tests for API endpoint preconditions and SSE formatting
- `src/lib/schemas/index.ts` — Updated: Added decompose schema re-exports
- `src/routes/api/milestones/[id]/decompose/+server.ts` — New file: POST endpoint returning SSE stream with module/error/done events
- `src/lib/client/sse-client.ts` — New file: POST-based SSE client with custom parser for browser consumption
- `src/lib/components/DecomposeStream.svelte` — New file: Svelte 5 component for progressive module card rendering during streaming
- `src/routes/(app)/milestones/[id]/+page.svelte` — Updated: Added decompose button and DecomposeStream integration
