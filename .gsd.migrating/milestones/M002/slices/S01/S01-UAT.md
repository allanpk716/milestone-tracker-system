# S01: 结构化日志 + 健康检查 — UAT

**Milestone:** M002
**Written:** 2026-05-13T05:13:21.046Z

# S01: 结构化日志 + 健康检查 — UAT

**Milestone:** M002
**Written:** 2025-01-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All functionality is verified through automated tests (27 new tests) and grep-based structural checks; no live server runtime needed for validation.

## Preconditions

- Node.js environment with dependencies installed (`npm install`)
- Project root is `C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002`

## Smoke Test

Run `npx vitest run src/lib/server/logger.test.ts src/routes/api/health/health.test.ts` — expect 27 tests passing across 2 files.

## Test Cases

### 1. Logger writes structured output to file

1. Create a logger via `createLogger('test-module')` and call `logger.info('hello', { key: 'value' })`
2. Read the log file `logs/app-YYYY-MM-DD.log`
3. **Expected:** File contains a line with ISO timestamp, `[info]`, `[test-module]`, and `hello`

### 2. Logger respects LOG_LEVEL filtering

1. Set `LOG_LEVEL=warn` in environment
2. Call `logger.info('should be suppressed')` and `logger.warn('should appear')`
3. **Expected:** Only the warn message appears in output

### 3. Logger redacts secrets automatically

1. Call `logger.info('data', { apiKey: 'sk-secret123', token: 'Bearer abc123' })`
2. **Expected:** Output contains `[REDACTED]` for both apiKey and token values

### 4. No console.info/warn in server code

1. Run: `grep -rn "console\.\(info\|warn\)" src/lib/server/ --include="*.ts" | grep -v ".test.ts" | grep -v "logger.ts"`
2. **Expected:** Zero matches

### 5. Health endpoint returns valid response structure

1. Call `GET /api/health`
2. **Expected:** Response body contains `status`, `version`, `uptime`, `db` fields; HTTP 200

### 6. Health endpoint handles DB error gracefully

1. Inject a failing DB mock that throws an error
2. Call healthCheck with the failing mock
3. **Expected:** Returns `{ status: "degraded", db: "error:<message>" }`

### 7. Health endpoint requires no authentication

1. Confirm `/api/health` is in the `publicRoutes` array in `hooks.server.ts`
2. **Expected:** Request proceeds without auth cookies or session

### 8. Full regression suite passes

1. Run `npx vitest run`
2. **Expected:** All 363 tests pass across 17 test files

## Edge Cases

### Logger degrades gracefully when logs directory is unwritable

1. Set logs directory permissions to read-only
2. **Expected:** Logger falls back to stdout-only; no crash

### Health endpoint with missing version

1. Delete version from package.json temporarily
2. **Expected:** Returns `version: "unknown"` instead of crashing

### Log auto-rotation cleans files older than 7 days

1. Create a log file with modification date > 7 days ago
2. Trigger logger initialization
3. **Expected:** Old file is deleted; only recent logs remain

## Failure Signals

- `grep` finds console.info/warn in server files → T02 regression
- Logger tests fail → logger module broken
- Health tests fail → endpoint or DI broken
- Full suite count drops below 363 → regression introduced

## Not Proven By This UAT

- Log file writing behavior in a real production filesystem (tested via mocks)
- Actual DB connection health check against a live database (tested via DI mocks)
- Log rotation timing under real process lifecycle (singleton init tested via _resetLoggerState)
- Concurrent write safety for log files under multi-request load

## Notes for Tester

- The 9 pre-existing llm-client.test.ts failures mentioned in T03 summary have been resolved — full suite is now 363/363 green
- Client-side sse-client.ts intentionally retains `console.warn` — this is browser context, not server-side
- Logger module uses singleton pattern for file initialization; tests use `_resetLoggerState()` for isolation
