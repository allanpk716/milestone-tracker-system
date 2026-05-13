---
id: S04
parent: M001
milestone: M001
provides:
  - ["Kanban page at /milestones/[id]/kanban with server data loader and zombie detection", "KanbanModuleCard, KanbanTaskCard, TaskRefChip components", "TaskContextMenu with status-aware admin operations", "TaskEditModal for inline task editing", "kanban-state.svelte.ts shared reactive state store", "PUT /api/tasks/:id endpoint for task editing"]
requires:
  - slice: S01
    provides: Task CRUD API, module API, admin action API, auth middleware, StatusBadge/Toast components, milestone services
affects:
  []
key_files:
  - ["src/routes/(app)/milestones/[id]/kanban/+page.server.ts", "src/routes/(app)/milestones/[id]/kanban/+page.svelte", "src/lib/components/KanbanModuleCard.svelte", "src/lib/components/KanbanTaskCard.svelte", "src/lib/components/TaskRefChip.svelte", "src/lib/components/TaskContextMenu.svelte", "src/lib/components/TaskEditModal.svelte", "src/lib/stores/kanban-state.svelte.ts", "src/lib/server/task-service.ts", "src/routes/api/tasks/[id]/+server.ts", "src/lib/schemas/task.ts"]
key_decisions:
  - ["Zombie detection computed at query time (24h threshold on updatedAt) rather than stored in DB column", "Admin action schema extended with nullable assignee field for force release", "PUT endpoint for task editing separate from PATCH admin action to maintain distinct concerns", "Context menu items disabled (gray) not hidden when status doesn't match, for discoverability"]
patterns_established:
  - ["Shared Svelte 5 $state module for cross-component communication (kanban-state.svelte.ts pattern)", "Server-computed boolean flags (isZombie) enriched on task data before sending to client", "Status-aware menu items: disabled (gray text) rather than hidden, for discoverability", "Fixed-overlay rendering for context menus and modals at page level, avoiding z-index stacking issues"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-05-13T00:07:45.662Z
blocker_discovered: false
---

# S04: 看板视图与管理员操作

**Built kanban page with collapsible module cards, task detail cards, zombie highlighting, right-click admin context menu, task edit modal, and #N reference expansion chips**

## What Happened

S04 delivered a complete kanban board experience with three tasks:

**T01 — Server Data Loader & APIs:** Created the kanban page server data loader at `/milestones/[id]/kanban/+page.server.ts` that enriches task data with computed `isZombie` flags (in-progress tasks not updated in >24h). Added `updateTask` service function and `PUT /api/tasks/:id` endpoint for editing task properties (title, description, assignee). Extended the admin action schema to support nullable assignee for force-release. Added a navigation link to the kanban page from the milestone detail page. Tests: 9 update-task tests + 6 zombie-detection tests, all passing.

**T02 — Kanban Page UI:** Built the main kanban page with `KanbanModuleCard` (collapsible cards showing module name, status badge, progress bar with percentage, unique agent names, sub-milestone counts), `KanbanTaskCard` (expanded detail view with shortId badge, title, status badge, assignee avatar, progress bar, sub-milestone values, description, progress message), and `TaskRefChip` component (parses #N patterns from description/references fields, renders inline clickable chips with referenced task title and status). Zombie highlighting uses amber left border + warning strip with time-ago text. All UI text in Chinese.

**T03 — Context Menu, Edit Modal & Admin Action Wiring:** Created `kanban-state.svelte.ts` shared reactive state for selected task, context menu position/visibility, and edit modal state. Built `TaskContextMenu` component with right-click positioned menu supporting all admin operations (UAT pass/fail, confirm merge, force release, reopen, cancel, pause, resume, edit) with status-aware item disabling (gray text, not hidden). Created `TaskEditModal` with title (required), description, assignee fields with Chinese labels calling PUT /api/tasks/:id. All context menu actions wire to PATCH /api/tasks/:id with toast notifications and page refresh. Tests: 11 admin action tests passing.

## Verification

All three verification checks from the slice plan pass:
1. `npx vitest run -t "admin action"` — 11 passed (admin action schema, status transitions, assignee clearing)
2. `npx vitest run` — 309/309 passed across 14 test files (full regression)
3. `npm run build` — SSR + client built successfully with kanban route included

Zombie detection is tested at service level (6 tests). Task reference resolution is tested. Admin operations log via existing HTTP status codes (200/400/404/409). Toast notifications provide user-facing feedback for all admin operations via existing Toast component.

## Requirements Advanced

- R005 — Kanban page with module cards, task cards, progress bars, agent names, sub-milestone counts, right-click admin context menu with all operations
- R007 — TaskRefChip component parses #N references in descriptions and renders inline clickable chips with referenced task title and status
- R010 — Zombie detection computed at server level (in-progress + updatedAt > 24h), amber border + warning icon with time-ago tooltip on task cards

## Requirements Validated

None.

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

- `src/routes/(app)/milestones/[id]/kanban/+page.server.ts` — New kanban server data loader with zombie detection
- `src/routes/(app)/milestones/[id]/kanban/+page.svelte` — New kanban page with module cards, task cards, context menu, edit modal
- `src/lib/components/KanbanModuleCard.svelte` — New collapsible module card with progress bar, agent names, sub-milestone counts
- `src/lib/components/KanbanTaskCard.svelte` — New task detail card with zombie highlighting and reference expansion
- `src/lib/components/TaskRefChip.svelte` — New component for #N reference expansion into clickable task summary chips
- `src/lib/components/TaskContextMenu.svelte` — New right-click context menu with status-aware admin operations
- `src/lib/components/TaskEditModal.svelte` — New task edit modal with title, description, assignee fields
- `src/lib/stores/kanban-state.svelte.ts` — New shared reactive state for kanban context menu and edit modal
- `src/lib/server/task-service.ts` — Added updateTask function and zombie detection logic
- `src/routes/api/tasks/[id]/+server.ts` — New PUT endpoint for task editing
- `src/lib/schemas/task.ts` — Extended admin action schema with nullable assignee, added updateTaskSchema
- `src/routes/(app)/milestones/[id]/+page.svelte` — Added navigation link to kanban from milestone detail page
