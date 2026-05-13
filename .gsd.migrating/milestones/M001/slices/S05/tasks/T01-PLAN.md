---
estimated_steps: 44
estimated_files: 9
skills_used: []
---

# T01: CLI package scaffold, config resolution, HTTP client, and status command

Create the CLI package at `packages/cli/` with Commander.js. Implement the layered config resolution system (project `.mt-cli.json` → user `~/.mt-cli.json`, env vars `MT_API_KEY` → `.mt-env`). Build an HTTP client wrapper that injects Bearer token auth and wraps API errors into structured Chinese messages. Implement the `mt-cli status` command that verifies server connectivity, active milestone, and agent identity. Write unit tests for config resolution and HTTP client.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| SvelteKit API server | Return Chinese error with server URL | 10s timeout, Chinese timeout message | Return Chinese error with HTTP status |
| .mt-cli.json | Fall back to ~/.mt-cli.json | N/A | Warn and skip malformed file |

## Steps

1. Create `packages/cli/` directory with `package.json` (name: mt-cli, bin: ./dist/index.js, dependencies: commander), `tsconfig.json` targeting ES2022/Node
2. Implement `packages/cli/src/config.ts` — config resolution: read `.mt-cli.json` from cwd, fall back to `~/.mt-cli.json`. API key: `MT_API_KEY` env → `.mt-env` file → config `key` field
3. Implement `packages/cli/src/client.ts` — HTTP client wrapper: base URL from config, `Authorization: Bearer <key>` header, JSON parse, error wrapping into Chinese messages
4. Implement `packages/cli/src/commands/status.ts` — `mt-cli status`: GET `/api/milestones/:id` to verify server + milestone, display connection info in Chinese
5. Implement `packages/cli/src/index.ts` — Commander program setup: version, global options (--config path override), register status command
6. Add `packages/cli/tsconfig.json` and build script (tsc → dist/)
7. Write `packages/cli/src/__tests__/config.test.ts` — test config resolution priority, env var override, missing config, malformed JSON
8. Write `packages/cli/src/__tests__/client.test.ts` — test Bearer header injection, 401 handling, timeout, malformed response

## Must-Haves

- [ ] `.mt-cli.json` config loads correctly from cwd and falls back to home directory
- [ ] API key found from `MT_API_KEY` env var, `.mt-env` file, or config
- [ ] HTTP client sends Bearer token and handles errors with Chinese messages
- [ ] `mt-cli status` command outputs server URL, milestone info, and connectivity status
- [ ] Unit tests pass for config resolution and HTTP client

## Verification

- `cd packages/cli && npx vitest run` — all config and client tests pass
- `node packages/cli/dist/index.js status` — outputs usage or connection check

## Observability Impact

- `mt-cli status` exposes: server URL, milestone ID/title, API key presence (masked)
- HTTP client logs request URL and status code on failure

## Inputs

- `src/routes/api/tasks/+server.ts` — task list API endpoint (read for understanding interface)
- `src/routes/api/milestones/[id]/+server.ts` — milestone detail API (read for status command)
- `src/lib/server/auth.ts` — Bearer token validation logic (read for auth understanding)
- `src/lib/schemas/task.ts` — task Zod schemas defining API contracts
- `src/lib/schemas/common.ts` — ID format schemas (taskIdSchema, etc.)
- `.env.example` — env var names and format

## Expected Output

- `packages/cli/package.json` — CLI package manifest with Commander.js dependency and bin entry
- `packages/cli/tsconfig.json` — TypeScript config for CLI package
- `packages/cli/src/config.ts` — Config resolution module
- `packages/cli/src/client.ts` — HTTP client with Bearer auth and error handling
- `packages/cli/src/commands/status.ts` — Status command implementation
- `packages/cli/src/index.ts` — CLI entry point with Commander program
- `packages/cli/src/__tests__/config.test.ts` — Config resolution tests
- `packages/cli/src/__tests__/client.test.ts` — HTTP client tests
- `packages/cli/vitest.config.ts` — Vitest config for CLI package

## Inputs

- `src/routes/api/tasks/+server.ts`
- `src/routes/api/milestones/[id]/+server.ts`
- `src/lib/server/auth.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/common.ts`
- `.env.example`

## Expected Output

- `packages/cli/package.json`
- `packages/cli/tsconfig.json`
- `packages/cli/vitest.config.ts`
- `packages/cli/src/config.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/config.test.ts`
- `packages/cli/src/__tests__/client.test.ts`

## Verification

cd packages/cli && npx vitest run && npx tsc --noEmit

## Observability Impact

mt-cli status exposes server URL, milestone ID, and API key presence. HTTP client logs request URL and status code on failure.
