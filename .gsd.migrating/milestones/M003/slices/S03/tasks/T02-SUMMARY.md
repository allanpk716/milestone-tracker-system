---
id: T02
parent: S03
milestone: M003
key_files:
  - packages/cli/src/types.ts
  - packages/cli/src/commands/complete.ts
  - packages/cli/src/__tests__/json-commands.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-05-13T16:49:32.079Z
blocker_discovered: false
---

# T02: Extended CLI complete command with --evidence and --files-touched JSON options

**Extended CLI complete command with --evidence and --files-touched JSON options**

## What Happened

Added --evidence &lt;json&gt; and --files-touched &lt;json&gt; options to the `tasks complete` CLI command. Added `evidenceJson` and `filesTouched` fields to the TaskResponse type. Implemented `parseEvidenceJson()` and `parseFilesTouched()` validators that ensure both inputs are valid JSON arrays. Both parsed values are included in the POST body to the complete endpoint. Added 6 new tests: evidence in body + response, files-touched in body + response, combined with message/commit, invalid JSON, non-array JSON, and non-array files-touched. All 41 CLI tests pass.

## Verification

Ran CLI test suite from packages/cli/ (41 tests pass). Verified --evidence sends parsed array in POST body and returns enriched response. Verified --files-touched sends parsed array. Verified combined usage with --message and --commit. Verified rejection of invalid JSON and non-array values.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run src/__tests__/json-commands.test.ts` | 0 | ✅ pass | 3015ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/types.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/__tests__/json-commands.test.ts`
