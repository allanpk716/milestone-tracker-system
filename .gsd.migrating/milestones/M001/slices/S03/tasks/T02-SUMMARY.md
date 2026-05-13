---
id: T02
parent: S03
milestone: M001
key_files:
  - src/lib/stores/decompose-state.svelte.ts
  - src/lib/components/MdViewer.svelte
  - src/lib/components/DecomposeEditor.svelte
  - src/routes/(app)/milestones/[id]/preview/+page.svelte
  - src/routes/(app)/milestones/[id]/preview/+page.server.ts
  - src/lib/components/DecomposeStream.svelte
  - src/routes/(app)/milestones/[id]/+page.svelte
key_decisions:
  - Use marked.parse() with single render + regex heading ID injection for efficient large-content rendering
  - Svelte 5 $state at module scope for shared reactive state between components
  - $bindable() for two-way module/editor binding
  - IntersectionObserver for active TOC heading tracking
  - Confirm payload built from checked modules/tasks only, filtering at submit time
duration: 
verification_result: passed
completed_at: 2026-05-12T23:42:35.592Z
blocker_discovered: false
---

# T02: Built preview/edit split page with MD viewer, TOC navigation, module editor, confirm flow, and shared decompose state

**Built preview/edit split page with MD viewer, TOC navigation, module editor, confirm flow, and shared decompose state**

## What Happened

Implemented the full preview/edit frontend for the decompose workflow:

1. **Installed `marked`** for markdown rendering (50K+ character content support via single render).
2. **Shared decompose state** (`src/lib/stores/decompose-state.svelte.ts`): Svelte 5 module with `$state` keyed by milestoneId. Exports `setPendingModules`, `getPendingModules`, `clearPendingModules`, `hasPendingModules`. Converts `DecomposeModule[]` → `EditableModule[]` with checked states.
3. **MdViewer component** (`src/lib/components/MdViewer.svelte`): Renders markdown via `marked.parse()`, extracts h1-h4 headings via `marked.lexer()` for TOC sidebar, adds `id` attributes to headings via post-processing regex, uses IntersectionObserver for active heading tracking, independent scrolling.
4. **DecomposeEditor component** (`src/lib/components/DecomposeEditor.svelte`): Renders editable module cards with checkboxes (toggle inclusion), inline-editable name/description fields, task lists with checkboxes and inline editing, "添加任务"/"添加模块" buttons, remove buttons, visual grayed-out for unchecked items. Uses `$bindable()` for two-way binding.
5. **Preview page** (`src/routes/(app)/milestones/[id]/preview/+page.svelte`): Left-right split layout (50/50), MD viewer on left, editor on right, top bar with back link and "确认拆解" button (disabled when no checked modules), success banner with auto-redirect, mobile responsive (vertical stack). Calls confirm API endpoint and navigates to detail page on success.
6. **Preview server load** (`src/routes/(app)/milestones/[id]/preview/+page.server.ts`): Loads milestone, returns 404 if not found, redirects to detail page if status != 'draft'.
7. **Updated DecomposeStream**: Added "预览编辑" button after streaming completes with modules. Stores modules in shared state and navigates to preview page via `goto()`.
8. **Updated milestone detail page**: Shows "继续编辑" link when pending modules exist in shared state for draft milestones.

## Verification

Build passes (`npm run build`), all 277 existing tests pass (`npx vitest run`), svelte-check finds no errors in new files.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | 5750ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 6770ms |
| 3 | `npx svelte-check --tsconfig ./tsconfig.json (filtered for new files)` | 0 | ✅ pass | 15000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/stores/decompose-state.svelte.ts`
- `src/lib/components/MdViewer.svelte`
- `src/lib/components/DecomposeEditor.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.server.ts`
- `src/lib/components/DecomposeStream.svelte`
- `src/routes/(app)/milestones/[id]/+page.svelte`
