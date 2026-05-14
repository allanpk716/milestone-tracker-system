---
estimated_steps: 29
estimated_files: 2
skills_used: []
---

# T01: Create JSON output utility module with unit tests

Create a shared `packages/cli/src/utils/json-output.ts` utility that provides consistent --json formatting for all CLI commands.

## Steps

1. Create `packages/cli/src/utils/json-output.ts` with three exported functions:
   - `outputJson(data: unknown): void` — writes `JSON.stringify(data, null, 2) + '\n'` to stdout
   - `outputJsonError(err: unknown): never` — formats error as `{ error: string, code: string, details?: unknown }`, writes to stdout, calls `process.exit(1)`
   - `formatErrorCode(err: unknown): string` — maps MtCliError properties to machine-readable code strings:
     - MtCliError with HTTP status → `HTTP_${status}` (e.g., `HTTP_404`, `HTTP_409`)
     - MtCliError with status 0 and abort message → `TIMEOUT`
     - MtCliError with status 0 and fetch message → `NETWORK_ERROR`
     - Generic Error → `UNKNOWN_ERROR`
   - `formatErrorDetails(err: unknown): unknown` — extracts relevant details from MtCliError (url, suggestion) or returns undefined
2. Create `packages/cli/src/__tests__/json-output.test.ts` with comprehensive unit tests:
   - Test `outputJson` writes valid JSON to stdout (mock console.log)
   - Test `outputJsonError` writes error JSON to stdout and exits with code 1 (mock console.log + process.exit)
   - Test `formatErrorCode` for all error types: HTTP errors (400, 401, 404, 409, 500), timeout, network, unknown
   - Test error JSON structure: `{ error, code, details? }` with correct types
   - Test that error messages from MtCliError are preserved in `error` field
   - Test that `details` contains `url` and `suggestion` for MtCliError instances

## Must-Haves
- [ ] `outputJson` outputs valid JSON (parseable by JSON.parse)
- [ ] `outputJsonError` outputs `{ error: string, code: string, details?: unknown }` format
- [ ] Error codes follow convention: HTTP_${status}, TIMEOUT, NETWORK_ERROR, UNKNOWN_ERROR
- [ ] Unit tests pass with `npx vitest run` from packages/cli

## Verification
- `cd packages/cli && npx vitest run src/__tests__/json-output.test.ts`

## Observability Impact

- Signals added/changed: JSON error output includes `code` field for automated classification
- How a future agent inspects this: `mt-cli tasks list --json 2>&1 | jq .error.code` on failure
- Failure state exposed: Error code and details make retry strategy deterministic

## Inputs

- `packages/cli/src/client.ts`
- `packages/cli/src/types.ts`

## Expected Output

- `packages/cli/src/utils/json-output.ts`
- `packages/cli/src/__tests__/json-output.test.ts`

## Verification

cd packages/cli && npx vitest run src/__tests__/json-output.test.ts
