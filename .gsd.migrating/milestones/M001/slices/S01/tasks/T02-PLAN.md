---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T02: Define Drizzle schema and push DB tables with WAL mode

Create the Drizzle ORM schema defining Milestone, Module, and Task tables with all fields per spec. Configure SQLite with WAL mode and proper indexes. Include: Milestone (id MS-{seq}, title, source_md, git_url, status enum, created_at), Module (id MOD-{ms}-{seq}, milestone_id FK, name, description, status enum, sort_order), Task (id TASK-{global_seq}, short_id global auto-increment, module_id FK, title, description, references as text/json, status enum with full lifecycle, assignee, sub_total/sub_done, progress_message, timestamps, commit_hash). Add indexes for task queries (status+module_id, status+reported_at). Push schema to SQLite and verify WAL mode is active. Write Vitest tests confirming table creation and basic CRUD operations.

## Inputs

- `src/lib/db/index.ts`
- `drizzle.config.ts`

## Expected Output

- `src/lib/db/schema.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npx drizzle-kit push && npm test -- --grep "db schema"
