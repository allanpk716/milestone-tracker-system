# S04: 看板视图与管理员操作 — UAT

**Milestone:** M001
**Written:** 2026-05-13T00:07:45.663Z

# S04 UAT: 看板视图与管理员操作

## UAT Type
Manual UI Verification (supplemented by automated tests)

## Preconditions
1. Application running (`npm run dev`)
2. Logged in as admin on Web UI
3. An active milestone exists with modules and tasks in various statuses (todo, in-progress, review, done)
4. At least one task has been in-progress for >24h (to test zombie detection)
5. Some task descriptions contain #N references to other tasks

## Test Steps

### 1. Kanban Page Loading
1. Navigate to `/milestones/[id]/kanban`
2. **Expected:** Page loads without errors. Module cards are displayed in a list.

### 2. Module Card Collapsed View
1. Observe a collapsed module card
2. **Expected:** Card shows module name, status badge, progress bar with percentage, unique agent names (if any), sub-milestone counts (done/total)

### 3. Module Card Expand/Collapse
1. Click on a collapsed module card header
2. **Expected:** Card expands to show task detail cards
3. Click again
4. **Expected:** Card collapses back to summary view

### 4. Task Detail Card
1. Expand a module card
2. Observe a task detail card
3. **Expected:** Card shows shortId badge, title, status badge, assignee (if any), progress bar, sub-milestone values, description text, progress message

### 5. Zombie Task Highlighting
1. Find a task that has been in-progress for >24h
2. **Expected:** Task card has amber/orange left border and ⚠️ warning icon with tooltip showing last update time

### 6. #N Reference Expansion
1. Find a task whose description contains `#1` or similar reference
2. **Expected:** The #N text is replaced with a clickable chip showing the referenced task's title and status color
3. Hover over the chip
4. **Expected:** Chip shows task summary info

### 7. Right-Click Context Menu
1. Right-click on a task card
2. **Expected:** Context menu appears at cursor position with all admin operations listed
3. **Expected:** Menu items are enabled/disabled based on task status (e.g., "UAT 通过" only enabled for review-status tasks, "强制释放" only for in-progress tasks)

### 8. Admin Action — Force Release
1. Right-click an in-progress task → select "强制释放"
2. **Expected:** Toast notification appears confirming action
3. **Expected:** Task status returns to todo, assignee is cleared

### 9. Admin Action — Cancel Task
1. Right-click a todo/in-progress task → select "取消"
2. **Expected:** Task status changes to skipped, toast confirms

### 10. Task Edit Modal
1. Right-click any task → select "编辑任务"
2. **Expected:** Modal opens with title (required), description, assignee fields with Chinese labels
3. Edit the title and click save
4. **Expected:** Toast confirms update, task card reflects new title

### 11. Navigation
1. From milestone detail page (`/milestones/[id]`)
2. **Expected:** A link/button exists to navigate to the kanban view

### 12. Build Verification
1. Run `npm run build`
2. **Expected:** Build completes without errors

## Edge Cases
- Task with no assignee should show no assignee section
- Module with 0 tasks should show 0% progress
- Non-existent #N reference should show "#N (引用的任务不存在)" text
- Context menu should close when clicking elsewhere

## Not Proven By This UAT
- Concurrent admin operations from multiple browser tabs
- Performance with 50+ tasks in a single milestone
- Accessibility compliance (keyboard navigation, screen reader)
- Mobile/responsive layout
