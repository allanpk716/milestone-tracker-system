---
estimated_steps: 1
estimated_files: 4
skills_used: []
---

# T04: Add modules list and show CLI commands with --json support

Create packages/cli/src/commands/modules-list.ts and packages/cli/src/commands/modules-show.ts. Register a new 'modules' command group in index.ts with 'list' and 'show' subcommands. modules list calls GET /api/milestones/{milestoneId}/modules using config.milestoneId. modules show calls GET /api/modules/{id}. Both commands support --json flag using outputJson/outputJsonError from S01. Write integration tests covering both commands in success, error, and --json modes.

## Inputs

- `packages/cli/src/utils/json-output.ts`
- `packages/cli/src/client.ts`
- `packages/cli/src/config.ts`
- `packages/cli/src/index.ts`

## Expected Output

- `packages/cli/src/commands/modules-list.ts`
- `packages/cli/src/commands/modules-show.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/__tests__/modules-commands.test.ts`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run packages/cli/src/__tests__/modules-commands.test.ts
