---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T02: Extend CLI complete command with --evidence and --files-touched options

Update TaskResponse type in packages/cli/src/types.ts to include evidenceJson and filesTouched fields. Add --evidence <json> and --files-touched <json> options to the complete command in packages/cli/src/commands/complete.ts. Parse the JSON strings, validate they are arrays, and include them in the POST body. The --json flag (already present) will output the enriched response. Add CLI integration tests exercising the new options in both success and error paths.

## Inputs

- `packages/cli/src/types.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/__tests__/json-commands.test.ts`
- `packages/cli/src/utils/json-output.ts`

## Expected Output

- `packages/cli/src/types.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/__tests__/json-commands.test.ts`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run packages/cli/src/__tests__/json-commands.test.ts
