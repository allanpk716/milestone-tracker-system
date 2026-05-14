---
estimated_steps: 9
estimated_files: 6
skills_used: []
---

# T01: Create E2E test suite for deployed service validation

Create a Vitest-based E2E test suite under `tests/e2e/` that validates the deployed Milestone Tracker service. Tests target the real running service at the configured BASE_URL (default http://172.18.200.47:30002). Uses native Node.js fetch (available in Node 22, no extra deps).

The suite covers four test groups:
1. **Health check** — GET /api/health returns 200 with `{ status: 'ok', version, uptime, db: 'connected' }`
2. **Login** — POST /api/auth/login with valid ADMIN_PASSWORD returns 200 + token; invalid password returns 401
3. **API auth** — Bearer token from login grants access to GET /api/milestones; no token returns 401; invalid token returns 401
4. **Core business flow** — Create milestone (POST /api/milestones) → GET milestone by ID → PATCH milestone status to 'in-progress' → verify updated status

Configuration: BASE_URL, ADMIN_PASSWORD, and API_KEY read from env vars (E2E_BASE_URL, E2E_ADMIN_PASSWORD, E2E_API_KEY) with defaults.

E2E tests are excluded from default `npm test` by placing them outside `src/` (vitest.config.ts includes only `src/**`). Run explicitly with `npx vitest run tests/e2e/`.

Add a convenience npm script `test:e2e` in package.json.

## Inputs

- `src/routes/api/health/+server.ts`
- `src/routes/api/auth/login/+server.ts`
- `src/routes/api/milestones/+server.ts`
- `src/routes/api/milestones/[id]/+server.ts`
- `src/lib/server/auth.ts`
- `src/lib/schemas/milestone.ts`
- `src/lib/db/schema.ts`
- `src/hooks.server.ts`
- `vitest.config.ts`
- `package.json`

## Expected Output

- `tests/e2e/e2e.config.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/health.test.ts`
- `tests/e2e/auth.test.ts`
- `tests/e2e/business-flow.test.ts`
- `package.json`

## Verification

npx vitest run tests/e2e/ --config tests/e2e/e2e.config.ts passes all tests (requires running service). Existing tests unaffected: npm test passes.

## Observability Impact

E2E test runner outputs structured pass/fail per test with HTTP status codes and response snippets on failure. Each test group is independently runnable.
