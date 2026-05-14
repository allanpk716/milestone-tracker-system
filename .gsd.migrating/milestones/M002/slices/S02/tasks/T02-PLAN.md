---
estimated_steps: 33
estimated_files: 1
skills_used: []
---

# T02: Create install-service.bat for NSSM service registration

Create the Windows service registration script using NSSM, following the update-hub reference implementation pattern. Covers first-time setup on the remote server.

## Failure Modes
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| NSSM binary | Abort with download URL | N/A | N/A |
| Admin privileges | Abort with instruction | N/A | N/A |
| node.exe | Abort with path error | N/A | N/A |

## Steps
1. Create `scripts/install-service.bat` with:
   - Admin privilege check (`net session`)
   - NSSM availability check (`where nssm`)
   - Resolve APP_DIR from script location (parent of scripts/)
   - Verify `build/index.js` exists
   - Read SERVICE_NAME and SERVICE_PORT from deploy-config.bat (or defaults)
   - Install service: `nssm install %SERVICE_NAME% node "%APP_DIR%\build\index.js"`
   - Configure AppDirectory, DisplayName, Description, Start=SERVICE_AUTO_START
   - Configure restart policy: AppExit Default Restart, AppRestartDelay 5000
   - Configure log rotation:
     - stdout: `logs\milestone-tracker.out.log`
     - stderr: `logs\milestone-tracker.err.log`
     - AppRotateFiles 1, AppRotateBytes 10485760, AppRotateBacklogCopies 5
   - Create logs/ directory if not exists
   - Set environment variables from .env (PORT, DATABASE_PATH, etc.) via NSSM set AppEnv
2. Use chcp 65001 for UTF-8 support
3. Echo configuration summary at end
4. Reference: update-hub/deploy/install-service.bat for pattern

## Must-Haves
- [ ] Admin check blocks non-admin execution
- [ ] NSSM check provides download URL on failure
- [ ] SERVICE_AUTO_START configured
- [ ] Crash restart with 5s delay
- [ ] Log rotation 10MB/5 copies
- [ ] Environment variables from .env passed to service

## Inputs

- `scripts/config/deploy-config.bat.example`
- `scripts/build-and-run.bat`

## Expected Output

- `scripts/install-service.bat`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/install-service.bat && grep -q SERVICE_AUTO_START scripts/install-service.bat && grep -q AppRestartDelay scripts/install-service.bat && grep -q AppRotateFiles scripts/install-service.bat && grep -q 'net session' scripts/install-service.bat
