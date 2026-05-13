---
estimated_steps: 29
estimated_files: 10
skills_used: []
---

# T01: Build confirm service, compare service, and API endpoints with tests

Create the backend infrastructure for S03:

1. **Zod schemas** (`src/lib/schemas/confirm.ts`): Define confirmRequestSchema (array of modules, each with name/description/tasks), compareRequestSchema. Re-export from index.ts.

2. **Confirm service** (`src/lib/server/confirm-service.ts`):
   - Takes milestoneId + array of confirmed modules (name, description, tasks[])
   - Validates milestone exists, is 'draft' status, has sourceMd
   - Uses db.transaction() to atomically:
     a. For each module: generate ID via nextModuleId pattern, insert into modules table with sortOrder = array index
     b. For each task in module: generate ID + shortId via nextTaskId pattern, insert into tasks table
     c. Update milestone status to 'in-progress'
   - Returns created modules with their tasks
   - Import nextModuleId from module-service.ts and nextTaskId from task-service.ts

3. **Compare service** (`src/lib/server/compare-service.ts`):
   - Takes sourceMd + confirmed modules/tasks as structured text
   - Constructs system prompt asking LLM to compare decomposed result against original requirements
   - Uses LlmClient.chatCompletionStream() to stream comparison text
   - Yields SSE events: { type: 'suggestion', content: string } for text chunks, { type: 'done' } on completion, { type: 'error', message } on failure
   - Output is advisory plain text, not structured JSON

4. **Confirm endpoint** (`src/routes/api/milestones/[id]/confirm/+server.ts`):
   - POST handler: validates body with confirmRequestSchema, calls confirmService, returns JSON with created data
   - Precondition checks: milestone exists, status is 'draft'

5. **Compare endpoint** (`src/routes/api/milestones/[id]/compare/+server.ts`):
   - POST handler: reads milestone sourceMd, calls compareService, returns SSE ReadableStream
   - Precondition: milestone exists

6. **Tests** (4 test files):
   - `src/lib/server/confirm-service.test.ts`: Transactional write, ID generation, status update, precondition failures
   - `src/lib/server/compare-service.test.ts`: LLM streaming, error handling, prompt construction
   - `src/lib/server/confirm-endpoint.test.ts`: API preconditions, success response, validation errors
   - `src/lib/server/compare-endpoint.test.ts`: SSE formatting, error responses
   - Use in-memory SQLite + mock LlmClient (same pattern as S02 tests)

## Inputs

- `src/lib/server/module-service.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/milestone-service.ts`
- `src/lib/server/llm-client.ts`
- `src/lib/server/decompose-service.ts`
- `src/lib/schemas/decompose.ts`
- `src/lib/schemas/common.ts`
- `src/lib/schemas/module.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/index.ts`
- `src/lib/db/schema.ts`
- `src/lib/db/index.ts`
- `src/routes/api/milestones/[id]/decompose/+server.ts`

## Expected Output

- `src/lib/schemas/confirm.ts`
- `src/lib/server/confirm-service.ts`
- `src/lib/server/compare-service.ts`
- `src/routes/api/milestones/[id]/confirm/+server.ts`
- `src/routes/api/milestones/[id]/compare/+server.ts`
- `src/lib/server/confirm-service.test.ts`
- `src/lib/server/compare-service.test.ts`
- `src/lib/server/confirm-endpoint.test.ts`
- `src/lib/server/compare-endpoint.test.ts`

## Verification

npx vitest run src/lib/server/confirm-service.test.ts src/lib/server/compare-service.test.ts src/lib/server/confirm-endpoint.test.ts src/lib/server/compare-endpoint.test.ts

## Observability Impact

Confirm service logs transaction outcome (module count, task count, milestone ID). Compare service logs LLM request params (no key) and response length. Confirm endpoint returns structured JSON with all created IDs for audit. Compare SSE includes error events with stage info.
