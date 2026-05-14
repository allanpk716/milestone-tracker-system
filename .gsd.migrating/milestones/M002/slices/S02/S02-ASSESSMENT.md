---
sliceId: S02
uatType: artifact-driven
verdict: PASS
date: 2026-05-13T05:27:30.000Z
---

# UAT Result — S02

## Checks

| Check | Mode | Result | Notes |
|-------|------|--------|-------|
| **Smoke Test:** All 6 deployment scripts exist | artifact | PASS | All 6 files confirmed: deploy.bat, install-service.bat, start-service.bat, stop-service.bat, uninstall-service.bat, deploy-config.bat.example |
| **TC1:** Deploy config template has no real secrets | artifact | PASS | `grep -rq 'sk-\|password\|secret' scripts/config/deploy-config.bat.example` returns exit code 1 (no matches). Template uses descriptive placeholders (`your-server-address`, `username`) instead of `YOUR_*` convention — functionally equivalent, no real credentials present. |
| **TC2:** .gitignore excludes sensitive paths | artifact | PASS | All three patterns found: `deploy-config.bat` (2 entries: root + scripts/config/), `data/`, `logs/` |
| **TC3:** install-service.bat has NSSM service management | artifact | PASS | All four patterns present: `SERVICE_AUTO_START` (2 occurrences), `AppRestartDelay` (1), `AppRotateFiles` (1), `net session` (1) |
| **TC4:** deploy.bat has full deployment pipeline | artifact | PASS | All five patterns present: `npm run build` (2), `scp` (5), `nssm restart` (3), `HEALTH_CHECK` (12), `deploy-config.bat` (9) |
| **TC5:** Helper scripts use correct NSSM commands | artifact | PASS | `nssm start` in start-service.bat, `nssm stop` in stop-service.bat, `nssm remove` in uninstall-service.bat — all confirmed |
| **TC6:** Test suite has no regressions | runtime | PASS | 363/363 tests pass across 17 test files (6.96s) |
| **Edge Case:** verify-no-secrets.sh scanner clean | runtime | PASS | 127 files scanned, 2 findings — both in `logger.test.ts` (lines 147, 152) using `sk-12345secret` as intentional test fixtures for log redaction verification. These are known false positives documented in UAT. |

## Overall Verdict

**PASS** — All 8 UAT checks (smoke test + 6 test cases + 1 edge case) passed. All deployment scripts exist with correct NSSM command patterns, no real secrets in tracked files, .gitignore properly excludes sensitive paths, and the full test suite passes with zero regressions.

## Notes

- **TC1 placeholder convention:** The UAT expected `YOUR_*` placeholders, but the actual template uses descriptive defaults (`your-server-address`, `username`, `update-hub`). This is functionally equivalent — no real credentials are present, and the template header explicitly warns "此文件仅包含占位符，不包含真实密码或密钥". The critical security check (no real secrets) passes.
- **verify-no-secrets.sh findings:** Both findings are in `src/lib/server/logger.test.ts` — intentional test fixtures (`sk-12345secret`) used to verify that the logger redacts sensitive values. These are not real secrets.
- **Not tested (per UAT design):** Actual deployment execution, NSSM service lifecycle, SCP transfer, and health check against a live server — all require a running Windows Server target.
