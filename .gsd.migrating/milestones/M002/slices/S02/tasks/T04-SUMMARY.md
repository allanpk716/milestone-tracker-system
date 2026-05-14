---
id: T04
parent: S02
milestone: M002
key_files:
  - scripts/start-service.bat
  - scripts/stop-service.bat
  - scripts/uninstall-service.bat
key_decisions:
  - Added interactive YES confirmation prompt to uninstall-service.bat to prevent accidental service removal
  - All three scripts follow same config loading pattern as deploy.bat: project root first, scripts/config/ fallback
duration: 
verification_result: mixed
completed_at: 2026-05-13T05:24:18.465Z
blocker_discovered: false
---

# T04: Created start-service.bat, stop-service.bat, and uninstall-service.bat helper scripts with config loading, UTF-8 support, and SSH-based NSSM management

**Created start-service.bat, stop-service.bat, and uninstall-service.bat helper scripts with config loading, UTF-8 support, and SSH-based NSSM management**

## What Happened

Created three supplementary service management scripts following the same patterns as deploy.bat and install-service.bat:

1. **start-service.bat** — Loads deploy-config.bat, resolves SSH target (alias or host/key/port), runs `nssm start` via SSH, displays service URL and management commands.

2. **stop-service.bat** — Same config loading and SSH resolution, runs `nssm stop` via SSH with error handling and diagnostic output on failure.

3. **uninstall-service.bat** — Adds interactive confirmation prompt (requires typing YES), stops service first (ignoring errors since service may already be stopped), then runs `nssm remove confirm` to permanently delete the service.

All scripts use `chcp 65001` for UTF-8, load config from both project root `deploy-config.bat` and `scripts/config/deploy-config.bat` fallback, and follow the established SSH target resolution pattern (SSH_ALIAS or REMOTE_HOST/USER/PORT/KEY combination).

Verification: 363/363 tests pass, all file existence and content checks pass. The secrets scanner reports 2 pre-existing false positives in logger test fixtures (sk-12345secret), unrelated to deployment scripts.

## Verification

All three helper scripts created with correct content. 363/363 tests pass with no regressions. File existence, content patterns (nssm start/stop/remove, chcp 65001, deploy-config.bat loading), and secrets scanning all verified.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `python: file exist scripts/start-service.bat` | 0 | ✅ pass | 67ms |
| 2 | `python: file exist scripts/stop-service.bat` | 0 | ✅ pass | 67ms |
| 3 | `python: file exist scripts/uninstall-service.bat` | 0 | ✅ pass | 67ms |
| 4 | `python: content check 'nssm start' in start-service.bat` | 0 | ✅ pass | 67ms |
| 5 | `python: content check 'nssm stop' in stop-service.bat` | 0 | ✅ pass | 67ms |
| 6 | `python: content check 'nssm remove' in uninstall-service.bat` | 0 | ✅ pass | 67ms |
| 7 | `python: content check 'nssm stop' in uninstall-service.bat` | 0 | ✅ pass | 67ms |
| 8 | `python: content check 'chcp 65001' in all 3 scripts` | 0 | ✅ pass | 67ms |
| 9 | `python: content check 'deploy-config.bat' in all 3 scripts` | 0 | ✅ pass | 67ms |
| 10 | `npx vitest run (363 tests)` | 0 | ✅ pass | 7220ms |
| 11 | `bash scripts/verify-no-secrets.sh` | 1 | ⚠️ pre-existing test fixture false positives only | 30000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `scripts/start-service.bat`
- `scripts/stop-service.bat`
- `scripts/uninstall-service.bat`
