---
estimated_steps: 1
estimated_files: 9
skills_used: []
---

# T06: Build milestone overview list page and detail page skeleton

Create the frontend pages: (1) Root page `src/routes/+page.svelte` — milestone overview list showing all milestones with status badge (draft/active/completed), title, git_url, created_at, and a 'create milestone' button. Each milestone card links to its detail page. (2) Milestone detail page `src/routes/milestones/[id]/+page.svelte` — shows milestone info (title, status, git_url, source_md preview), module list with tasks, status badges, and progress bars. This is a skeleton that will be enhanced by S04 (kanban view) and S02 (decompose). (3) Create milestone dialog/form — a modal or page for creating a new milestone (paste MD, enter title, git_url). All UI in Chinese. Use TailwindCSS for styling. Pages fetch data from the API endpoints. Handle loading states and errors with toast notifications. Verify by running dev server and checking pages render correctly.

## Inputs

- `src/routes/api/milestones/+server.ts`
- `src/routes/api/milestones/[id]/+server.ts`
- `src/app.css`
- `src/routes/login/+page.svelte`

## Expected Output

- `src/routes/+page.svelte`
- `src/routes/+layout.svelte`
- `src/routes/milestones/[id]/+page.svelte`
- `src/routes/milestones/create/+page.svelte`
- `src/lib/components/MilestoneCard.svelte`
- `src/lib/components/StatusBadge.svelte`
- `src/lib/components/TaskCard.svelte`
- `src/lib/components/ModuleSection.svelte`
- `src/lib/components/Toast.svelte`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm run build
