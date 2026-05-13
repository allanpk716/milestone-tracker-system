---
estimated_steps: 14
estimated_files: 1
skills_used: []
---

# T02: Build health verification and cross-slice regression fixes

Run full production build and test suite to verify cross-slice integration health:

1. Run `npm run build` — must exit 0
2. Run `npx vitest run` — all existing 309+ tests + new lifecycle tests must pass
3. If build fails: fix TypeScript errors, missing imports, type mismatches across slice boundaries
4. If tests fail: fix integration issues discovered by cross-slice data flow
5. Verify no TODO/placeholder code in production source (grep for TODO/FIXME/HACK)
6. Verify kanban page route is registered and builds
7. Verify CLI package still builds alongside main app

Common cross-slice issues to check:
- Schema imports between slices (confirm schemas, task schemas, admin action schemas)
- Service function signatures match what route handlers expect
- No circular dependencies between service modules
- shared state stores compile without TypeScript errors
- Svelte components import correct types from schemas

## Inputs

- `src/lib/server/lifecycle.test.ts`
- `src/lib/server/milestone-service.ts`
- `src/lib/server/module-service.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/confirm-service.ts`
- `src/lib/server/compare-service.ts`
- `src/lib/server/decompose-service.ts`
- `src/lib/schemas/index.ts`
- `src/lib/db/schema.ts`
- `src/routes/api/milestones/[id]/confirm/+server.ts`
- `src/routes/api/milestones/[id]/compare/+server.ts`
- `src/routes/api/tasks/[id]/+server.ts`
- `src/routes/api/tasks/[id]/claim/+server.ts`
- `src/routes/api/tasks/[id]/progress/+server.ts`
- `src/routes/api/tasks/[id]/complete/+server.ts`
- `src/routes/(app)/milestones/[id]/kanban/+page.server.ts`
- `src/routes/(app)/milestones/[id]/preview/+page.server.ts`

## Expected Output

- `src/lib/server/lifecycle.test.ts`

## Verification

npm run build && npx vitest run
