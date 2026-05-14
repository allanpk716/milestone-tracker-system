# S02: block/unblock API + CLI — UAT

**Milestone:** M003
**Written:** 2026-05-13T16:39:27.624Z

# S02: block/unblock API + CLI — UAT

**Milestone:** M003
**Written:** 2025-01-19

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All functionality verified through automated tests (74 unit + integration tests covering success, error, and JSON output paths). API routes and CLI commands follow established patterns from claim/progress/complete.

## Preconditions

- Server running (`npm run dev`) or test environment configured
- Database migrated with `blockedReason` column in tasks table
- At least one task in `in-progress` status for blocking tests
- `mt-cli` CLI package built (`npm run build` in packages/cli)

## Smoke Test

```bash
# Block a task and verify JSON output
mt-cli tasks block <in-progress-task-id> --reason "Missing OAuth config" --json
# Expected: JSON with status "blocked" and blockedReason "Missing OAuth config"

# Unblock and verify
mt-cli tasks unblock <blocked-task-id> --message "Config fixed" --json
# Expected: JSON with status "in-progress" and blockedReason null
```

## Test Cases

### 1. Block an in-progress task via API

1. `POST /api/tasks/<id>/block` with body `{ "reason": "Missing OAuth config" }`
2. **Expected:** 200 response with `status: "blocked"`, `blockedReason: "Missing OAuth config"`

### 2. Block a non-existent task

1. `POST /api/tasks/99999/block` with body `{ "reason": "test" }`
2. **Expected:** 404 response with error message

### 3. Block a task not in in-progress status

1. `POST /api/tasks/<completed-task-id>/block` with body `{ "reason": "test" }`
2. **Expected:** 409 response with `currentStatus` in error details

### 4. Unblock a blocked task via API

1. `POST /api/tasks/<blocked-task-id>/unblock` with body `{ "message": "Config fixed" }`
2. **Expected:** 200 response with `status: "in-progress"`, `blockedReason: null`

### 5. Unblock a task not in blocked status

1. `POST /api/tasks/<in-progress-task-id>/unblock` with body `{ "message": "test" }`
2. **Expected:** 409 response with `currentStatus` in error details

### 6. CLI block command with --json

1. `mt-cli tasks block <id> --reason "Blocked by dependency" --json`
2. **Expected:** Valid JSON output with task data

### 7. CLI block command human-readable output

1. `mt-cli tasks block <id> --reason "Blocked by dependency"`
2. **Expected:** Chinese-language human-readable success message

### 8. CLI unblock command with --json

1. `mt-cli tasks unblock <id> --message "Dependency resolved" --json`
2. **Expected:** Valid JSON output with task data, status "in-progress"

### 9. CLI block without --reason flag

1. `mt-cli tasks block <id>`
2. **Expected:** Error message (reason is required)

## Edge Cases

- Block request missing `reason` field → 400 validation error
- Block a task that is already blocked → 409 invalid_status error with currentStatus
- Unblock a task that is not blocked → 409 invalid_status error
- Invalid task ID format → appropriate error handling via parseTaskId

## Not Proven By This UAT

- Web kanban board displaying blocked status (visual UI verification)
- Concurrent block/unblock race conditions (no locking tested)
- Kanban blocked filter integration (frontend not tested)
