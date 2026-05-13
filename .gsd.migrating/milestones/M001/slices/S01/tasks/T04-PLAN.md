---
estimated_steps: 1
estimated_files: 5
skills_used: []
---

# T04: Implement auth middleware with cookie session and Bearer Token

Implement dual authentication: cookie-based session for Web (HttpOnly, signed) and Bearer Token for CLI (static API keys from .env). Create: (1) `src/lib/server/auth.ts` — session management (create/verify/destroy), Bearer Token validation, middleware function that checks both cookie and Authorization header; (2) `src/routes/api/auth/login/+server.ts` — POST login endpoint (validate password from .env ADMIN_PASSWORD, create session cookie); (3) `src/routes/api/auth/logout/+server.ts` — POST logout; (4) `src/routes/login/+page.svelte` — login page with Chinese UI (title: 里程碑管理系统, username/password form, error toast); (5) auth guard hook in `src/hooks.server.ts` — protect /api/* routes (except /api/auth/*) and redirect unauthenticated Web requests to /login. Write tests for: correct login sets cookie, wrong password returns 401, Bearer Token accepted, expired/invalid token returns 401, protected route redirects to login.

## Inputs

- `src/lib/schemas/auth.ts`
- `src/app.html`
- `src/app.css`

## Expected Output

- `src/lib/server/auth.ts`
- `src/hooks.server.ts`
- `src/routes/api/auth/login/+server.ts`
- `src/routes/api/auth/logout/+server.ts`
- `src/routes/login/+page.svelte`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm test -- --grep "auth"
