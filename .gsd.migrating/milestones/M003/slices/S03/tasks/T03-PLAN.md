---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Add GET /api/modules/[id] server endpoint for single module retrieval

Add a getModule(db, id) function to src/lib/server/module-service.ts that fetches a single module by ID. Add a GET handler to src/routes/api/modules/[id]/+server.ts that calls getModule and returns 404 if not found. Write unit tests in module-service.test.ts for the new function.

## Inputs

- `src/lib/server/module-service.ts`
- `src/routes/api/modules/[id]/+server.ts`
- `src/lib/server/module-service.test.ts`

## Expected Output

- `src/lib/server/module-service.ts`
- `src/routes/api/modules/[id]/+server.ts`
- `src/lib/server/module-service.test.ts`

## Verification

cd /c/WorkSpace/agent/milestone-tracker-system/.gsd/worktrees/M003 && npx vitest run src/lib/server/module-service.test.ts
