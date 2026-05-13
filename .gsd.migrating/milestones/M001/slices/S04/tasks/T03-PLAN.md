---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Context Menu, Task Edit Modal & Admin Action Wiring

Create kanban-state.svelte.ts shared reactive state for selected task, context menu position/visibility, and edit modal state. Create TaskContextMenu component: right-click positioned menu with status-aware admin operations. Action-to-status mapping: UAT pass (review→done), UAT fail (review→in-progress), confirm merge (review→done with progressMessage), force release (in-progress→todo + assignee:null), reopen (done→in-progress), cancel (non-terminal→skipped), pause (in-progress→blocked), resume (blocked→in-progress), edit (opens modal). Items disabled (gray text, not hidden) when status doesn't match. Create TaskEditModal: form with title (required), description (optional), assignee (optional) fields, Chinese labels, calls PUT /api/tasks/:id. Wire all context menu actions to PATCH /api/tasks/:id with appropriate status values. After each action, show toast notification and refresh task data from server.

## Inputs

- `src/lib/components/KanbanTaskCard.svelte`
- `src/routes/(app)/milestones/[id]/kanban/+page.svelte`
- `src/lib/stores/toast.ts`
- `src/lib/server/task-service.ts`
- `src/lib/schemas/task.ts`

## Expected Output

- `src/lib/stores/kanban-state.svelte.ts`
- `src/lib/components/TaskContextMenu.svelte`
- `src/lib/components/TaskEditModal.svelte`

## Verification

npm run build && npx vitest run -t "admin action"
