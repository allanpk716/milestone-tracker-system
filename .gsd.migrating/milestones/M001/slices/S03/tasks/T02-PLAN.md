---
estimated_steps: 42
estimated_files: 7
skills_used: []
---

# T02: Build preview/edit split page with MD viewer, TOC, and module editor

Create the full preview/edit frontend:

1. **Install marked** (`npm install marked`) for markdown rendering.

2. **Shared decompose state** (`src/lib/stores/decompose-state.svelte.ts`):
   - Svelte 5 module with `$state` holding pending decompose modules (DecomposeModule[])
   - Keyed by milestoneId
   - `setPendingModules(milestoneId, modules)` and `getPendingModules(milestoneId)` functions
   - Used by DecomposeStream → stores results → preview page reads them

3. **MdViewer component** (`src/lib/components/MdViewer.svelte`):
   - Props: `sourceMd: string`
   - Uses `marked` to render markdown to HTML
   - Extracts headings (h1-h4) using `marked.lexer()` for TOC
   - Renders TOC as fixed sidebar at top of left panel with clickable links
   - Adds `id` attributes to heading elements for anchor navigation
   - Independent scrolling with `overflow-y: auto`
   - Handles 5万字 content efficiently (single render, no re-render on scroll)

4. **DecomposeEditor component** (`src/lib/components/DecomposeEditor.svelte`):
   - Props: bindable `modules` array (each module: { name, description, checked, tasks: [{ title, description, checked }] })
   - Renders module cards with:
     a. Checkbox to toggle module (unchecked = excluded from confirm)
     b. Inline-editable name (click to edit, blur to save)
     c. Inline-editable description
     d. Task list with checkboxes and inline-editable titles/descriptions
     e. "添加任务" button at bottom of each module's task list
   - "添加模块" button at bottom to add new empty module
   - Visual feedback: unchecked items grayed out
   - Independent scrolling (overflow-y: auto)

5. **Preview page** (`src/routes/(app)/milestones/[id]/preview/+page.svelte`):
   - Left-right split layout (50/50 or adjustable)
   - Left panel: MdViewer with sourceMd from milestone
   - Right panel: DecomposeEditor with modules from shared state
   - Top bar: milestone title, "返回" link back to detail page
   - Bottom bar: "确认拆解" button (disabled if no checked modules)
   - Mobile responsive: stack vertically on narrow screens

6. **Preview page server load** (`src/routes/(app)/milestones/[id]/preview/+page.server.ts`):
   - Loads milestone data (id, title, sourceMd, status)
   - Returns 404 if milestone not found
   - Redirect to detail page if status is not 'draft'

7. **Update DecomposeStream** (`src/lib/components/DecomposeStream.svelte`):
   - After streaming completes (isDone && stats), show "预览编辑" button
   - On click: store modules in shared decompose state, navigate to /milestones/[id]/preview

8. **Update milestone detail page** (`src/routes/(app)/milestones/[id]/+page.svelte`):
   - If milestone has modules in shared state and status is draft, show "继续编辑" link to preview page

## Inputs

- `src/lib/schemas/decompose.ts`
- `src/lib/client/sse-client.ts`
- `src/lib/components/DecomposeStream.svelte`
- `src/routes/(app)/milestones/[id]/+page.svelte`
- `src/routes/(app)/milestones/[id]/+page.server.ts`
- `src/lib/server/milestone-service.ts`
- `src/lib/db/schema.ts`

## Expected Output

- `src/lib/stores/decompose-state.svelte.ts`
- `src/lib/components/MdViewer.svelte`
- `src/lib/components/DecomposeEditor.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.svelte`
- `src/routes/(app)/milestones/[id]/preview/+page.server.ts`

## Verification

npx vitest run && npm run build

## Observability Impact

None — pure frontend components. State managed client-side via Svelte 5 reactivity.
