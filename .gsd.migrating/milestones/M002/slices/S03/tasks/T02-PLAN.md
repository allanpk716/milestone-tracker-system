---
estimated_steps: 7
estimated_files: 1
skills_used: []
---

# T02: Create /release GSD skill file

Create `.gsd/skills/release/SKILL.md` — a GSD skill file that enables the `/release` slash command to trigger the full deploy pipeline.

The skill instructs the agent to:
1. Verify git working tree is clean (`git status --porcelain`)
2. Run `scripts/deploy.bat` (the existing 6-phase deployment script)
3. After deploy completes, run E2E tests against the deployed service (`npm run test:e2e`)
4. Report results: deploy status + E2E test results

On failure at any step, the agent reports the failing phase and diagnostics (deploy.bat already outputs diagnostic info on failure).

## Inputs

- `scripts/deploy.bat`
- `scripts/config/deploy-config.bat.example`
- `package.json`

## Expected Output

- `.gsd/skills/release/SKILL.md`

## Verification

test -f .gsd/skills/release/SKILL.md && grep -q 'name: release' .gsd/skills/release/SKILL.md && grep -q 'deploy.bat' .gsd/skills/release/SKILL.md
