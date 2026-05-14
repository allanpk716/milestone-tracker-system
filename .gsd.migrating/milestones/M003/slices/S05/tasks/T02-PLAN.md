---
estimated_steps: 14
estimated_files: 3
skills_used: []
---

# T02: Create sync engine and index.js with /mt-cli command registration

Create the core sync engine and command registration:
1. `sync.js` — Main sync engine following github-sync/sync.js pattern:
   - `runMtSync(basePath, unitType, unitId)` — entry point called from auto-post-unit hook
   - Routes by unitType: plan-slice → syncSlicePlan, execute-task → syncTaskExecute, complete-slice → syncSliceComplete
   - Each sync function reads GSD milestone/slice/task data, calls mt-cli via cli.js, and updates mapping
   - `bootstrapSync(basePath)` — walks .gsd/milestones tree and creates mapping entries for existing tasks
   - All errors caught internally — sync failures never block execution
   - Uses debugLog('mt-sync', {...}) for observability
2. `index.js` — Extension entry point following github-sync/index.js pattern:
   - `export default function(pi)` registers `/mt-cli` command
   - `/mt-cli` or `/mt-cli bootstrap` — verifies mt-cli availability, runs bootstrap, reports results via ctx.ui.notify
   - `/mt-cli status` — shows current mapping (task count, last sync times, connectivity)
3. Unit tests for sync.js (route mapping, error handling, bootstrap logic)

Reference: The executor should study `C:/Users/allan716/.gsd/agent/extensions/github-sync/sync.js` and `C:/Users/allan716/.gsd/agent/extensions/github-sync/index.js` for the architectural pattern.

## Inputs

- `.gsd/agent/extensions/mt-cli/cli.js`
- `.gsd/agent/extensions/mt-cli/mapping.js`
- `packages/cli/src/commands/block.ts`
- `packages/cli/src/commands/progress.ts`

## Expected Output

- `.gsd/agent/extensions/mt-cli/sync.js`
- `.gsd/agent/extensions/mt-cli/index.js`
- `.gsd/agent/extensions/mt-cli/__tests__/sync.test.js`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && test -f .gsd/agent/extensions/mt-cli/sync.js && test -f .gsd/agent/extensions/mt-cli/index.js && node -e "import('./.gsd/agent/extensions/mt-cli/index.js').then(m => console.log('OK:', typeof m.default))" && node -e "import('./.gsd/agent/extensions/mt-cli/sync.js').then(m => console.log('sync OK:', typeof m.runMtSync))"
