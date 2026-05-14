---
estimated_steps: 6
estimated_files: 5
skills_used: []
---

# T01: Create mt-cli extension skeleton with manifest, mapping, and CLI wrapper

Create the extension directory structure at `.gsd/agent/extensions/mt-cli/` with:
1. `extension-manifest.json` — declares the extension ID, tools, commands, and hooks
2. `mapping.js` — persistence layer for `.gsd/mt-sync.json` (load/save/create/accessor/mutator functions, following github-sync/mapping.js pattern)
3. `cli.js` — thin wrapper around mt-cli binary using execFileSync (following github-sync/cli.js pattern). Functions: mtCliIsAvailable(), mtCliExec(args) → Result<T>, with ok/error Result type. Wraps: `mt-cli tasks list --json`, `mt-cli tasks claim`, `mt-cli tasks progress`, `mt-cli tasks block`, `mt-cli tasks unblock`, `mt-cli tasks complete --evidence`, `mt-cli status --json`
4. Unit tests for mapping.js (createEmptyMapping, load/save round-trip, accessors, mutators) and cli.js (mtCliIsAvailable cache, execFileSync success/error parsing)

Reference: The executor should study the github-sync extension at `~/.gsd/agent/extensions/github-sync/` for the architectural pattern to follow (mapping.js, cli.js, sync.js, index.js). The key files to study are `C:/Users/allan716/.gsd/agent/extensions/github-sync/mapping.js` and `C:/Users/allan716/.gsd/agent/extensions/github-sync/cli.js`.

## Inputs

- `packages/cli/src/index.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/utils/json-output.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/complete.ts`

## Expected Output

- `.gsd/agent/extensions/mt-cli/extension-manifest.json`
- `.gsd/agent/extensions/mt-cli/mapping.js`
- `.gsd/agent/extensions/mt-cli/cli.js`
- `.gsd/agent/extensions/mt-cli/__tests__/mapping.test.js`
- `.gsd/agent/extensions/mt-cli/__tests__/cli.test.js`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && test -f .gsd/agent/extensions/mt-cli/extension-manifest.json && test -f .gsd/agent/extensions/mt-cli/mapping.js && test -f .gsd/agent/extensions/mt-cli/cli.js && echo 'Files exist' && node -e "import('./.gsd/agent/extensions/mt-cli/mapping.js').then(m => console.log('mapping OK:', typeof m.createEmptyMapping))" && node -e "import('./.gsd/agent/extensions/mt-cli/cli.js').then(m => console.log('cli OK:', typeof m.mtCliIsAvailable))"
