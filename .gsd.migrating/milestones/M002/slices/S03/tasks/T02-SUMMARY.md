---
id: T02
parent: S03
milestone: M002
key_files:
  - .gsd/skills/release/SKILL.md
key_decisions:
  - Used pure XML structure with YAML frontmatter per GSD skill conventions; skill is a simple single-file skill (no router pattern needed) since it has one clear workflow
duration: 
verification_result: passed
completed_at: 2026-05-13T05:39:12.435Z
blocker_discovered: false
---

# T02: Created /release GSD skill file that orchestrates git check, deploy.bat pipeline, and post-deploy E2E tests

**Created /release GSD skill file that orchestrates git check, deploy.bat pipeline, and post-deploy E2E tests**

## What Happened

Created `.gsd/skills/release/SKILL.md` — a GSD skill file enabling the `/release` slash command. The skill instructs the agent to execute a 4-step release pipeline:

1. **Git check** — verifies working tree is clean via `git status --porcelain`; aborts if uncommitted changes exist
2. **Deploy** — runs `scripts/deploy.bat` (6-phase pipeline: pre-check → build → prune → SCP push → NSSM restart → health check)
3. **E2E tests** — runs `npm run test:e2e` against the deployed service (health, auth, business-flow groups)
4. **Report** — summarizes release outcome with phase-by-phase deploy results and per-group E2E test results

The skill includes failure handling instructions for each step, leveraging deploy.bat's built-in diagnostic output on failure. Uses pure XML structure per GSD skill conventions with YAML frontmatter (`name: release`).

## Verification

Task verification passed: skill file exists, contains 'name: release' and 'deploy.bat'. All 363 existing unit tests pass unaffected (17 test files, 7.25s). E2E tests require a running service and are not applicable to this task's deliverable.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f .gsd/skills/release/SKILL.md && grep -q 'name: release' .gsd/skills/release/SKILL.md && grep -q 'deploy.bat' .gsd/skills/release/SKILL.md` | 0 | ✅ pass | 200ms |
| 2 | `npx vitest run --reporter=verbose (363 tests, 17 files)` | 0 | ✅ pass | 7250ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `.gsd/skills/release/SKILL.md`
