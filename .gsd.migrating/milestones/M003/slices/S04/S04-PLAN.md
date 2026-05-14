# S04: E2E 场景测试

**Goal:** E2E 场景测试：模拟完整第三方 AI Agent 生命周期全部通过（发现 → 领取 → 进度 → 阻塞 → 解除 → 完成带证据），覆盖错误场景和边界条件。
**Demo:** 模拟完整第三方 AI Agent 生命周期全部通过：发现(list --json) → 领取(claim) → 进度(progress) → 阻塞(block + reason) → 解除(unblock) → 完成(complete --evidence --files-touched)。错误场景也覆盖。

## Must-Haves

- 1. 完整 Agent 生命周期测试通过：list → claim → progress → block (带 reason) → unblock → complete (带 evidence + filesTouched)
- 2. 错误场景覆盖：404 not_found、409 conflict (重复 claim)、invalid_status 状态守卫、validation 错误
- 3. 现有 lifecycle.test.ts 修复，CREATE_TABLES_SQL 更新含 blocked_reason/evidence_json/files_touched 列
- 4. 全量测试套件 npm test 通过（0 failures）

## Proof Level

- This slice proves: integration — service-layer integration tests against in-memory SQLite exercising the full state machine including block/unblock and evidence submission. Real business logic, no mocks.

## Integration Closure

Upstream surfaces consumed: S01's outputJson utility pattern, S02's blockTask/unblockTask service functions, S03's completeTask with evidence/filesTouched and modules API.
New wiring introduced in this slice: agent-lifecycle.test.ts exercises all S01-S03 capabilities in sequence; existing lifecycle.test.ts updated to include new columns.
What remains before the milestone is truly usable end-to-end: S05 (GSD2 mt-cli Extension) for real GSD2 integration.

## Verification

- Tests provide observable signals for failure diagnosis: each describe block is a distinct lifecycle phase, error assertions include currentStatus/blockedReason/evidence fields for debugging.

## Tasks

- [x] **T01: Fix existing lifecycle.test.ts CREATE_TABLES_SQL and add block/unblock lifecycle tests** `est:30m`
  Update the CREATE_TABLES_SQL in lifecycle.test.ts to include the new columns (blocked_reason, evidence_json, files_touched) added by S02 and S03. Add new test cases for the block/unblock lifecycle within the existing lifecycle test file, exercising: claim → block (with reason) → unblock → complete. Also add tests for complete with evidence and filesTouched.
  - Files: `src/lib/server/lifecycle.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/lifecycle.test.ts

- [x] **T02: Create agent-lifecycle.test.ts — full AI Agent E2E scenario test** `est:45m`
  Create a new test file `src/lib/server/agent-lifecycle.test.ts` that simulates a complete third-party AI Agent lifecycle as described in the roadmap. This is the core E2E scenario test.
  - Files: `src/lib/server/agent-lifecycle.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/agent-lifecycle.test.ts

- [x] **T03: Verify full test suite passes and fix any remaining issues** `est:15m`
  Run the complete test suite (`npm test` at root + `cd packages/cli && npm test`) and verify 0 failures. Fix any issues found in the tests from T01/T02, or any pre-existing test issues that surface. This task ensures the test suite is green before S04 completion.
  - Files: `src/lib/server/agent-lifecycle.test.ts`, `src/lib/server/lifecycle.test.ts`
  - Verify: cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npm test && cd packages/cli && npm test

## Files Likely Touched

- src/lib/server/lifecycle.test.ts
- src/lib/server/agent-lifecycle.test.ts
