---
id: T03
parent: S02
milestone: M002
key_files:
  - scripts/deploy.bat
key_decisions:
  - Computed SSH_TARGET/SCP_REMOTE from SSH_ALIAS or REMOTE_HOST+USER+PORT+KEY for flexible config
  - AUTO_RESTART=no allows manual restart control
  - npm prune failure warns but doesn't abort (non-critical optimization)
duration: 
verification_result: passed
completed_at: 2026-05-13T05:22:25.141Z
blocker_discovered: false
---

# T03: Created deploy.bat with 6-phase pipeline: pre-check → build → prune → SCP push → NSSM restart → health check with retry

**Created deploy.bat with 6-phase pipeline: pre-check → build → prune → SCP push → NSSM restart → health check with retry**

## What Happened

Created `scripts/deploy.bat` implementing the full deployment pipeline as specified in the task plan. The script follows the same style conventions as existing `install-service.bat` and `build-and-run.bat`.

**6 Phases implemented:**
1. **Pre-check** — Loads deploy-config.bat (with fallback to scripts/config/), validates SSH_ALIAS/REMOTE_HOST/REMOTE_PATH are set, checks Node.js availability, tests SSH connectivity with 10s timeout
2. **Build** — Runs `npm run build`, aborts on failure
3. **Prune** — Runs `npm prune --production` to reduce node_modules transfer size (warns on failure, doesn't abort)
4. **SCP Push** — Creates remote directories (build, logs, data) via SSH, pushes build/ + node_modules/ + package.json with retry-once logic for each
5. **NSSM Restart** — Restarts service via SSH, waits 2s for startup; on failure outputs service status and error logs
6. **Health Check** — Uses curl with configurable retries (default 3) and interval (default 2s); parses response for "ok"; on failure outputs service status + last 20 lines of stdout/stderr logs

**Key design decisions:**
- SSH_TARGET and SCP_REMOTE variables computed from SSH_ALIAS or REMOTE_HOST/USER/PORT/KEY for flexible configuration
- AUTO_RESTART=no skips automatic restart for manual control
- Summary section outputs service URL, health status, and management commands

## Verification

Verified deploy.bat exists and contains all required elements: npm run build, scp, nssm restart, curl, HEALTH_CHECK references, and deploy-config.bat loading. Also verified the prior install-service.bat checks (SERVICE_AUTO_START, AppRestartDelay, AppRotateFiles, net session) — the original verification failures were false negatives caused by running Unix commands in Windows cmd.exe.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f scripts/deploy.bat` | 0 | ✅ pass | 50ms |
| 2 | `grep -q 'npm run build' scripts/deploy.bat` | 0 | ✅ pass | 50ms |
| 3 | `grep -q 'scp' scripts/deploy.bat` | 0 | ✅ pass | 50ms |
| 4 | `grep -q 'nssm restart' scripts/deploy.bat` | 0 | ✅ pass | 50ms |
| 5 | `grep -q 'curl' scripts/deploy.bat` | 0 | ✅ pass | 50ms |
| 6 | `grep -q 'HEALTH_CHECK' scripts/deploy.bat` | 0 | ✅ pass | 50ms |
| 7 | `grep -q 'deploy-config.bat' scripts/deploy.bat` | 0 | ✅ pass | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `scripts/deploy.bat`
