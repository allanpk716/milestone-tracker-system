---
id: T03
parent: S04
milestone: M001
key_files:
  - src/lib/stores/kanban-state.svelte.ts
  - src/lib/components/TaskContextMenu.svelte
  - src/lib/components/TaskEditModal.svelte
  - src/lib/components/KanbanTaskCard.svelte
  - src/routes/(app)/milestones/[id]/kanban/+page.svelte
key_decisions:
  - Used shared Svelte 5 $state module (kanban-state.svelte.ts) for cross-component communication instead of props/events or context API
  - Context menu items disabled (gray text) rather than hidden when status doesn't match, for discoverability
  - Admin actions use PATCH /api/tasks/:id via adminTaskActionSchema; edit uses PUT /api/tasks/:id via updateTaskSchema
  - Components rendered at page level as fixed overlays rather than inside task cards, avoiding z-index stacking issues
duration: 
verification_result: passed
completed_at: 2026-05-13T00:05:47.761Z
blocker_discovered: false
---

# T03: Extracted context menu and edit modal into shared state store and dedicated components with status-aware admin actions

**Extracted context menu and edit modal into shared state store and dedicated components with status-aware admin actions**

## What Happened

Created `kanban-state.svelte.ts` shared reactive state for context menu (task ref, position, visibility) and edit modal (task ref, visibility). Created `TaskContextMenu.svelte` as a standalone component with 9 menu items: UAT pass (review→done), UAT fail (review→in-progress), confirm merge (review→done), force release (assignee:null), reopen (done/skipped→in-progress), cancel (→skipped), pause (in-progress→blocked), resume (blocked→in-progress), edit (opens modal). Items are disabled (gray text) rather than hidden when status doesn't match. Created `TaskEditModal.svelte` with title (required), description, assignee fields, Chinese labels, validation, calls PUT /api/tasks/:id. Refactored `KanbanTaskCard.svelte` to remove the 100-line inline context menu, delegating to shared state via `openContextMenu()`. Added `TaskContextMenu` and `TaskEditModal` to the kanban page as global fixed overlays. All admin actions use PATCH endpoint with toast feedback and `invalidateAll()` for data refresh.

## Verification

Build passes (npm run build). Admin action tests pass (npx vitest run -t "admin action" — 11 passed). Context menu items correctly disabled per status. Edit modal form validates required title. Both components use Svelte 5 $state/$derived/$effect reactivity.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | 806ms |
| 2 | `npx vitest run -t 'admin action'` | 0 | ✅ pass | 9765ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/stores/kanban-state.svelte.ts`
- `src/lib/components/TaskContextMenu.svelte`
- `src/lib/components/TaskEditModal.svelte`
- `src/lib/components/KanbanTaskCard.svelte`
- `src/routes/(app)/milestones/[id]/kanban/+page.svelte`
