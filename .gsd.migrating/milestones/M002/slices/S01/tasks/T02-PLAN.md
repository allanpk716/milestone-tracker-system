---
estimated_steps: 13
estimated_files: 5
skills_used: []
---

# T02: Replace all console.info/warn calls with structured logger

Replace all 10 server-side console.info/warn calls with module-specific loggers created via `createLogger()`.

**Files to modify (9 server-side calls):**
- `src/lib/server/llm-client.ts` (line 35): `console.info` → `logger.info` for request logging
- `src/lib/server/compare-service.ts` (lines 73, 91, 100): 3× `console.info` → `logger.info` for start/complete/error
- `src/lib/server/confirm-service.ts` (line 205): `console.info` → `logger.info` for milestone confirmed
- `src/lib/server/decompose-service.ts` (lines 192, 216, 282, 290): 4× `console.info` → `logger.info` for parse errors/validation/stream events

**Additionally, add request/response logging to hooks.server.ts:**
- Import `createLogger('request')` at top of hooks.server.ts
- Log incoming requests: method + path + user agent
- Log response: status code + duration in ms
- Skip logging for static assets and /api/health (avoid noise)

**Client-side call (sse-client.ts line 80) should be left as-is** — it's browser-side code, the logger module is server-only.

**Ensure logger is not imported in client-side code** — logger uses `node:fs` and `node:path` which are server-only.

## Inputs

- `src/lib/server/logger.ts`
- `src/lib/server/llm-client.ts`
- `src/lib/server/compare-service.ts`
- `src/lib/server/confirm-service.ts`
- `src/lib/server/decompose-service.ts`
- `src/hooks.server.ts`

## Expected Output

- `src/lib/server/llm-client.ts`
- `src/lib/server/compare-service.ts`
- `src/lib/server/confirm-service.ts`
- `src/lib/server/decompose-service.ts`
- `src/hooks.server.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && grep -rn "console\.(info|warn)" src/lib/server/ --include="*.ts" | grep -v node_modules | grep -v ".test.ts" && echo 'FAIL: console calls remain' || echo 'PASS: no server console.info/warn'

## Observability Impact

All server-side operational events now flow through structured logger with file persistence. Request lifecycle (method, path, duration) becomes observable via log files.
