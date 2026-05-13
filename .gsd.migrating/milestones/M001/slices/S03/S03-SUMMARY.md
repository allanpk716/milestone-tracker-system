---
id: S03
parent: M001
milestone: M001
provides:
  - ["Preview/edit page at /milestones/[id]/preview with left-right split layout", "POST /api/milestones/:id/confirm endpoint (atomic DB writes + milestone activation)", "POST /api/milestones/:id/compare endpoint (SSE LLM comparison suggestions)", "Shared decompose-state store bridging S02 streaming to S03 preview", "MdViewer component with TOC navigation for large MD content", "DecomposeEditor component with check/uncheck, inline edit, add module/task", "CompareSuggestions modal component (advisory, non-blocking)", "Generic SSE client (postSseGeneric) for compare and future SSE endpoints"]
requires:
  - slice: S01
    provides: DB tables (Milestone/Module/Task), Zod schemas, milestone CRUD API, module-service (nextModuleId, createModule), task-service (nextTaskId)
  - slice: S02
    provides: LlmClient (llm-client.ts) for compare streaming, streamDecompose output feeding into preview
affects:
  - ["S04", "S06"]
key_files:
  - ["src/lib/schemas/confirm.ts", "src/lib/server/confirm-service.ts", "src/lib/server/compare-service.ts", "src/routes/api/milestones/[id]/confirm/+server.ts", "src/routes/api/milestones/[id]/compare/+server.ts", "src/lib/stores/decompose-state.svelte.ts", "src/lib/components/MdViewer.svelte", "src/lib/components/DecomposeEditor.svelte", "src/routes/(app)/milestones/[id]/preview/+page.svelte", "src/routes/(app)/milestones/[id]/preview/+page.server.ts", "src/lib/components/CompareSuggestions.svelte", "src/lib/client/sse-client.ts"]
key_decisions:
  - ["Pre-generate all IDs in async phase before synchronous better-sqlite3 transaction (MEM022/MEM024)", "Compare service outputs advisory plain text (not structured JSON) per plan — non-blocking by design", "Svelte 5 $state at module scope for cross-component shared reactive state (decompose-state.svelte.ts)", "Separate postSseGeneric() from postSse() for clean SSE client architecture", "marked.parse() with regex heading ID injection for efficient large-content rendering", "Beforeunload guard using native browser dialog for unsaved edits"]
patterns_established:
  - ["Async ID pre-generation + sync transaction for better-sqlite3 atomic writes", "Svelte 5 module-scope $state for shared cross-component state", "Generic SSE client (postSseGeneric) for non-decompose SSE endpoints", "Confirm→Compare→Activate flow pattern for milestone lifecycle"]
observability_surfaces:
  - ["Confirm service logs module/task counts and milestone ID on success/failure", "Compare service logs LLM request parameters (no key leakage) and response length", "Confirm endpoint returns structured response with created module/task IDs for audit", "Preview page console logs confirm outcomes (counts + IDs)", "Error events from compare SSE include stage (connecting/streaming) and original error messages"]
drill_down_paths:
  - [".gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md", ".gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md", ".gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-12T23:46:54.173Z
blocker_discovered: false
---

# S03: 拆解预览编辑与对比

**Built the decompose preview/edit page (left-right split: MD viewer with TOC | editable module/task cards), confirm service with atomic DB writes and milestone activation, and LLM comparison suggestions via SSE**

## What Happened

S03 delivers the full decompose preview/edit/confirm/compare workflow, bridging S02's LLM streaming output to S01's DB layer.

**T01 — Backend infrastructure (36 tests):**
- Confirm service (`confirm-service.ts`): Validates milestone preconditions (exists, draft status, has sourceMd), pre-generates all module/task IDs in async phase, then atomically inserts modules/tasks and activates milestone (draft→in-progress) in a synchronous `db.transaction()`. Returns structured response with all created IDs for audit.
- Compare service (`compare-service.ts`): Takes sourceMd + confirmed modules, constructs LLM comparison prompt, streams advisory plain-text suggestions via `LlmClient.chatCompletionStream()` as SSE events (suggestion/error/done).
- Both API endpoints with Zod validation, proper error responses, and SSE formatting.
- Key gotcha resolved: better-sqlite3 does not support async transaction callbacks, so all IDs are pre-computed before entering the transaction block.

**T02 — Frontend preview/edit page:**
- Shared decompose state store (`decompose-state.svelte.ts`): Svelte 5 `$state` at module scope, keyed by milestoneId, bridges S02's streaming results to the preview page.
- MdViewer component: Renders markdown via `marked.parse()`, extracts h1-h4 headings for TOC sidebar, uses IntersectionObserver for active heading tracking. Designed for 50K+ character content.
- DecomposeEditor component: Editable module cards with checkboxes, inline-editable name/description fields, task lists with add/remove/edit, visual distinction for unchecked items. Uses `$bindable()` for two-way binding.
- Preview page at `/milestones/[id]/preview`: 50/50 split layout, independent scrolling, confirm button with zero-module validation, mobile responsive (vertical stack).
- Updated DecomposeStream with "预览编辑" button to navigate to preview page after streaming completes.

**T03 — Integration wiring:**
- CompareSuggestions component: Modal overlay that auto-starts compare SSE on mount, progressively renders suggestion text, handles errors with retry, dismissible advisory panel labeled "参考性建议".
- Extended SSE client with `postSseGeneric()` for consuming any SSE endpoint (separate from decompose-specific `postSse()`).
- Beforeunload guard for unsaved edits using native browser dialog.
- Confirm flow: preview → confirm → compare suggestions display → milestone activated → redirect to detail page.

All 277 tests pass across 14 test files. Build is clean.

## Verification

**Build verification:** `npm run build` passes clean (exit 0).
**Test verification:** `npx vitest run` — 277 tests pass across 14 test files (0 failures).
**T01-specific:** 36 dedicated tests across confirm-service (9), compare-service (7), confirm-endpoint (10), compare-endpoint (10) covering atomic writes, ID generation, status transitions, SSE formatting, LLM streaming, and error handling.
**T02-specific:** Build passes, svelte-check clean on new files, all existing tests continue to pass.
**T03-specific:** Build passes, all 277 tests pass, new components compile without TypeScript errors.

## Requirements Advanced

- R003 — Full preview/edit split page built with MD viewer + TOC on left, editable module/task cards on right. Supports check/uncheck, inline editing, adding modules/tasks, independent scrolling.
- R004 — POST /api/milestones/:id/compare SSE endpoint built with LLM streaming. CompareSuggestions component renders advisory suggestions after confirm, dismissible and non-blocking.

## Requirements Validated

- R003 — 277 tests pass, build clean. Preview page at /milestones/[id]/preview renders left-right split with MdViewer (TOC) and DecomposeEditor (check/edit/add). Confirm writes checked items to DB atomically.
- R004 — Compare service streams LLM suggestions via SSE. CompareSuggestions component displays them in advisory modal. 36 dedicated backend tests cover the full confirm+compare flow. Build passes.

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

- `src/lib/schemas/confirm.ts` — New: Zod schemas for confirm request/response and compare SSE events
- `src/lib/schemas/index.ts` — Modified: Re-export confirm schemas
- `src/lib/server/confirm-service.ts` — New: Atomic confirm service (pre-generate IDs + sync transaction)
- `src/lib/server/compare-service.ts` — New: LLM comparison streaming service with SSE
- `src/routes/api/milestones/[id]/confirm/+server.ts` — New: POST confirm endpoint
- `src/routes/api/milestones/[id]/compare/+server.ts` — New: POST compare SSE endpoint
- `src/lib/server/confirm-service.test.ts` — New: 9 tests for confirm service
- `src/lib/server/compare-service.test.ts` — New: 7 tests for compare service
- `src/lib/server/confirm-endpoint.test.ts` — New: 10 tests for confirm endpoint
- `src/lib/server/compare-endpoint.test.ts` — New: 10 tests for compare endpoint
- `src/lib/stores/decompose-state.svelte.ts` — New: Shared reactive state bridging S02 streaming to S03 preview
- `src/lib/components/MdViewer.svelte` — New: Markdown viewer with TOC and IntersectionObserver
- `src/lib/components/DecomposeEditor.svelte` — New: Editable module/task card editor with check/uncheck
- `src/routes/(app)/milestones/[id]/preview/+page.svelte` — New: Preview page with left-right split, confirm flow, compare modal
- `src/routes/(app)/milestones/[id]/preview/+page.server.ts` — New: Server load for preview page (404/redirect guards)
- `src/lib/components/DecomposeStream.svelte` — Modified: Added '预览编辑' button after streaming
- `src/routes/(app)/milestones/[id]/+page.svelte` — Modified: Shows '继续编辑' link when pending modules exist
- `src/lib/client/sse-client.ts` — Modified: Added postSseGeneric() for generic SSE consumption
- `src/lib/components/CompareSuggestions.svelte` — New: Advisory comparison suggestions modal with SSE streaming
