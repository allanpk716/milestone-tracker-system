---
id: T02
parent: S04
milestone: M001
key_files:
  - src/routes/(app)/milestones/[id]/kanban/+page.svelte
  - src/lib/components/KanbanModuleCard.svelte
  - src/lib/components/KanbanTaskCard.svelte
  - src/lib/components/TaskRefChip.svelte
key_decisions:
  - Used $derived.by() for complex reactive Map/filtered-array computations in Svelte 5 (not $derived wrapping a function call)
  - Right-click context menu uses PATCH /api/tasks/:id for all admin actions with toast feedback and page reload
  - Zombie highlighting uses amber left border + warning strip with time-ago text (computed client-side from updatedAt)
  - #N reference expansion scans both description and references fields, renders as clickable status-colored chips
duration: 
verification_result: passed
completed_at: 2026-05-13T00:03:31.717Z
blocker_discovered: false
---

# T02: Built kanban page with collapsible module cards, task detail cards, zombie highlighting, right-click admin menu, and #N reference expansion chips

**Built kanban page with collapsible module cards, task detail cards, zombie highlighting, right-click admin menu, and #N reference expansion chips**

## What Happened

Created four Svelte components for the kanban view:

1. **TaskRefChip.svelte** — Parses #N patterns from task description/references text, looks up referenced tasks by shortId in a flat Map, renders clickable status-colored chips with task title. Unresolvable references shown as muted fallback chips.

2. **KanbanTaskCard.svelte** — Task detail card with shortId badge, title, StatusBadge, assignee avatar (first letter in circle), progress bar with sub-milestone counts, description/references rendered through TaskRefChip for #N expansion, progress message. Zombie tasks get amber left border, ⚠️ warning strip with "last updated X hours/days ago" tooltip. Right-click context menu provides all admin operations: UAT pass/fail, confirm merge, force release (clears assignee), reopen, cancel, pause/resume. All actions call PATCH /api/tasks/:id with toast feedback and page reload.

3. **KanbanModuleCard.svelte** — Collapsible card with header showing module name, StatusBadge, progress bar with percentage, sub-milestone totals, agent name avatars (up to 3 + overflow count), task completion ratio. Expanded view renders KanbanTaskCard for each task.

4. **+page.svelte** — Main kanban page with breadcrumb, milestone header, overall progress bar, stats row (modules/tasks/in-progress/zombie counts), status filter pills (全部/待办/进行中/阻塞/审核中/已完成/已跳过), and filtered module card list. Builds flat taskMap from all modules/tasks for #N ref resolution.

Fixed Svelte 5 reactivity: used $derived.by() for complex derived computations (taskMap, filteredModules) instead of wrapping $derived in functions.

All 309 tests pass, build succeeds cleanly.

## Verification

Ran `npx vitest run -t "update task"` (9 passed, exit 0), `npx vitest run` (309/309 passed), and `npm run build` (success with kanban route included at 9.92KB).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run -t "update task"` | 0 | ✅ pass | 6240ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 6650ms |
| 3 | `npm run build` | 0 | ✅ pass | 5900ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/routes/(app)/milestones/[id]/kanban/+page.svelte`
- `src/lib/components/KanbanModuleCard.svelte`
- `src/lib/components/KanbanTaskCard.svelte`
- `src/lib/components/TaskRefChip.svelte`
