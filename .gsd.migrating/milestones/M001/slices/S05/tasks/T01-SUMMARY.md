---
id: T01
parent: S05
milestone: M001
key_files:
  - packages/cli/package.json
  - packages/cli/tsconfig.json
  - packages/cli/vitest.config.ts
  - packages/cli/src/config.ts
  - packages/cli/src/client.ts
  - packages/cli/src/commands/status.ts
  - packages/cli/src/index.ts
  - packages/cli/src/__tests__/config.test.ts
  - packages/cli/src/__tests__/client.test.ts
key_decisions:
  - D_CLI_CONFIG_RESOLUTION: Layered config with cwd .mt-cli.json → ~/.mt-cli.json fallback, API key from MT_API_KEY env → .mt-env file → config key field
  - D_CLI_ERROR_MESSAGES: All errors in Chinese with HTTP status code, description, and actionable suggestion for AI agents
  - D_CLI_HTTP_CLIENT: MtClient class using native fetch with AbortController timeout, structured MtCliError wrapping
duration: 
verification_result: passed
completed_at: 2026-05-13T00:19:04.687Z
blocker_discovered: false
---

# T01: Created mt-cli package with config resolution, HTTP client with Bearer auth and Chinese error messages, and status command

**Created mt-cli package with config resolution, HTTP client with Bearer auth and Chinese error messages, and status command**

## What Happened

Built the CLI package at packages/cli/ with Commander.js. Implemented layered config resolution (.mt-cli.json from cwd → ~/.mt-cli.json fallback) with API key priority (MT_API_KEY env → .mt-env file → config key field). Created HTTP client wrapper (MtClient) that injects Bearer token auth, handles timeouts, network failures, and wraps all API errors into structured Chinese messages with HTTP status codes and actionable suggestions. Implemented mt-cli status command that displays server connectivity, milestone info, and agent identity. All 24 unit tests pass (10 config tests + 14 client tests), TypeScript compiles cleanly, and the binary runs correctly showing Chinese help output.

## Verification

- npx vitest run: 24/24 tests pass (10 config, 14 client)
- npx tsc --noEmit: clean compilation, no errors
- node dist/index.js --help: shows Chinese CLI usage with status command
- node dist/index.js --version: shows 0.1.0
- Config tests cover: cwd config, home fallback, env var override, .mt-env file, quoted env values, missing config exit, missing milestoneId exit, explicit path, malformed JSON skip, missing API key exit
- Client tests cover: Bearer header injection, Content-Type/Accept headers, JSON response parsing, POST body serialization, 401 handling, 409 conflict, timeout, network failure, non-JSON response, non-JSON error response, failure logging, base URL normalization, PATCH method

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run` | 0 | ✅ pass | 805ms |
| 2 | `cd packages/cli && npx tsc --noEmit` | 0 | ✅ pass | 3200ms |
| 3 | `cd packages/cli && node dist/index.js --help` | 0 | ✅ pass | 150ms |
| 4 | `cd packages/cli && node dist/index.js --version` | 0 | ✅ pass | 120ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/package.json`
- `packages/cli/tsconfig.json`
- `packages/cli/vitest.config.ts`
- `packages/cli/src/config.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/config.test.ts`
- `packages/cli/src/__tests__/client.test.ts`
