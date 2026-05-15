# Codebase Map

Generated: 2026-05-15T14:16:11Z | Files: 195 | Described: 0/195
<!-- gsd:codebase-meta {"generatedAt":"2026-05-15T14:16:11Z","fingerprint":"f2277ab37311d0d8d80a60a687cb63a32f84aafe","fileCount":195,"truncated":false} -->

### (root)/
- `.env.example`
- `.gitignore`
- `1`
- `3`
- `drizzle.config.ts`
- `package-lock.json`
- `package.json`
- `README.md`
- `svelte.config.js`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.config.ts`

### "docs/\350\256\276\350\256\241\350\276\223\345\205\245\343\200\201\351\234\200\346\261\202\346\226\207\346\241\243/
- `"docs/\350\256\276\350\256\241\350\276\223\345\205\245\343\200\201\351\234\200\346\261\202\346\226\207\346\241\243/milestone-tracker-dev-notes.md"`
- `"docs/\350\256\276\350\256\241\350\276\223\345\205\245\343\200\201\351\234\200\346\261\202\346\226\207\346\241\243/milestone-tracker-system-spec-2026-05-12.md"`

### .gsd.migrating/
- `.gsd.migrating/CODEBASE.md`
- `.gsd.migrating/doctor-history.jsonl`
- `.gsd.migrating/event-log.jsonl`
- `.gsd.migrating/gsd.db`
- `.gsd.migrating/gsd.db-shm`
- `.gsd.migrating/gsd.db-wal`
- `.gsd.migrating/metrics.json`
- `.gsd.migrating/notifications.jsonl`
- `.gsd.migrating/PROJECT.md`
- `.gsd.migrating/REQUIREMENTS.md`
- `.gsd.migrating/state-manifest.json`
- `.gsd.migrating/STATE.md`

### .gsd.migrating/audit/
- `.gsd.migrating/audit/events.jsonl`

### .gsd.migrating/milestones/M003/
- `.gsd.migrating/milestones/M003/M003-ROADMAP.md`

### .gsd.migrating/milestones/M003/slices/S05/tasks/
- `.gsd.migrating/milestones/M003/slices/S05/tasks/T01-SUMMARY.md`
- `.gsd.migrating/milestones/M003/slices/S05/tasks/T01-VERIFY.json`
- `.gsd.migrating/milestones/M003/slices/S05/tasks/T02-SUMMARY.md`
- `.gsd.migrating/milestones/M003/slices/S05/tasks/T02-VERIFY.json`
- `.gsd.migrating/milestones/M003/slices/S05/tasks/T03-SUMMARY.md`
- `.gsd.migrating/milestones/M003/slices/S05/tasks/T03-VERIFY.json`

### .gsd.migrating/runtime/
- `.gsd.migrating/runtime/uok-parity.jsonl`
- `.gsd.migrating/runtime/uok-plan-v2-graph.json`

### .playwright-cli/
- `.playwright-cli/page-2026-05-14T16-05-58-180Z.yml`
- `.playwright-cli/page-2026-05-14T16-06-05-680Z.yml`
- `.playwright-cli/page-2026-05-14T16-06-16-545Z.yml`
- `.playwright-cli/page-2026-05-14T16-06-31-024Z.yml`
- `.playwright-cli/page-2026-05-14T16-06-44-507Z.yml`

### docs/
- `docs/agent-integration-guide.md`
- `docs/architecture.md`
- `docs/cli-third-party-ai-evaluation.md`
- `docs/deployment.md`
- `docs/development-notes.md`
- `docs/mt-cli-extension.md`

### docs/feedback/
- `docs/feedback/cli-third-party-ai-evaluation.md`

### packages/cli/
- `packages/cli/package-lock.json`
- `packages/cli/package.json`
- `packages/cli/README.md`
- `packages/cli/tsconfig.json`
- `packages/cli/vitest.config.ts`

### packages/cli/src/
- `packages/cli/src/client.ts`
- `packages/cli/src/config.ts`
- `packages/cli/src/index.ts`
- `packages/cli/src/types.ts`

### packages/cli/src/__tests__/
- `packages/cli/src/__tests__/block-unblock.test.ts`
- `packages/cli/src/__tests__/client.test.ts`
- `packages/cli/src/__tests__/commands.test.ts`
- `packages/cli/src/__tests__/concurrency.test.ts`
- `packages/cli/src/__tests__/config.test.ts`
- `packages/cli/src/__tests__/error-output.test.ts`
- `packages/cli/src/__tests__/json-commands.test.ts`
- `packages/cli/src/__tests__/json-output.test.ts`
- `packages/cli/src/__tests__/modules-commands.test.ts`

### packages/cli/src/commands/
- `packages/cli/src/commands/block.ts`
- `packages/cli/src/commands/claim.ts`
- `packages/cli/src/commands/complete.ts`
- `packages/cli/src/commands/list.ts`
- `packages/cli/src/commands/mine.ts`
- `packages/cli/src/commands/modules-list.ts`
- `packages/cli/src/commands/modules-show.ts`
- `packages/cli/src/commands/progress.ts`
- `packages/cli/src/commands/show.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/commands/unblock.ts`

### packages/cli/src/utils/
- `packages/cli/src/utils/format.ts`
- `packages/cli/src/utils/id.ts`
- `packages/cli/src/utils/json-output.ts`

### scripts/
- `scripts/build-and-run.bat`
- `scripts/deploy.bat`
- `scripts/install-service.bat`
- `scripts/start-service.bat`
- `scripts/stop-service.bat`
- `scripts/uninstall-service.bat`
- `scripts/verify-no-secrets.sh`
- `scripts/verify-remote.sh`

### scripts/config/
- `scripts/config/deploy-config.bat.example`

### src/
- `src/app.css`
- `src/app.d.ts`
- `src/app.html`
- `src/hooks.server.ts`

### src/lib/
- `src/lib/scaffold.test.ts`
- `src/lib/types.ts`

### src/lib/client/
- `src/lib/client/sse-client.ts`

### src/lib/components/
- `src/lib/components/CompareSuggestions.svelte`
- `src/lib/components/DecomposeEditor.svelte`
- `src/lib/components/DecomposeStream.svelte`
- `src/lib/components/KanbanModuleCard.svelte`
- `src/lib/components/KanbanTaskCard.svelte`
- `src/lib/components/MdViewer.svelte`
- `src/lib/components/MilestoneCard.svelte`
- `src/lib/components/MilestoneSlidePanel.svelte`
- `src/lib/components/ModuleSection.svelte`
- `src/lib/components/StatusBadge.svelte`
- `src/lib/components/TaskCard.svelte`
- `src/lib/components/TaskContextMenu.svelte`
- `src/lib/components/TaskEditModal.svelte`
- `src/lib/components/TaskRefChip.svelte`
- `src/lib/components/Toast.svelte`

### src/lib/db/
- `src/lib/db/index.ts`
- `src/lib/db/schema.test.ts`
- `src/lib/db/schema.ts`

### src/lib/schemas/
- `src/lib/schemas/auth.ts`
- `src/lib/schemas/common.ts`
- `src/lib/schemas/confirm.ts`
- `src/lib/schemas/decompose.ts`
- `src/lib/schemas/index.ts`
- `src/lib/schemas/milestone.ts`
- `src/lib/schemas/module.ts`
- `src/lib/schemas/schemas.test.ts`
- `src/lib/schemas/task.ts`

### src/lib/server/
- *(23 files: 23 .ts)*

### src/lib/stores/
- `src/lib/stores/decompose-state.svelte.ts`
- `src/lib/stores/kanban-state.svelte.ts`
- `src/lib/stores/toast.svelte.ts`

### src/routes/
- `src/routes/+layout.svelte`

### src/routes/(app)/
- `src/routes/(app)/+layout.svelte`
- `src/routes/(app)/+page.server.ts`
- `src/routes/(app)/+page.svelte`

### src/routes/(app)/milestones/[id]/
- `src/routes/(app)/milestones/[id]/+page.server.ts`
- `src/routes/(app)/milestones/[id]/+page.svelte`

### src/routes/(app)/milestones/[id]/kanban/
- `src/routes/(app)/milestones/[id]/kanban/+page.server.ts`
- `src/routes/(app)/milestones/[id]/kanban/+page.svelte`

### src/routes/(app)/milestones/[id]/preview/
- `src/routes/(app)/milestones/[id]/preview/+page.server.ts`
- `src/routes/(app)/milestones/[id]/preview/+page.svelte`

### src/routes/(app)/milestones/create/
- `src/routes/(app)/milestones/create/+page.svelte`

### src/routes/api/auth/login/
- `src/routes/api/auth/login/+server.ts`

### src/routes/api/auth/logout/
- `src/routes/api/auth/logout/+server.ts`

### src/routes/api/health/
- `src/routes/api/health/+server.ts`
- `src/routes/api/health/health-utils.ts`
- `src/routes/api/health/health.test.ts`

### src/routes/api/milestones/
- `src/routes/api/milestones/+server.ts`

### src/routes/api/milestones/[id]/
- `src/routes/api/milestones/[id]/+server.ts`

### src/routes/api/milestones/[id]/compare/
- `src/routes/api/milestones/[id]/compare/+server.ts`

### src/routes/api/milestones/[id]/confirm/
- `src/routes/api/milestones/[id]/confirm/+server.ts`

### src/routes/api/milestones/[id]/decompose/
- `src/routes/api/milestones/[id]/decompose/+server.ts`

### src/routes/api/milestones/[id]/modules/
- `src/routes/api/milestones/[id]/modules/+server.ts`

### src/routes/api/modules/[id]/
- `src/routes/api/modules/[id]/+server.ts`

### src/routes/api/tasks/
- `src/routes/api/tasks/+server.ts`

### src/routes/api/tasks/[id]/
- `src/routes/api/tasks/[id]/+server.ts`

### src/routes/api/tasks/[id]/block/
- `src/routes/api/tasks/[id]/block/+server.ts`

### src/routes/api/tasks/[id]/claim/
- `src/routes/api/tasks/[id]/claim/+server.ts`

### src/routes/api/tasks/[id]/complete/
- `src/routes/api/tasks/[id]/complete/+server.ts`

### src/routes/api/tasks/[id]/progress/
- `src/routes/api/tasks/[id]/progress/+server.ts`

### src/routes/api/tasks/[id]/unblock/
- `src/routes/api/tasks/[id]/unblock/+server.ts`

### src/routes/login/
- `src/routes/login/+page.svelte`

### tests/agent-e2e/
- `tests/agent-e2e/.mt-cli.json`
- `tests/agent-e2e/agent-e2e.config.ts`
- `tests/agent-e2e/commands.test.ts`
- `tests/agent-e2e/errors-concurrency.test.ts`
- `tests/agent-e2e/global-setup.ts`
- `tests/agent-e2e/global-teardown.ts`
- `tests/agent-e2e/helpers.ts`
- `tests/agent-e2e/infrastructure.test.ts`
- `tests/agent-e2e/results.json`

### tests/e2e/
- `tests/e2e/auth.test.ts`
- `tests/e2e/business-flow.test.ts`
- `tests/e2e/e2e.config.ts`
- `tests/e2e/health.test.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/results.json`
