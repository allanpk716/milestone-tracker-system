---
estimated_steps: 1
estimated_files: 6
skills_used: []
---

# T01: Kanban Server Data Loader, Task Edit API & Service Tests

Create kanban page server data loader with zombie detection (in-progress tasks not updated in >24h). Extend admin action schema to support assignee clearing for force release. Add updateTask service function and PUT /api/tasks/:id endpoint for editing task properties (title, description, assignee). Add navigation link to kanban from milestone detail page. Write vitest tests for updateTask, zombie detection, and extended admin action.

## Inputs

- `src/lib/server/task-service.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/index.ts`
- `src/lib/server/milestone-service.ts`
- `src/routes/api/tasks/[id]/+server.ts`
- `src/routes/(app)/milestones/[id]/+page.svelte`

## Expected Output

- `src/routes/(app)/milestones/[id]/kanban/+page.server.ts`
- `src/lib/server/task-service.ts`
- `src/lib/schemas/task.ts`

## Verification

npx vitest run -t "update task" && npx vitest run -t "zombie" && npm run build
