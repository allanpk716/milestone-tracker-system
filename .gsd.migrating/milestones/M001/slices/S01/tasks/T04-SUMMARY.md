---
id: T04
parent: S01
milestone: M001
key_files:
  - src/lib/server/auth.ts
  - src/hooks.server.ts
  - src/routes/api/auth/login/+server.ts
  - src/routes/api/auth/logout/+server.ts
  - src/routes/login/+page.svelte
  - src/app.d.ts
  - src/lib/server/auth.test.ts
key_decisions:
  - Stateless signed session tokens (HMAC-SHA256) instead of server-side session store — no DB table needed, simpler deployment
  - Bearer token checked before cookie in checkAuth() — CLI/API usage takes priority, invalid bearer does NOT fall through to cookie (prevents accidental auth method confusion)
  - Session secret derived from ADMIN_PASSWORD via HMAC salt — avoids requiring a separate SESSION_SECRET env var
  - timingSafeEqual used for all comparisons to prevent timing attacks on password and API key validation
duration: 
verification_result: passed
completed_at: 2026-05-12T09:46:14.854Z
blocker_discovered: false
---

# T04: Implemented dual auth (cookie session + Bearer token) with login/logout API, auth guard hook, Chinese login page, and 38 passing tests

**Implemented dual auth (cookie session + Bearer token) with login/logout API, auth guard hook, Chinese login page, and 38 passing tests**

## What Happened

Implemented the complete auth middleware stack for T04:

1. **`src/lib/server/auth.ts`** — Core auth module with stateless signed session tokens (HMAC-SHA256), Bearer token validation against comma-separated API_KEYS from .env, password validation via timingSafeEqual, and pure checkAuth() function usable by both tests and hooks.

2. **`src/hooks.server.ts`** — SvelteKit server hook that protects /api/* routes (returning 401 JSON) and page routes (redirecting to /login), with public routes (/login, /api/auth/*) exempted. Attaches authMethod to event.locals.

3. **`src/routes/api/auth/login/+server.ts`** — POST endpoint that validates password against ADMIN_PASSWORD via Zod schema + timingSafeEqual, creates signed session, sets HttpOnly cookie.

4. **`src/routes/api/auth/logout/+server.ts`** — POST endpoint that clears session cookie.

5. **`src/routes/login/+page.svelte`** — Chinese UI login page (title: 里程碑管理系统) with password form, error toast, loading state, and TailwindCSS styling.

6. **`src/app.d.ts`** — Added authMethod to App.Locals interface.

7. **`src/lib/server/auth.test.ts`** — 38 tests covering session CRUD, tamper detection, Bearer token validation, password validation, header extraction, and full checkAuth middleware logic.

Fixed timingSafeEqual RangeError by adding byte-length guards. Fixed tamper test by modifying token portion instead of last char (avoids collision when last char already equals replacement).

## Verification

Full test suite passes (147 tests, 4 files). Build succeeds. Auth tests specifically cover: session create/verify/destroy, tampered token rejection, Bearer token accept/reject, password validation, header extraction, checkAuth with all credential combinations (bearer, cookie, both, neither, invalid).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run --testNamePattern "auth"` | 0 | ✅ pass | 6177ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 6165ms |
| 3 | `npm run build` | 0 | ✅ pass | 799ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/server/auth.ts`
- `src/hooks.server.ts`
- `src/routes/api/auth/login/+server.ts`
- `src/routes/api/auth/logout/+server.ts`
- `src/routes/login/+page.svelte`
- `src/app.d.ts`
- `src/lib/server/auth.test.ts`
