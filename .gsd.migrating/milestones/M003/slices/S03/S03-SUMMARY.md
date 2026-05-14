---
id: S03
parent: M003
milestone: M003
provides:
  - ["complete --evidence and --files-touched CLI options and server endpoint", "GET /api/modules/[id] single module retrieval endpoint", "modules list and show CLI commands with --json support", "Task evidence_json and files_touched DB columns"]
requires:
  - slice: S01
    provides: --json output pattern (outputJson/outputJsonError)
affects:
  - ["S04"]
key_files:
  - ["src/lib/db/schema.ts", "src/lib/schemas/task.ts", "src/lib/server/task-service.ts", "src/routes/api/tasks/[id]/complete/+server.ts", "src/routes/api/modules/[id]/+server.ts", "src/lib/server/module-service.ts", "packages/cli/src/commands/complete.ts", "packages/cli/src/commands/modules-list.ts", "packages/cli/src/commands/modules-show.ts", "packages/cli/src/types.ts", "packages/cli/src/index.ts"]
key_decisions:
  - (none)
patterns_established:
  - ["JSON text columns for structured array data in SQLite with parse-on-read pattern", "CLI evidence submission with Zod-validated JSON input arrays"]
observability_surfaces:
  - ["Task evidence_json and files_touched provide verification audit trail for completed tasks"]
drill_down_paths:
  - [".gsd/milestones/M003/slices/S03/tasks/T01-SUMMARY.md", ".gsd/milestones/M003/slices/S03/tasks/T02-SUMMARY.md", ".gsd/milestones/M003/slices/S03/tasks/T03-SUMMARY.md", ".gsd/milestones/M003/slices/S03/tasks/T04-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-13T16:58:26.514Z
blocker_discovered: false
---

# S03: complete 验证证据 + modules 命令

**Extended complete command with --evidence and --files-touched options, added GET /api/modules/[id] endpoint, and added modules list/show CLI commands with --json support**

## What Happened

S03 delivers two major capabilities for AI agent task lifecycle management:

**1. Evidence-based task completion (T01, T02):** Extended the task completion flow to accept structured verification evidence. On the server side, added `evidence_json` and `files_touched` text columns to the tasks DB schema. The `completeTaskSchema` Zod validation accepts optional `evidence` (array of {command, exitCode, verdict} objects, capped at 50) and `filesTouched` (array of file paths, capped at 200). The complete endpoint persists these as JSON text; formatTaskResponse parses them on read. Empty arrays are stored as NULL for DB cleanliness. On the CLI side, the `complete` command now accepts `--evidence <json>` and `--files-touched <json>` options, parsing and validating them before inclusion in the POST body. The existing `--json` flag outputs the enriched response.

**2. Module visibility commands (T03, T04):** Added `getModule(db, id)` service function and a new `GET /api/modules/[id]` server endpoint returning 404 for missing modules. Created two CLI commands: `mt-cli modules list` (fetches modules for configured milestoneId) and `mt-cli modules show <id>` (fetches a single module by ID). Both support `--json` flag following S01 output patterns.

All 156 tests pass across server (103) and CLI (53) test suites, including 23 new tests covering evidence submission, module retrieval, JSON output, and error paths.

## Verification

All four task verification checks pass:
- T01: 103 server-side tests pass (task-service.test.ts 91, schema.test.ts 12) — evidence persistence, parsing, empty-array-as-null, backward compatibility verified
- T02: 53 CLI tests pass (json-commands.test.ts) — --evidence and --files-touched JSON parsing, POST body inclusion, combined usage, invalid JSON rejection verified
- T03: 12 module-service tests pass (3 new) — getModule returns formatted response, null for non-existent ID, all fields populated
- T04: 53 CLI tests pass (12 new modules-commands tests) — list/show --json output, HTTP errors (401/404/500), human-readable exit codes

## Requirements Advanced

- R009 — Extended complete with evidence validation and added modules commands, all with structured --json output

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

- `src/lib/db/schema.ts` — Added evidence_json and files_touched nullable text columns to tasks table
- `src/lib/schemas/task.ts` — Extended completeTaskSchema with optional evidence and filesTouched arrays
- `src/lib/server/task-service.ts` — Updated completeTask to persist evidence/filesTouched as JSON; formatTaskResponse parses them on read
- `src/routes/api/tasks/[id]/complete/+server.ts` — Updated to pass evidence/filesTouched from validated body to completeTask
- `src/lib/server/module-service.ts` — Added getModule(db, id) function for single module retrieval
- `src/routes/api/modules/[id]/+server.ts` — New GET endpoint returning module by ID or 404
- `packages/cli/src/types.ts` — Added evidenceJson and filesTouched to TaskResponse type
- `packages/cli/src/commands/complete.ts` — Added --evidence and --files-touched CLI options with JSON parsing and validation
- `packages/cli/src/commands/modules-list.ts` — New modules list command calling GET /api/milestones/{id}/modules
- `packages/cli/src/commands/modules-show.ts` — New modules show command calling GET /api/modules/{id}
- `packages/cli/src/index.ts` — Registered modules command group with list and show subcommands
- `src/lib/server/task-service.test.ts` — Added 8 tests for evidence persistence, parsing, empty arrays, backward compatibility
- `src/lib/db/schema.test.ts` — Updated CREATE_TABLES_SQL to include new columns
- `src/lib/server/module-service.test.ts` — Added 3 tests for getModule function + updated CREATE_TABLES_SQL
- `packages/cli/src/__tests__/json-commands.test.ts` — Added tests for --evidence and --files-touched CLI options
- `packages/cli/src/__tests__/modules-commands.test.ts` — New 12 tests for modules list/show commands covering JSON, errors, human-readable modes
