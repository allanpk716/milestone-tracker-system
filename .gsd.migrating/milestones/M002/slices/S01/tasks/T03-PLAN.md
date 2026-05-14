---
estimated_steps: 18
estimated_files: 3
skills_used: []
---

# T03: Create GET /api/health endpoint with tests

Create a public health check endpoint that requires no authentication.

**Create `src/routes/api/health/+server.ts`:**
- Export GET handler
- Return JSON: `{ status: 'ok', version: string, uptime: number, db: 'connected' | 'error' }`
- Version read from package.json version field via import
- Uptime from `process.uptime()` (seconds as float)
- DB status: execute a simple `SELECT 1` via drizzle, catch errors → db: 'error'
- Include request logging via logger

**Wire as public route in `src/hooks.server.ts`:**
- Add '/api/health' to the publicRoutes array (alongside '/login', '/api/auth/login', '/api/auth/logout')

**Create `src/routes/api/health/health.test.ts`:**
- Test using in-memory SQLite (same pattern as lifecycle.test.ts)
- Test 1: handler returns 200 with all expected fields
- Test 2: handler returns db: 'connected' when DB is healthy
- Test 3: handler returns db: 'error' when DB query fails
- Test 4: response has correct JSON structure

**Note:** The health endpoint handler should accept db as a parameter or use a dependency injection pattern so it can be tested without relying on the global `db` singleton. Consider extracting a `healthCheck(db)` function in the route file that the handler calls.

After this task, verify existing tests still pass: `npx vitest run`

## Inputs

- `src/lib/server/logger.ts`
- `src/lib/db/index.ts`
- `src/hooks.server.ts`
- `package.json`

## Expected Output

- `src/routes/api/health/+server.ts`
- `src/routes/api/health/health.test.ts`
- `src/hooks.server.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && npx vitest run src/routes/api/health/ && npx vitest run
