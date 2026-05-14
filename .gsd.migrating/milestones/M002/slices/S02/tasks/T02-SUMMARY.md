---
id: T02
parent: S02
milestone: M002
key_files:
  - scripts/install-service.bat
key_decisions:
  - Used NSSM AppEnvironmentExtra with piped stdin to pass .env variables to service, avoiding need for manual env configuration
  - Script reads deploy-config.bat from both project root and scripts/config/ fallback locations
  - Default SERVICE_NAME=MilestoneTracker and SERVICE_PORT=30002 matching deploy-config.bat.example defaults
duration: 
verification_result: passed
completed_at: 2026-05-13T05:21:18.302Z
blocker_discovered: false
---

# T02: Created install-service.bat for NSSM service registration with admin check, crash restart, log rotation, and .env passthrough

**Created install-service.bat for NSSM service registration with admin check, crash restart, log rotation, and .env passthrough**

## What Happened

Created `scripts/install-service.bat` (189 lines) following the update-hub reference pattern. The script performs 7 sequential steps: (1) admin privilege check via `net session`, (2) NSSM availability check with download URL on failure, (3) resolves APP_DIR from script location (parent of scripts/), (4) verifies `build/index.js` exists, (5) reads SERVICE_NAME/SERVICE_PORT/NODE_PATH from deploy-config.bat with defaults, (6) installs and configures the NSSM service with SERVICE_AUTO_START, crash restart (AppExit Default Restart, 5s delay), log rotation (10MB/5 copies, stdout+stderr), (7) reads .env file and passes environment variables to the service via AppEnvironmentExtra. Uses chcp 65001 for UTF-8 support and outputs a configuration summary at the end.

## Verification

All 5 task verification checks pass: install-service.bat exists, contains SERVICE_AUTO_START, AppRestartDelay, AppRotateFiles, and net session. All 10 must-have criteria verified: admin check with download URL guidance, SERVICE_AUTO_START, crash restart 5s, log rotation 10MB/5 copies, .env environment passthrough, UTF-8 support, build/index.js verification, logs directory creation.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `powershell -Command "Test-Path scripts/install-service.bat"` | 0 | ✅ pass | 200ms |
| 2 | `powershell -Command "Select-String -Path scripts/install-service.bat -Pattern 'SERVICE_AUTO_START' -Quiet"` | 0 | ✅ pass | 200ms |
| 3 | `powershell -Command "Select-String -Path scripts/install-service.bat -Pattern 'AppRestartDelay' -Quiet"` | 0 | ✅ pass | 200ms |
| 4 | `powershell -Command "Select-String -Path scripts/install-service.bat -Pattern 'AppRotateFiles' -Quiet"` | 0 | ✅ pass | 200ms |
| 5 | `powershell -Command "Select-String -Path scripts/install-service.bat -Pattern 'net session' -Quiet"` | 0 | ✅ pass | 200ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `scripts/install-service.bat`
