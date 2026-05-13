---
estimated_steps: 1
estimated_files: 10
skills_used: []
---

# T05: Implement Milestone CRUD API and admin action endpoints

Implement all REST API endpoints for milestone management and task/module operations that S04 and S05 depend on. Create SvelteKit server routes under `src/routes/api/`. Milestone routes: POST /api/milestones (create with source_md, git_url, title, assign MS-{seq} ID), GET /api/milestones (list all), GET /api/milestones/:id (detail with modules+tasks), PATCH /api/milestones/:id (update title/git_url/status). Module routes: GET /api/milestones/:id/modules, PATCH /api/modules/:id, POST /api/milestones/:id/modules (add module). Task routes: GET /api/tasks (query by status/milestone/module), GET /api/tasks/:id (detail with reference resolution), POST /api/tasks/:id/claim (optimistic lock, 409 on conflict), POST /api/tasks/:id/progress, POST /api/tasks/:id/complete, PATCH /api/tasks/:id (admin actions: uat-pass, uat-fail, merge, force-unclaim, reopen, cancel, halt, resume, edit). Use Zod schemas for request validation. Apply auth middleware. Return proper HTTP status codes (200/201/400/401/404/409). Write integration tests covering: full CRUD cycle, status transitions, claim conflict (409), invalid action for current status (400).

## Inputs

- `src/lib/db/schema.ts`
- `src/lib/schemas/index.ts`
- `src/lib/server/auth.ts`
- `src/hooks.server.ts`

## Expected Output

- `src/routes/api/milestones/+server.ts`
- `src/routes/api/milestones/[id]/+server.ts`
- `src/routes/api/milestones/[id]/modules/+server.ts`
- `src/routes/api/modules/[id]/+server.ts`
- `src/routes/api/tasks/+server.ts`
- `src/routes/api/tasks/[id]/+server.ts`
- `src/routes/api/tasks/[id]/claim/+server.ts`
- `src/routes/api/tasks/[id]/progress/+server.ts`
- `src/routes/api/tasks/[id]/complete/+server.ts`
- `src/routes/api/modules/[id]/tasks/+server.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm test -- --grep "api"
