---
id: T02
parent: S01
milestone: M001
key_files:
  - src/lib/db/schema.ts
  - src/lib/db/schema.test.ts
key_decisions:
  - Used SQLite text columns with Drizzle enum constraint for status fields (SQLite has no native enum type)
  - Added unique index on tasks.short_id for global auto-increment references
  - Used unixepoch() as default for timestamp fields (stored as INTEGER, mapped to JS Date via Drizzle mode:'timestamp')
  - Tests use raw SQL CREATE TABLE instead of drizzle-kit/api due to ESM/CJS incompatibility in Vitest
duration: 
verification_result: passed
completed_at: 2026-05-12T09:39:41.415Z
blocker_discovered: false
---

# T02: Defined Drizzle ORM schema for Milestone/Module/Task tables with WAL mode, indexes, FK cascades, and 22 passing CRUD tests

**Defined Drizzle ORM schema for Milestone/Module/Task tables with WAL mode, indexes, FK cascades, and 22 passing CRUD tests**

## What Happened

Replaced T01's placeholder schema.ts with full Drizzle ORM definitions for three tables: Milestone (id MS-{seq}, title, source_md, git_url, status enum, created_at), Module (id MOD-{ms}-{seq}, milestone_id FK with cascade, name, description, status enum, sort_order), and Task (id TASK-{global_seq}, short_id unique auto-increment, module_id FK with cascade, title, description, references, status with 6-state lifecycle, assignee, sub_total/sub_done, progress_message, commit_hash, timestamps). Added 8 indexes including task_status_module_idx and task_status_reported_idx for query optimization. Pushed schema to SQLite via drizzle-kit push. WAL mode is set in db/index.ts on app startup and persists across connections. Foreign keys are enforced with ON DELETE CASCADE. Wrote 22 Vitest tests covering schema validation (tables, indexes, WAL, FK), milestone CRUD (7 tests), module CRUD (3 tests), and task CRUD (7 tests including lifecycle transitions, optional fields, unique constraint, cascade deletes, and indexed queries). Note: drizzle-kit/api has ESM/CJS compatibility issues with Vitest, so tests use raw SQL for table creation — this is faster and more reliable.

## Verification

drizzle-kit push succeeded (no changes — schema already applied). All 23 tests pass (22 schema tests + 1 scaffold smoke test). WAL mode verified on file-based DB. All 8 indexes present. Foreign key cascade verified in tests. Task lifecycle (todo → in-progress → blocked → in-progress → review → done) verified.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx drizzle-kit push` | 0 | ✅ pass | 3500ms |
| 2 | `npx vitest run src/lib/db/schema.test.ts` | 0 | ✅ pass | 2700ms |
| 3 | `npm test (full suite, 23 tests)` | 0 | ✅ pass | 2700ms |
| 4 | `node -e verify WAL mode + tables + indexes on file DB` | 0 | ✅ pass | 500ms |

## Deviations

Task plan verification command `npm test -- --grep "db schema"` uses Jest syntax; Vitest uses `-t` flag. The correct command is `npx vitest run -t "db schema"`.

## Known Issues

None.

## Files Created/Modified

- `src/lib/db/schema.ts`
- `src/lib/db/schema.test.ts`
