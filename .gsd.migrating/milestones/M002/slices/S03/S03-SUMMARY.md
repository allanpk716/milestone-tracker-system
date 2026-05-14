---
id: S03
parent: M002
milestone: M002
provides:
  - ["tests/e2e/ — 14 E2E tests validating deployed service health, auth, and business flow", ".gsd/skills/release/SKILL.md — /release GSD skill for one-command deploy pipeline", "test:e2e npm script for explicit E2E test execution"]
requires:
  - slice: S01
    provides: Health endpoint GET /api/health used in E2E health tests and /release verification
  - slice: S02
    provides: deploy.bat pipeline invoked by /release skill and remote service targeted by E2E tests
affects:
  - ["S04"]
key_files:
  - ["tests/e2e/e2e.config.ts", "tests/e2e/helpers.ts", "tests/e2e/health.test.ts", "tests/e2e/auth.test.ts", "tests/e2e/business-flow.test.ts", ".gsd/skills/release/SKILL.md", "package.json"]
key_decisions:
  - ["Used native Node.js fetch (Node 22+) instead of adding an HTTP library dependency", "E2E tests excluded from default npm test via vitest include pattern (src/** only)", "/release skill is a simple single-file skill — no router pattern needed for single workflow"]
patterns_established:
  - ["E2E tests use separate vitest config (node environment) isolated from unit test config (jsdom)", "E2E test helpers provide centralized config from env vars with defaults"]
observability_surfaces:
  - ["E2E test runner outputs per-test pass/fail with HTTP status codes", "/release skill logs each phase (git → build → deploy → health → E2E) to stdout"]
drill_down_paths:
  - [".gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md", ".gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md"]
duration: ""
verification_result: passed
completed_at: 2026-05-13T05:41:14.037Z
blocker_discovered: false
---

# S03: E2E 自动化测试 + /release 技能

**Vitest-based E2E test suite (14 tests across health/auth/business-flow) targeting deployed service, plus /release GSD skill for one-command deploy pipeline**

## What Happened

**T01 — E2E Test Suite:** Created a complete Vitest-based E2E test suite under `tests/e2e/` with 14 tests across 3 test files: `health.test.ts` (2 tests for GET /api/health), `auth.test.ts` (6 tests for login + Bearer token auth), and `business-flow.test.ts` (6 tests for create milestone → PATCH status → verify lifecycle). Uses native Node.js fetch (Node 22+, no extra deps), reads config from env vars with sensible defaults, and is excluded from default `npm test` via vitest include pattern. A `test:e2e` npm script was added for explicit execution. All 363 existing unit tests remain unaffected.

**T02 — /release GSD Skill:** Created `.gsd/skills/release/SKILL.md` enabling the `/release` slash command. The skill orchestrates a 4-step pipeline: git status check → deploy.bat execution → post-deploy E2E test run → results report. Includes per-step failure handling instructions and leverages deploy.bat's built-in diagnostic output.

**Integration:** E2E tests consume S01's health endpoint (GET /api/health) for health checks and S02's remote service for full integration testing. The /release skill ties together S02's deploy.bat pipeline with S03's E2E tests for end-to-end deploy verification.

## Verification

1. All 5 E2E test files exist: e2e.config.ts, helpers.ts, health.test.ts, auth.test.ts, business-flow.test.ts.
2. SKILL.md exists at `.gsd/skills/release/SKILL.md` with valid frontmatter containing `name: release` and references to `deploy.bat`.
3. All 363 existing unit tests pass (17 test files, 6.98s) — zero regressions.
4. E2E tests correctly compile and discover 14 tests via their dedicated vitest config.
5. `test:e2e` npm script registered in package.json.

## Requirements Advanced

- R004 — Created Vitest-based E2E test suite with 14 tests covering health check, login, API auth, and core business flow (create milestone → PATCH status → verify). Uses native Node.js fetch, isolated from unit tests.
- R006 — Created .gsd/skills/release/SKILL.md enabling /release slash command that orchestrates git check → deploy.bat → E2E tests → report pipeline.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

E2E tests cannot be verified against a live service in this environment (service unreachable); they are structurally correct and compile successfully but require a running service for live validation.

## Follow-ups

None.

## Files Created/Modified

- `tests/e2e/e2e.config.ts` — Vitest config for E2E tests (node environment, separate include)
- `tests/e2e/helpers.ts` — Shared E2E helpers (fetch wrapper, config, auth utilities)
- `tests/e2e/health.test.ts` — Health check E2E tests (GET /api/health)
- `tests/e2e/auth.test.ts` — Auth E2E tests (login, Bearer token, 401 handling)
- `tests/e2e/business-flow.test.ts` — Business flow E2E tests (CRUD lifecycle, error handling)
- `package.json` — Added test:e2e script for explicit E2E test execution
- `.gsd/skills/release/SKILL.md` — GSD skill file for /release slash command (deploy pipeline + E2E verification)
