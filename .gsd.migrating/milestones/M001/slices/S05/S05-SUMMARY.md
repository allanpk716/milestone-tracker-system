---
id: S05
parent: M001
milestone: M001
provides:
  - ["mt-cli CLI tool with 7 commands (status, list, claim, progress, complete, show, mine)", "Layered config resolution system for per-project settings", "Concurrent claim verification proving 409 optimistic lock behavior", "Chinese output with LLM-friendly error messages across all commands"]
requires:
  - slice: S01
    provides: Task CRUD API (GET/PATCH /api/tasks/*), task operations (claim/progress/complete), Bearer token auth middleware
affects:
  - ["S06"]
key_files:
  - (none)
key_decisions:
  - ["Layered config resolution: cwd .mt-cli.json → ~/.mt-cli.json fallback, API key from MT_API_KEY env → .mt-env → config field", "All CLI errors use structured MtCliError with Chinese natural language: HTTP status + description + actionable suggestion", "Task ID resolution supports #N, TASK-{seq}, and bare number; short IDs resolved via API list call", "Concurrent claim tests use sequential mock responses to verify optimistic lock without real parallel HTTP"]
patterns_established:
  - ["CLI config travels with project (.mt-cli.json) with user-level fallback", "Chinese-first error output targeting LLM consumers with next-step guidance", "Multi-format task ID input with automatic short-ID-to-full-ID resolution"]
observability_surfaces:
  - none
drill_down_paths:
  - [".gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md", ".gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md", ".gsd/milestones/M001/slices/S05/tasks/T03-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-13T00:27:05.113Z
blocker_discovered: false
---

# S05: CLI 工具与并发验证

**Built mt-cli with all 7 commands (list/claim/progress/complete/show/mine/status), layered config resolution, Bearer token auth, Chinese output, and concurrent claim verification proving 409 optimistic lock behavior**

## What Happened

## Narrative

Slice S05 delivered the complete mt-cli command-line tool for AI Agents to interact with the Milestone Tracker system, plus concurrency verification proving the optimistic lock mechanism.

### T01: CLI Package Scaffold, Config, HTTP Client, Status Command
Created the CLI package at `packages/cli/` using Commander.js. Implemented layered config resolution (project `.mt-cli.json` → user `~/.mt-cli.json`, API key from `MT_API_KEY` env → `.mt-env` file → config field). Built `MtClient` HTTP wrapper using native fetch with AbortController timeout, Bearer token injection, and structured `MtCliError` that wraps all API errors into Chinese messages with status codes and actionable suggestions. Implemented `mt-cli status` command displaying server connectivity, milestone info, and agent identity. 24 unit tests covering config resolution (10) and HTTP client (14).

### T02: All 6 Task Commands
Implemented `list` (with status filter, default excludes done/skipped), `claim` (with 409 conflict Chinese guidance), `progress` (with sub-task tracking and ASCII progress bar), `complete` (with commit hash), `show` (with `#N` reference resolution in descriptions, graceful handling of missing refs), and `mine` (client-side filtering by agent name, sorted by status priority). Added shared utilities: `format.ts` with Chinese status labels and ASCII progress bar, `id.ts` with multi-format task ID parsing (#N, TASK-{seq}, bare number). 47 new tests. Total suite: 71 tests passing.

### T03: Concurrent Claim Verification & Error Output Tests
Wrote 44 additional tests in two files: `concurrency.test.ts` (15 tests) proving optimistic lock behavior — two agents claiming the same task, one succeeds and one gets 409; status-based rejections for claimed/completed/skipped/review/blocked tasks; same-agent re-claim idempotency. `error-output.test.ts` (29 tests) verifying Chinese error messages for all HTTP status codes (400/401/404/409/500), non-JSON responses, timeout/network errors, fallback messages, and stderr logging. Full project build (`npm run build`) passes with CLI package integrated. Final test count: 115/115 passing.

### Key Architecture Decisions
- Config travels with project via `.mt-cli.json`, with user-level `~/.mt-cli.json` fallback
- All errors output structured Chinese with HTTP status + description + actionable suggestion
- Task ID resolution supports #N, TASK-{seq}, and bare number formats
- Concurrent claim tests use sequential mock responses to simulate optimistic lock without real parallel HTTP

## Verification

## Verification Results

All slice-level verification checks passed:

1. **CLI test suite**: 115/115 tests pass across 5 test files
   - Config resolution: 10 tests (cwd config, home fallback, env var override, .mt-env, missing config, malformed JSON)
   - HTTP client: 14 tests (Bearer auth, headers, responses, error handling, timeout, network failure)
   - Command modules: 47 tests (all 6 commands, ID parsing, Chinese output, format utilities)
   - Concurrency: 15 tests (optimistic lock 409, status-based rejections, same-agent idempotency)
   - Error output: 29 tests (Chinese messages for all status codes, fallbacks, non-JSON, logging)

2. **TypeScript compilation**: `npx tsc --noEmit` — zero errors

3. **Full project build**: `npm run build` — exit 0, SvelteKit production build succeeds with CLI package

4. **CLI binary**: `node dist/index.js --help` shows all 7 commands with Chinese descriptions

## Requirements Advanced

- R006 — Implemented all 7 mt-cli commands (list/claim/progress/complete/show/mine/status) with project-level config and API key auth
- R009 — Concurrent claim tests prove optimistic lock: 15 tests verifying 409 Conflict on duplicate claims, status-based rejections
- R011 — All CLI output in Chinese with structured error messages, Chinese status labels, and ASCII progress bars
- R007 — Show command resolves #N references inline with graceful handling of missing tasks

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

Concurrent claim tests use mocked HTTP responses rather than real parallel HTTP requests; end-to-end concurrency will be validated in S06 integration testing.

## Follow-ups

None.

## Files Created/Modified

- `packages/cli/package.json` — CLI package manifest with Commander.js, Vitest, TypeScript deps
- `packages/cli/tsconfig.json` — TypeScript config for CLI package
- `packages/cli/vitest.config.ts` — Vitest test configuration
- `packages/cli/src/config.ts` — Layered config resolution (project → user, env → file → config)
- `packages/cli/src/client.ts` — MtClient HTTP wrapper with Bearer auth, Chinese error wrapping
- `packages/cli/src/types.ts` — TaskResponse and API type definitions
- `packages/cli/src/utils/id.ts` — Task ID parsing (#N, TASK-{seq}, bare number) and resolution
- `packages/cli/src/utils/format.ts` — Chinese status labels, ASCII progress bar, date formatting
- `packages/cli/src/commands/status.ts` — Status command — server connectivity, milestone, agent identity
- `packages/cli/src/commands/list.ts` — List command with status filter
- `packages/cli/src/commands/claim.ts` — Claim command with 409 conflict guidance
- `packages/cli/src/commands/progress.ts` — Progress command with sub-task tracking
- `packages/cli/src/commands/complete.ts` — Complete command with commit hash
- `packages/cli/src/commands/show.ts` — Show command with #N reference resolution
- `packages/cli/src/commands/mine.ts` — Mine command — agent-filtered task list
- `packages/cli/src/index.ts` — CLI entry point with Commander.js program setup
- `packages/cli/src/__tests__/config.test.ts` — 10 config resolution tests
- `packages/cli/src/__tests__/client.test.ts` — 14 HTTP client tests
- `packages/cli/src/__tests__/commands.test.ts` — 47 command module tests
- `packages/cli/src/__tests__/concurrency.test.ts` — 15 concurrent claim verification tests
- `packages/cli/src/__tests__/error-output.test.ts` — 29 error output formatting tests
