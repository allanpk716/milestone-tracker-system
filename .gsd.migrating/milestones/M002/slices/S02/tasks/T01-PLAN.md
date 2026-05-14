---
estimated_steps: 21
estimated_files: 3
skills_used: []
---

# T01: Create deploy-config.bat.example + update .gitignore for privacy protection

Create the deployment configuration template file with placeholder values and update .gitignore to exclude all sensitive paths. This task covers R005 (privacy/secrets protection).

## Steps
1. Create `scripts/config/deploy-config.bat.example` with all deployment variables as placeholders:
   - REMOTE_HOST=your-server-address
   - REMOTE_USER=username
   - REMOTE_PATH=C:\WorkSpace\milestone-tracker
   - SERVICE_NAME=MilestoneTracker
   - SERVICE_PORT=30002
   - SSH_ALIAS=update-hub (or custom SSH alias)
   - HEALTH_CHECK_URL=http://172.18.200.47:30002/api/health
   - HEALTH_CHECK_RETRIES=3
   - HEALTH_CHECK_INTERVAL=2
2. Update `.gitignore` to ensure these entries are present (add missing ones):
   - `deploy-config.bat` (without .example suffix)
   - Verify `data/`, `logs/`, `.env`, `.env.*`, `!.env.example` are present
3. Add a verification script or test that scans all tracked files for secret patterns
4. Verify no real secrets exist in the template file

## Must-Haves
- [ ] `scripts/config/deploy-config.bat.example` exists with placeholder values (no real passwords/keys)
- [ ] `.gitignore` excludes `deploy-config.bat`, `data/`, `logs/`, `.env`
- [ ] Grep scan confirms zero real secrets in tracked files

## Inputs

- `.gitignore`
- `.env.example`

## Expected Output

- `scripts/config/deploy-config.bat.example`
- `scripts/verify-no-secrets.sh`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M002 && test -f scripts/config/deploy-config.bat.example && ! grep -rq 'sk-\|password\|secret' scripts/config/deploy-config.bat.example && grep -q 'deploy-config.bat' .gitignore && grep -q 'data/' .gitignore && grep -q 'logs/' .gitignore
