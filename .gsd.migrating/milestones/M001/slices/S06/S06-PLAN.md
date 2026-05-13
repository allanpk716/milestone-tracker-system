# S06: 端到端集成验证

**Goal:** Prove the complete milestone lifecycle works end-to-end: create milestone → confirm modules/tasks (activate) → CLI claim → progress → complete → admin UAT → merge → done. Verify npm run build passes clean and all tests (309+ existing + new integration tests) pass.
**Demo:** 完整闭环跑通：导入 MD → LLM 拆解 → 预览编辑 → 对比建议 → 激活 → CLI claim → progress → complete → Web UAT 通过 → 合并 → done。npm run build 无错误

## Must-Haves

- 1. A lifecycle integration test exercises the full happy path: create → confirm → claim → progress → complete → admin UAT-pass → admin merge, verifying every status transition and data integrity at each step.
- 2. Concurrent claim test at service level (not mocked) proves optimistic lock: two agents claiming same task, first succeeds, second gets conflict.
- 3. Zombie detection verified in integration context (task updated >24h ago flagged correctly).
- 4. All 309+ existing tests continue to pass alongside new integration tests.
- 5. `npm run build` exits 0 with no errors.
- 6. No TODO, placeholder, or dead code in production paths.

## Proof Level

- This slice proves: final-assembly

## Integration Closure

Upstream surfaces consumed:
- S01: DB schema (milestones, modules, tasks), auth middleware, milestone CRUD services (milestone-service.ts), module-service.ts, task-service.ts
- S02: decompose-service.ts (LLM streaming), llm-client.ts
- S03: confirm-service.ts (atomic writes + activation), compare-service.ts (SSE comparison)
- S04: kanban data loading with zombie detection, admin action schema, task edit
- S05: mt-cli commands, concurrent claim verification (mocked), Chinese error output

New wiring: None — this slice verifies existing wiring holds together.

What remains before milestone is truly usable: nothing — S06 is the final slice.

## Verification

- Lifecycle integration test logs each step (create → confirm → claim → progress → complete → UAT → merge) with module/task counts and status transitions, providing a replayable audit trail for future debugging.

## Tasks

- [x] **T01: End-to-end lifecycle integration test** `est:1h`
  Write `src/lib/server/lifecycle.test.ts` exercising the full milestone lifecycle through service-layer calls:
  - Files: `src/lib/server/lifecycle.test.ts`
  - Verify: npx vitest run src/lib/server/lifecycle.test.ts

- [x] **T02: Build health verification and cross-slice regression fixes** `est:45m`
  Run full production build and test suite to verify cross-slice integration health:
  - Files: `src/lib/server/lifecycle.test.ts`
  - Verify: npm run build && npx vitest run

## Files Likely Touched

- src/lib/server/lifecycle.test.ts
