---
estimated_steps: 14
estimated_files: 1
skills_used: []
---

# T03: Create install documentation and verify full extension integration

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

## Inputs

- `.gsd/agent/extensions/mt-cli/index.js`
- `.gsd/agent/extensions/mt-cli/sync.js`
- `.gsd/agent/extensions/mt-cli/cli.js`
- `.gsd/agent/extensions/mt-cli/mapping.js`

## Expected Output

- `docs/mt-cli-extension.md`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && test -f docs/mt-cli-extension.md && grep -c 'mt-cli' docs/mt-cli-extension.md | grep -q '[0-9]' && node -e "import('./.gsd/agent/extensions/mt-cli/index.js').then(m => console.log('OK:', typeof m.default))" && node -e "import('./.gsd/agent/extensions/mt-cli/sync.js').then(m => console.log('sync OK:', typeof m.runMtSync))" && node -e "import('./.gsd/agent/extensions/mt-cli/mapping.js').then(m => console.log('mapping OK:', typeof m.createEmptyMapping))" && node -e "import('./.gsd/agent/extensions/mt-cli/cli.js').then(m => console.log('cli OK:', typeof m.mtCliIsAvailable))"
