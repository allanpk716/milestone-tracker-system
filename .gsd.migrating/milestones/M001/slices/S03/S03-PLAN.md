# S03: 拆解预览编辑与对比

**Goal:** Build the decompose preview/edit page (left-right split: MD rich text with TOC | editable module/task cards), confirmation service that writes modules/tasks to DB and activates the milestone, and LLM comparison suggestions (advisory, non-blocking). Full flow: preview → edit → confirm → compare suggestions → milestone activated.
**Demo:** 左右分栏页面：左侧 MD 富文本（目录导航），右侧拆解结果卡片。可勾选/取消、编辑标题描述、追加模块和任务。确认后 LLM 对比建议（参考性），然后写入 DB 激活里程碑

## Must-Haves

- 1. Preview page renders at /milestones/[id]/preview with left-right split: MD viewer with TOC on left, editable module cards on right
- 2. Both panels scroll independently; MD viewer shows TOC navigation at top
- 3. User can check/uncheck modules and tasks (unchecked items excluded from confirm)
- 4. User can inline-edit module names, descriptions, task titles, descriptions
- 5. User can add new modules and tasks to existing modules
- 6. POST /api/milestones/:id/confirm writes checked modules/tasks to DB transactionally, assigns IDs, activates milestone (status → in-progress)
- 7. POST /api/milestones/:id/compare SSE streams LLM comparison suggestions against original sourceMd
- 8. After confirm, compare suggestions display in advisory panel (dismissable, non-blocking)
- 9. 5万字 MD content renders without lag; all tests pass; npm run build clean

## Proof Level

- This slice proves: integration — real services (confirm writes to DB, compare calls real LLM client pattern), real API endpoints, real Svelte components with editing state management

## Integration Closure

Upstream surfaces consumed:
- S02's streamDecompose (decompose-service.ts) produces the module data that feeds into the preview
- S02's LlmClient (llm-client.ts) reused for compare streaming
- S01's module-service.ts (nextModuleId, createModule) and task-service.ts (nextTaskId) reused for DB writes
- S01's milestone-service.ts (getMilestone, updateMilestone) for precondition checks and status update
- S01's Zod schemas (createModuleSchema, etc.) and DB schema (modules, tasks, milestones tables)

New wiring introduced:
- Shared decompose-state store bridges S02's streaming results to S03's preview page
- POST /api/milestones/:id/confirm endpoint writes modules/tasks/activation in one transaction
- POST /api/milestones/:id/compare endpoint streams LLM comparison after confirm
- Preview page route at /milestones/[id]/preview

What remains: S04 (kanban view), S05 (CLI tool), S06 (end-to-end integration)

## Verification

- Confirm service logs module/task counts and milestone ID on success/failure
- Compare service logs LLM request parameters (no key leakage) and response length
- Confirm endpoint returns structured response with created module/task IDs for audit
- Error events from compare SSE include stage (connecting/streaming) and original error messages

## Tasks

- [x] **T01: Build confirm service, compare service, and API endpoints with tests** `est:2h`
  Create the backend infrastructure for S03:
  - Files: `src/lib/schemas/confirm.ts`, `src/lib/server/confirm-service.ts`, `src/lib/server/compare-service.ts`, `src/routes/api/milestones/[id]/confirm/+server.ts`, `src/routes/api/milestones/[id]/compare/+server.ts`, `src/lib/server/confirm-service.test.ts`, `src/lib/server/compare-service.test.ts`, `src/lib/server/confirm-endpoint.test.ts`, `src/lib/server/compare-endpoint.test.ts`, `src/lib/schemas/index.ts`
  - Verify: npx vitest run src/lib/server/confirm-service.test.ts src/lib/server/compare-service.test.ts src/lib/server/confirm-endpoint.test.ts src/lib/server/compare-endpoint.test.ts

- [x] **T02: Build preview/edit split page with MD viewer, TOC, and module editor** `est:2.5h`
  Create the full preview/edit frontend:
  - Files: `src/lib/stores/decompose-state.svelte.ts`, `src/lib/components/MdViewer.svelte`, `src/lib/components/DecomposeEditor.svelte`, `src/routes/(app)/milestones/[id]/preview/+page.svelte`, `src/routes/(app)/milestones/[id]/preview/+page.server.ts`, `src/lib/components/DecomposeStream.svelte`, `src/routes/(app)/milestones/[id]/+page.svelte`
  - Verify: npx vitest run && npm run build

- [x] **T03: Wire confirm flow, compare SSE display, and verify build** `est:1.5h`
  Connect the preview page to backend APIs and complete the integration:
  - Files: `src/lib/components/CompareSuggestions.svelte`, `src/routes/(app)/milestones/[id]/preview/+page.svelte`, `src/lib/client/sse-client.ts`, `src/lib/stores/decompose-state.svelte.ts`
  - Verify: npm run build && npx vitest run

## Files Likely Touched

- src/lib/schemas/confirm.ts
- src/lib/server/confirm-service.ts
- src/lib/server/compare-service.ts
- src/routes/api/milestones/[id]/confirm/+server.ts
- src/routes/api/milestones/[id]/compare/+server.ts
- src/lib/server/confirm-service.test.ts
- src/lib/server/compare-service.test.ts
- src/lib/server/confirm-endpoint.test.ts
- src/lib/server/compare-endpoint.test.ts
- src/lib/schemas/index.ts
- src/lib/stores/decompose-state.svelte.ts
- src/lib/components/MdViewer.svelte
- src/lib/components/DecomposeEditor.svelte
- src/routes/(app)/milestones/[id]/preview/+page.svelte
- src/routes/(app)/milestones/[id]/preview/+page.server.ts
- src/lib/components/DecomposeStream.svelte
- src/routes/(app)/milestones/[id]/+page.svelte
- src/lib/components/CompareSuggestions.svelte
- src/lib/client/sse-client.ts
