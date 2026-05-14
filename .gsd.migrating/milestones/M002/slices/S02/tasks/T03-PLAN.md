---
estimated_steps: 29
estimated_files: 1
skills_used: []
---

# T03: Create deploy.bat — build → SCP → NSSM restart → health check

Create the main deployment script that orchestrates the full deployment pipeline: local build → SCP push → remote service restart → health check verification. Covers R001 (deploy.bat implementation).

## Failure Modes
| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| npm run build | Abort, no push | N/A | N/A |
| SSH/SCP connection | Retry once, then abort | 30s timeout | N/A |
| NSSM restart | SSH check status, report logs | 10s timeout | N/A |
| Health check | Retry 3x (2s interval), report failure | 2s per retry | Malformed JSON → report raw response |

## Steps
1. Create `scripts/deploy.bat` with these phases:
   - **Phase 1: Pre-check** — Load deploy-config.bat (fail if missing), check SSH alias resolves, check Node.js available
   - **Phase 2: Build** — `npm run build`, abort on failure
   - **Phase 3: Prune** — `npm prune --production` to reduce node_modules size
   - **Phase 4: SCP push** — Create remote directories (data, logs), push build/ + node_modules/ + package.json + .env (if exists remotely). Use `scp -r` with SSH alias. Show progress
   - **Phase 5: Restart** — `ssh %SSH_ALIAS% nssm restart %SERVICE_NAME%`, wait 2s
   - **Phase 6: Health check** — `curl -s %HEALTH_CHECK_URL%`, retry up to HEALTH_CHECK_RETRIES times at HEALTH_CHECK_INTERVAL seconds. Parse JSON response, verify status:ok
2. Each phase checks errorlevel and aborts with clear error message on failure
3. Phase 4 also ensures remote `logs/` and `data/` directories exist via `ssh mkdir -p`
4. Phase 6 outputs service status on failure
5. Use chcp 65001 for UTF-8
6. Echo clear phase headers with [1/6], [2/6], etc.
7. Summary output at end with health check result and service URL

## Must-Haves
- [ ] Config file missing → abort with instruction to copy .example
- [ ] Build failure → abort before push
- [ ] SCP failure → retry once then abort
- [ ] Health check → retry 3x with 2s interval
- [ ] Remote logs/ and data/ directories created
- [ ] Final output shows service URL and health status

## Inputs

- `scripts/config/deploy-config.bat.example`
- `scripts/build-and-run.bat`
- `scripts/install-service.bat`
- `src/routes/api/health/+server.ts`

## Expected Output

- `scripts/deploy.bat`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/deploy.bat && grep -q 'npm run build' scripts/deploy.bat && grep -q 'scp' scripts/deploy.bat && grep -q 'nssm restart' scripts/deploy.bat && grep -q 'curl' scripts/deploy.bat && grep -q 'HEALTH_CHECK' scripts/deploy.bat && grep -q 'deploy-config.bat' scripts/deploy.bat
