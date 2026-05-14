---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Create standalone deployment guide docs/deployment.md

Create a comprehensive, standalone deployment guide at docs/deployment.md. Must cover: environment prerequisites (Node.js ≥ 18, Windows SSH access, NSSM), configuration (.env + deploy-config.bat.example reference), deploy.bat pipeline steps, NSSM service lifecycle (install/start/stop/restart/uninstall), log file location and rotation (logs/app-YYYY-MM-DD.log, 7-day rotation), health check verification (GET /api/health), E2E test execution (npm run test:e2e), /release skill usage, and a troubleshooting section. All content in Chinese to match existing docs. No secrets or real passwords — use placeholders.

## Inputs

- `scripts/deploy.bat`
- `scripts/install-service.bat`
- `scripts/start-service.bat`
- `scripts/stop-service.bat`
- `scripts/uninstall-service.bat`
- `scripts/config/deploy-config.bat.example`
- `src/lib/server/logger.ts`
- `src/routes/api/health/+server.ts`
- `.env.example`
- `tests/e2e/helpers.ts`
- `.gsd/skills/release/SKILL.md`

## Expected Output

- `docs/deployment.md`

## Verification

test -f docs/deployment.md && grep -c '^## ' docs/deployment.md
