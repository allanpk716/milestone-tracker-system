---
id: S02
parent: M002
milestone: M002
provides:
  - ["scripts/deploy.bat — main deployment pipeline (build → SCP → NSSM restart → health check)", "scripts/install-service.bat — NSSM service registration with auto-start, crash restart, log rotation", "scripts/start-service.bat, stop-service.bat, uninstall-service.bat — service lifecycle management", "scripts/config/deploy-config.bat.example — secure configuration template", "scripts/verify-no-secrets.sh — credential leak scanner", ".gitignore updates for deploy-config.bat, data/, logs/, .env"]
requires:
  - slice: S01
    provides: Health check endpoint (GET /api/health) for deployment verification and structured logger module for remote logging
affects:
  - ["S03"]
key_files:
  - ["scripts/deploy.bat", "scripts/install-service.bat", "scripts/start-service.bat", "scripts/stop-service.bat", "scripts/uninstall-service.bat", "scripts/config/deploy-config.bat.example", "scripts/verify-no-secrets.sh", ".gitignore"]
key_decisions:
  - ["Created separate scripts/config/ subdirectory for deployment configuration to keep scripts root clean", "NSSM AppEnvironmentExtra with piped stdin to pass .env variables to service without manual configuration", "Config loading pattern: project root first, scripts/config/ fallback for all scripts", "npm prune failure warns but doesn't abort deployment (non-critical optimization)", "Interactive YES confirmation prompt in uninstall-service.bat to prevent accidental service removal", "AUTO_RESTART=no as default for manual restart control during deployment"]
patterns_established:
  - ["Batch script config loading: check project root deploy-config.bat first, fallback to scripts/config/deploy-config.bat", "Windows batch UTF-8 pattern: always start with chcp 65001", "NSSM service management via SSH: ssh %SSH_ALIAS% nssm start/stop/restart/remove %SERVICE_NAME%"]
observability_surfaces:
  - ["deploy.bat outputs status for each phase (build/push/restart/health check) with errorlevel checks", "install-service.bat outputs all NSSM configuration parameters during setup", "GET /api/health endpoint for post-deploy verification (provided by S01)"]
drill_down_paths:
  - [".gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md", ".gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md", ".gsd/milestones/M002/slices/S02/tasks/T03-SUMMARY.md", ".gsd/milestones/M002/slices/S02/tasks/T04-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-13T05:26:30.109Z
blocker_discovered: false
---

# S02: 部署脚本 + 服务注册 + 隐私保护

**Complete deployment script suite (deploy.bat, install-service.bat, start/stop/uninstall helpers) with NSSM service management, privacy-protected config templates, and verified no-secret scanning**

## What Happened

## What Happened

S02 delivered a complete Windows deployment automation suite for the Milestone Tracker system, covering all four tasks:

**T01 — Privacy protection:** Created `scripts/config/deploy-config.bat.example` with placeholder values (YOUR_*) for all sensitive fields (SSH alias, remote host, user, paths). Updated `.gitignore` to exclude `deploy-config.bat`, `data/`, `logs/`, `.env`, and `.env.*`. Added `scripts/verify-no-secrets.sh` scanner that checks tracked files for leaked credentials (sk-*, password, secret patterns). Scanner verified clean against 122 tracked files — only intentional test fixtures in logger.test.ts flagged (false positives for log redaction testing).

**T02 — Service registration:** Created `scripts/install-service.bat` implementing full NSSM service lifecycle: admin privilege check (`net session`), SERVICE_AUTO_START, crash restart with 5s delay (AppRestartDelay), log rotation (10MB threshold, 5 archived copies via AppRotateFiles/AppRotateBytes/AppRotateLines), `.env` environment variable passthrough via AppEnvironmentExtra with piped stdin, logs directory creation, and build artifact verification.

**T03 — Deploy pipeline:** Created `scripts/deploy.bat` with a 6-phase pipeline: pre-check (config + build artifact existence) → npm build → npm prune (non-fatal) → SCP push (build/ + node_modules/) → NSSM restart via SSH → health check with retry (curl against /api/health). Supports flexible config: SSH_ALIAS or REMOTE_HOST+USER+PORT+KEY composition. AUTO_RESTART flag for controlling restart behavior.

**T04 — Helper scripts:** Created `scripts/start-service.bat`, `scripts/stop-service.bat`, and `scripts/uninstall-service.bat`. All follow the same config loading pattern (project root first, scripts/config/ fallback). Uninstall includes interactive YES confirmation prompt to prevent accidental service removal. All scripts use `chcp 65001` for UTF-8 encoding support.

All 363 existing tests pass with zero regressions.

## Verification

All 17 verification checks passed using Windows-compatible bash commands:
- 6 file existence checks: deploy.bat, install-service.bat, start-service.bat, stop-service.bat, uninstall-service.bat, deploy-config.bat.example ✅
- 11 content pattern checks: nssm start/stop/remove, SERVICE_AUTO_START, AppRestartDelay, AppRotateFiles, deploy-config.bat/data/logs in .gitignore, no real secrets in template, npm run build/scp/nssm restart/HEALTH_CHECK in deploy.bat ✅
- Test suite: 363/363 tests pass (17 test files, 6.83s) ✅
- Privacy: verify-no-secrets.sh clean against 122 tracked files ✅

Original auto-verification failures were false negatives — Unix `test` and `grep` commands cannot run in Windows cmd.exe. Re-verified through git-bash with identical checks, all passing.

## Requirements Advanced

- R001 — deploy.bat implements full pipeline: local build → SCP push → NSSM restart → health check verification with retry
- R005 — deploy-config.bat.example with YOUR_* placeholders, .gitignore exclusions for deploy-config.bat/data/logs/.env, verify-no-secrets.sh scanner verified clean

## Requirements Validated

- R005 — verify-no-secrets.sh scans 122 tracked files with zero real secret findings; deploy-config.bat.example contains only YOUR_* placeholders; .gitignore covers deploy-config.bat, data/, logs/, .env

## New Requirements Surfaced

- []

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None — all planned functionality delivered.

## Follow-ups

None.

## Files Created/Modified

- `scripts/config/deploy-config.bat.example` — New: deployment configuration template with placeholder values
- `.gitignore` — Updated: added deploy-config.bat, data/, logs/, .env, .env.* exclusions
- `scripts/verify-no-secrets.sh` — New: credential leak scanner for tracked files
- `scripts/install-service.bat` — New: NSSM service registration with auto-start, crash restart, log rotation
- `scripts/deploy.bat` — New: 6-phase deployment pipeline (pre-check → build → prune → SCP → restart → health check)
- `scripts/start-service.bat` — New: NSSM start wrapper with config loading
- `scripts/stop-service.bat` — New: NSSM stop wrapper with config loading
- `scripts/uninstall-service.bat` — New: NSSM remove wrapper with confirmation prompt
