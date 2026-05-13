---
estimated_steps: 1
estimated_files: 7
skills_used: []
---

# T03: Define Zod schemas for all API request/response contracts

Create comprehensive Zod schemas covering all API input/output contracts from the spec. Organize in `src/lib/schemas/`. Include: milestone schemas (create, update, response), module schemas (create, update, response), task schemas (claim, progress, complete, admin action, response with resolved references), auth schemas (login request/response), shared utility schemas (pagination, error response). Export TypeScript types from schemas using `z.infer`. Write Vitest tests verifying each schema accepts valid inputs and rejects invalid inputs (missing fields, wrong types, invalid status transitions, oversized source_md).

## Inputs

- `src/lib/db/schema.ts`

## Expected Output

- `src/lib/schemas/milestone.ts`
- `src/lib/schemas/module.ts`
- `src/lib/schemas/task.ts`
- `src/lib/schemas/auth.ts`
- `src/lib/schemas/common.ts`
- `src/lib/schemas/index.ts`
- `src/lib/types.ts`

## Verification

cd C:/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M001 && npm test -- --grep "schema"
