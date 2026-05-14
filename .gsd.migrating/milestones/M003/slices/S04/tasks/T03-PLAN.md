---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T03: Verify full test suite passes and fix any remaining issues

Run the complete test suite (`npm test` at root + `cd packages/cli && npm test`) and verify 0 failures. Fix any issues found in the tests from T01/T02, or any pre-existing test issues that surface. This task ensures the test suite is green before S04 completion.

## Inputs

- `src/lib/server/agent-lifecycle.test.ts — test file from T02`
- `src/lib/server/lifecycle.test.ts — updated test file from T01`

## Expected Output

- `src/lib/server/agent-lifecycle.test.ts`
- `src/lib/server/lifecycle.test.ts`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npm test && cd packages/cli && npm test
