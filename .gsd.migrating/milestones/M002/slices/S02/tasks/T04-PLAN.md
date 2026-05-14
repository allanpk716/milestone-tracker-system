---
estimated_steps: 23
estimated_files: 3
skills_used: []
---

# T04: Create helper scripts (stop-service, start-service, uninstall-service) + verify all scripts

Create supplementary service management scripts and run full verification of the deployment script suite.

## Steps
1. Create `scripts/start-service.bat`:
   - Load deploy-config.bat
   - `ssh %SSH_ALIAS% nssm start %SERVICE_NAME%`
   - Echo service URL
2. Create `scripts/stop-service.bat`:
   - Load deploy-config.bat
   - `ssh %SSH_ALIAS% nssm stop %SERVICE_NAME%`
3. Create `scripts/uninstall-service.bat`:
   - Load deploy-config.bat
   - Admin check
   - `ssh %SSH_ALIAS% nssm stop %SERVICE_NAME%` (ignore error)
   - `ssh %SSH_ALIAS% nssm remove %SERVICE_NAME% confirm`
4. All scripts use chcp 65001 and load config from deploy-config.bat
5. Verify: all .bat files pass basic syntax check (no obvious errors)
6. Run `npm test` to confirm 363/363 no regressions
7. Run the secrets verification script from T01

## Must-Haves
- [ ] start/stop/uninstall scripts all load deploy-config.bat
- [ ] uninstall includes stop before remove
- [ ] All scripts use UTF-8 (chcp 65001)
- [ ] 363/363 tests pass

## Inputs

- `scripts/config/deploy-config.bat.example`
- `scripts/deploy.bat`
- `scripts/install-service.bat`

## Expected Output

- `scripts/start-service.bat`
- `scripts/stop-service.bat`
- `scripts/uninstall-service.bat`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/start-service.bat && test -f scripts/stop-service.bat && test -f scripts/uninstall-service.bat && grep -q 'nssm start' scripts/start-service.bat && grep -q 'nssm stop' scripts/stop-service.bat && grep -q 'nssm remove' scripts/uninstall-service.bat && npx vitest run 2>&1 | tail -5
