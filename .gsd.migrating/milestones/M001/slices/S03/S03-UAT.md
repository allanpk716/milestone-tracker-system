# S03: 拆解预览编辑与对比 — UAT

**Milestone:** M001
**Written:** 2026-05-12T23:46:54.174Z

# UAT: S03 — 拆解预览编辑与对比

## UAT Type
Manual UI flow verification with backend integration

## Preconditions
1. SvelteKit app is running (`npm run dev`)
2. Database has a draft milestone with sourceMd content (e.g., created via S01 milestone creation flow)
3. LLM API is configured in `.env` (for compare suggestions; confirm works without it)
4. User is logged in as admin

## Test Cases

### TC1: Preview page renders left-right split
1. Navigate to a draft milestone detail page
2. Click "拆解" to trigger LLM decompose (or mock modules exist)
3. After streaming completes, click "预览编辑" button
4. **Expected:** Preview page renders at `/milestones/[id]/preview`
5. **Expected:** Left panel shows MD rich text with TOC navigation at top
6. **Expected:** Right panel shows editable module cards with task lists
7. **Expected:** Both panels scroll independently

### TC2: TOC navigation works
1. On the preview page, click a heading in the TOC sidebar
2. **Expected:** Left panel scrolls to the corresponding heading
3. **Expected:** Active heading is highlighted in TOC as user scrolls

### TC3: Module/task editing
1. On the preview page, click a module name to edit it
2. **Expected:** Name becomes editable inline
3. Edit a task description within a module card
4. **Expected:** Description updates in place
5. Click "添加任务" within a module card
6. **Expected:** A new empty task appears in the list, editable immediately
7. Click "添加模块" button
8. **Expected:** A new empty module card appears with default name

### TC4: Check/uncheck modules and tasks
1. Uncheck a module card's checkbox
2. **Expected:** Module and its tasks become visually grayed out
3. Uncheck an individual task within a checked module
4. **Expected:** That task becomes grayed out while module stays active
5. **Expected:** Confirm button still enabled (at least one module checked)

### TC5: Confirm writes to DB and activates milestone
1. Ensure at least one module is checked
2. Click "确认拆解" button
3. **Expected:** POST `/api/milestones/:id/confirm` succeeds
4. **Expected:** Modules and tasks are written to DB with correct short IDs (MOD-*, TASK-*)
5. **Expected:** Milestone status changes from `draft` to `in-progress`
6. **Expected:** Console logs show module/task counts and milestone ID

### TC6: Zero-module validation
1. Uncheck all modules
2. **Expected:** "确认拆解" button is disabled
3. **Expected:** Message "请至少选择一个模块" is visible

### TC7: Compare suggestions display (advisory, non-blocking)
1. Complete a confirm action (TC5)
2. **Expected:** CompareSuggestions modal appears with "参考性建议" label
3. **Expected:** LLM comparison text streams progressively into the modal
4. **Expected:** User can dismiss the modal at any time via "继续" button
5. **Expected:** Dismissing does not affect the confirmed data

### TC8: Edge case — navigate away with unsaved edits
1. Edit a module name on the preview page
2. Attempt to navigate away (click back link)
3. **Expected:** Browser native "unsaved changes" dialog appears
4. Confirm leaving → page navigates away
5. Cancel → stays on preview page with edits preserved

### TC9: Large MD content performance
1. Create a draft milestone with 50,000+ character MD content
2. Navigate to preview page
3. **Expected:** MD renders without visible lag
4. **Expected:** TOC extracts headings correctly
5. **Expected:** Scrolling is smooth in both panels

## Not Proven By This UAT
- Real LLM compare API responses (requires live API key and network access)
- Concurrent user editing the same preview (single-user flow by design)
- S04 kanban view rendering of confirmed modules/tasks
- S05 CLI interactions with activated milestones
- Browser compatibility beyond Chromium-based browsers

