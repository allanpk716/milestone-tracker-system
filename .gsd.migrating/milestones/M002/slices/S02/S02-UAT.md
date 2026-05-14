# S02: 部署脚本 + 服务注册 + 隐私保护 — UAT

**Milestone:** M002
**Written:** 2026-05-13T05:26:30.110Z

# S02: 部署脚本 + 服务注册 + 隐私保护 — UAT

**Milestone:** M002
**Written:** 2025-01-27

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: Deployment scripts cannot be live-tested without a running Windows Server + NSSM target. Artifact-driven UAT verifies script correctness, security compliance, and pattern completeness.

## Preconditions

- Repository checked out with S02 changes
- Git-bash or similar Unix-like shell available for verification commands
- Node.js 18+ and npm available

## Smoke Test

All 6 deployment scripts exist and contain expected NSSM command patterns.

## Test Cases

### 1. Deploy configuration template is secure

1. Open `scripts/config/deploy-config.bat.example`
2. **Expected:** All sensitive values use `YOUR_*` placeholders (e.g., `YOUR_SSH_ALIAS`, `YOUR_REMOTE_HOST`)
3. Run: `grep -rq 'sk-\|password\|secret' scripts/config/deploy-config.bat.example`
4. **Expected:** Exit code 1 (no matches)

### 2. .gitignore excludes sensitive paths

1. Run: `grep 'deploy-config.bat' .gitignore && grep 'data/' .gitignore && grep 'logs/' .gitignore`
2. **Expected:** All three patterns found with no trailing slashes or typos

### 3. install-service.bat has NSSM service management

1. Verify `scripts/install-service.bat` contains:
   - `SERVICE_AUTO_START` — auto-start on boot
   - `AppRestartDelay` — crash restart timing
   - `AppRotateFiles` — log rotation enabled
   - `net session` — admin privilege check
2. **Expected:** All four patterns present

### 4. deploy.bat has full deployment pipeline

1. Verify `scripts/deploy.bat` contains:
   - `npm run build` — local build step
   - `scp` — file transfer to remote
   - `nssm restart` — service restart via SSH
   - `HEALTH_CHECK` — post-deploy verification
   - `deploy-config.bat` — config file loading
2. **Expected:** All five patterns present

### 5. Helper scripts use correct NSSM commands

1. `grep 'nssm start' scripts/start-service.bat` → found
2. `grep 'nssm stop' scripts/stop-service.bat` → found
3. `grep 'nssm remove' scripts/uninstall-service.bat` → found
4. **Expected:** Each script contains its respective NSSM command

### 6. Test suite has no regressions

1. Run: `npx vitest run`
2. **Expected:** 363/363 tests pass, 0 failures

## Edge Cases

### No real secrets in tracked files

1. Run `scripts/verify-no-secrets.sh`
2. **Expected:** Only known false positives in logger.test.ts (intentional test fixtures for log redaction)

## Failure Signals

- deploy-config.bat.example containing non-placeholder values
- Missing NSSM commands in service scripts
- .gitignore not covering deploy-config.bat, data/, logs/
- Test regressions (fewer than 363 passing)

## Not Proven By This UAT

- Actual deployment execution (requires live Windows Server with NSSM + SSH access)
- NSSM service actually starts and responds at http://172.18.200.47:30002/api/health
- Log rotation and crash restart behavior under real failure conditions
- SCP transfer speed and large node_modules handling

## Notes for Tester

- All verification commands must run in git-bash, not Windows cmd.exe (Unix tools required)
- The verify-no-secrets.sh scanner will flag logger.test.ts — this is a known false positive
- deploy-config.bat must be manually created from the .example template before real deployment
