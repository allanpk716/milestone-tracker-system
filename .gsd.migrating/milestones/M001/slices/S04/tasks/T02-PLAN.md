---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T02: Kanban Page UI — Module Cards, Task Cards, Zombie Highlighting & Reference Expansion

Build the kanban page Svelte component at /milestones/[id]/kanban. Create KanbanModuleCard component: collapsible card with header showing module name, status badge, progress bar with percentage, unique agent names, sub-milestone counts (subDone/subTotal). Create KanbanTaskCard component: expanded detail view with shortId badge, title, status badge, assignee avatar, progress bar, sub-milestone values, description text, progress message. Implement zombie highlighting: amber/orange left border + ⚠️ icon with tooltip showing last update time for isZombie tasks. Create TaskRefChip component: parse #N patterns from description field, look up referenced tasks by shortId in loaded milestone data, render inline clickable chips showing referenced task title and status. All UI text in Chinese.

## Inputs

- `src/routes/(app)/milestones/[id]/kanban/+page.server.ts`
- `src/lib/components/StatusBadge.svelte`
- `src/lib/stores/toast.ts`
- `src/lib/db/schema.ts`

## Expected Output

- `src/routes/(app)/milestones/[id]/kanban/+page.svelte`
- `src/lib/components/KanbanModuleCard.svelte`
- `src/lib/components/KanbanTaskCard.svelte`
- `src/lib/components/TaskRefChip.svelte`

## Verification

npm run build
