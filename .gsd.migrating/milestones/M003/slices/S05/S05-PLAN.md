# S05: GSD2 mt-cli Extension

**Goal:** Create a GSD2 extension (`mt-cli`) that integrates mt-cli into the GSD2 agent workflow. The extension registers a `/mt-cli` slash command (bootstrap/status), provides auto-mode sync hooks that sync GSD task lifecycle events to the Milestone Tracker via mt-cli CLI calls (using execFileSync pattern from github-sync), and persists task mapping in `.gsd/mt-sync.json`. The extension is non-blocking, idempotent, and follows the github-sync architecture pattern.
**Demo:** GSD2 安装 mt-cli extension 后，/mt-cli bootstrap 一键验证连通性。auto-mode 执行任务时自动通过 extension 同步状态到 Milestone Tracker（claim、progress、block、complete），非阻塞、幂等。

## Must-Haves

- 1. Extension files exist at `.gsd/agent/extensions/mt-cli/` with index.js, cli.js, sync.js, mapping.js, and extension-manifest.json
- 2. `/mt-cli bootstrap` command verifies mt-cli availability, config, and server connectivity
- 3. `/mt-cli status` shows current sync mapping and connectivity
- 4. auto-post-unit hook syncs task lifecycle events (claim/progress/block/complete) to Milestone Tracker
- 5. `.gsd/mt-sync.json` persists the GSD task → MT task mapping
- 6. All sync operations are non-blocking and idempotent (never throw, never block auto-mode)
- 7. Unit tests cover cli.js (mt-cli availability, JSON parsing), sync.js (lifecycle routing), and mapping.js (load/save)
- 8. Manual install documentation included

## Proof Level

- This slice proves: integration — real CLI commands called via execFileSync, real JSON parsing, real file I/O for mapping persistence

## Integration Closure

- Upstream surfaces consumed: mt-cli binary (execFileSync calls to mt-cli tasks list/claim/progress/block/complete --json), .gsd/milestones/ directory structure (path parsing for milestone/slice/task IDs), GSD2 extension API (pi.registerCommand, pi.on hooks)
- New wiring introduced: GSD2 extension at project `.gsd/agent/extensions/mt-cli/` with extension-manifest.json, registered in GSD's extension discovery; auto-post-unit.js integration point for mt-sync (similar to github-sync's runSafely pattern)
- What remains before the milestone is truly usable end-to-end: The auto-post-unit.js integration patch (adding runSafely for mt-sync) would need to be applied to the GSD2 codebase itself — this slice creates the extension but the GSD platform integration is done via a documented patch step since auto-post-unit.js is outside this project's control

## Verification

- Signals added: debugLog("mt-sync", {...}) for each sync phase (bootstrap, claim, progress, block, complete), with milestoneId/sliceId/taskId and success/failure
- Inspection surfaces: /mt-cli status command shows mapping state and connectivity; .gsd/mt-sync.json is human-readable JSON
- Failure state exposed: Sync failures are silently caught and logged via debugLog; never block auto-mode. Mapping file shows lastSyncedAt timestamps for staleness detection.

## Tasks

- [x] **T01: Create mt-cli extension skeleton with manifest, mapping, and CLI wrapper** `est:45m`
  Create the extension directory structure at `.gsd/agent/extensions/mt-cli/` with:
  1. `extension-manifest.json` — declares the extension ID, tools, commands, and hooks
  2. `mapping.js` — persistence layer for `.gsd/mt-sync.json` (load/save/create/accessor/mutator functions, following github-sync/mapping.js pattern)
  3. `cli.js` — thin wrapper around mt-cli binary using execFileSync (following github-sync/cli.js pattern). Functions: mtCliIsAvailable(), mtCliExec(args) → Result<T>, with ok/error Result type. Wraps: `mt-cli tasks list --json`, `mt-cli tasks claim`, `mt-cli tasks progress`, `mt-cli tasks block`, `mt-cli tasks unblock`, `mt-cli tasks complete --evidence`, `mt-cli status --json`
  4. Unit tests for mapping.js (createEmptyMapping, load/save round-trip, accessors, mutators) and cli.js (mtCliIsAvailable cache, execFileSync success/error parsing)
  - Files: `.gsd/agent/extensions/mt-cli/extension-manifest.json`, `.gsd/agent/extensions/mt-cli/mapping.js`, `.gsd/agent/extensions/mt-cli/cli.js`, `.gsd/agent/extensions/mt-cli/__tests__/mapping.test.js`, `.gsd/agent/extensions/mt-cli/__tests__/cli.test.js`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && test -f .gsd/agent/extensions/mt-cli/extension-manifest.json && test -f .gsd/agent/extensions/mt-cli/mapping.js && test -f .gsd/agent/extensions/mt-cli/cli.js && echo 'Files exist' && node -e "import('./.gsd/agent/extensions/mt-cli/mapping.js').then(m => console.log('mapping OK:', typeof m.createEmptyMapping))" && node -e "import('./.gsd/agent/extensions/mt-cli/cli.js').then(m => console.log('cli OK:', typeof m.mtCliIsAvailable))"

- [x] **T02: Create sync engine and index.js with /mt-cli command registration** `est:1h`
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
  - Files: `.gsd/agent/extensions/mt-cli/sync.js`, `.gsd/agent/extensions/mt-cli/index.js`, `.gsd/agent/extensions/mt-cli/__tests__/sync.test.js`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && test -f .gsd/agent/extensions/mt-cli/sync.js && test -f .gsd/agent/extensions/mt-cli/index.js && node -e "import('./.gsd/agent/extensions/mt-cli/index.js').then(m => console.log('OK:', typeof m.default))" && node -e "import('./.gsd/agent/extensions/mt-cli/sync.js').then(m => console.log('sync OK:', typeof m.runMtSync))"

- [x] **T03: Create install documentation and verify full extension integration** `est:30m`
  Create installation and usage documentation, and perform end-to-end verification:
  1. Create `docs/mt-cli-extension.md` documenting:
     - Installation: copy extension to `~/.gsd/agent/extensions/mt-cli/` or symlink
     - Prerequisites: mt-cli must be built and on PATH, .mt-cli.json configured with serverUrl/milestoneId/apiKey
     - Usage: `/mt-cli bootstrap` and `/mt-cli status` commands
     - Auto-mode integration: how to patch auto-post-unit.js to add `runSafely('postUnit', 'mt-sync', ...)` call
     - Configuration: GSD preferences `mt_sync.enabled` flag
     - Troubleshooting: common errors and debugging with .gsd/mt-sync.json
  2. Run full verification:
     - All extension files exist and are syntactically valid
     - index.js default export is a function
     - mapping.js load/save round-trip works
     - sync.js imports resolve correctly
     - No missing dependencies
  - Files: `docs/mt-cli-extension.md`
  - Verify: cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && test -f docs/mt-cli-extension.md && grep -c 'mt-cli' docs/mt-cli-extension.md | grep -q '[0-9]' && node -e "import('./.gsd/agent/extensions/mt-cli/index.js').then(m => console.log('OK:', typeof m.default))" && node -e "import('./.gsd/agent/extensions/mt-cli/sync.js').then(m => console.log('sync OK:', typeof m.runMtSync))" && node -e "import('./.gsd/agent/extensions/mt-cli/mapping.js').then(m => console.log('mapping OK:', typeof m.createEmptyMapping))" && node -e "import('./.gsd/agent/extensions/mt-cli/cli.js').then(m => console.log('cli OK:', typeof m.mtCliIsAvailable))"

## Files Likely Touched

- .gsd/agent/extensions/mt-cli/extension-manifest.json
- .gsd/agent/extensions/mt-cli/mapping.js
- .gsd/agent/extensions/mt-cli/cli.js
- .gsd/agent/extensions/mt-cli/__tests__/mapping.test.js
- .gsd/agent/extensions/mt-cli/__tests__/cli.test.js
- .gsd/agent/extensions/mt-cli/sync.js
- .gsd/agent/extensions/mt-cli/index.js
- .gsd/agent/extensions/mt-cli/__tests__/sync.test.js
- docs/mt-cli-extension.md
