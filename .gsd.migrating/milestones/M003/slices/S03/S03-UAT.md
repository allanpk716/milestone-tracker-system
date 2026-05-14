# S03: complete 验证证据 + modules 命令 — UAT

**Milestone:** M003
**Written:** 2026-05-13T16:58:26.514Z

# S03 UAT: complete 验证证据 + modules 命令

## UAT Type
Contract verification — API endpoint contracts, CLI command parsing, and JSON output shapes tested against mocked/stubbed server responses.

## Preconditions
- Milestone Tracker server running with existing test database
- `mt-cli` configured with valid server URL and API token
- At least one milestone with modules exists in the system
- At least one task in `in_progress` state exists

## Test Cases

### TC1: Complete task with verification evidence
1. Run `mt-cli tasks complete <taskId> --evidence '[{"command":"npm test","exitCode":0,"verdict":"pass"}]' --files-touched '["src/api/auth.ts","tests/auth.test.ts"]' --json`
2. **Expected:** JSON output with `evidence` array containing 1 item and `filesTouched` array with 2 paths
3. **Expected:** evidence items have command, exitCode, verdict fields
4. **Edge case:** Omit `--evidence` → task completes without evidence, `evidence` field is empty/null
5. **Edge case:** Pass invalid JSON to `--evidence` → error message, exit code 1

### TC2: Complete task with --files-touched only
1. Run `mt-cli tasks complete <taskId> --files-touched '["src/db.ts"]' --json`
2. **Expected:** JSON output with `filesTouched` containing `["src/db.ts"]` and no evidence

### TC3: List modules
1. Run `mt-cli modules list --json`
2. **Expected:** JSON array of module objects, each with id, name, description, status fields
3. **Edge case:** No modules for milestone → empty JSON array `[]`

### TC4: Show single module
1. Run `mt-cli modules show <moduleId> --json`
2. **Expected:** JSON object with full module detail (id, name, description, sortOrder, status, details)
3. **Edge case:** Non-existent module ID → JSON error with status 404

### TC5: Modules commands without --json (human-readable)
1. Run `mt-cli modules list` (no --json)
2. **Expected:** Formatted text table showing module names and statuses
3. Run `mt-cli modules show <moduleId>`
4. **Expected:** Formatted text output with module details

## Not Proven By This UAT
- E2E lifecycle testing (covered by S04)
- Evidence data validation beyond JSON structure (e.g., command string format)
- Concurrent evidence submission race conditions
- GSD2 extension integration (covered by S05)

