/**
 * Full AI Agent lifecycle E2E scenario test.
 *
 * Simulates a complete third-party AI Agent lifecycle:
 *   discover → claim → progress → block → unblock → complete (with evidence)
 * covering error scenarios, multi-agent conflicts, and cross-cutting assertions.
 *
 * Pattern: in-memory SQLite, service-layer calls, no mocks (same as lifecycle.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/db/schema.js';
import { createMilestone, getMilestone } from './milestone-service.js';
import { confirmMilestone } from './confirm-service.js';
import {
	claimTask,
	progressTask,
	completeTask,
	listTasks,
	listKanbanData,
	blockTask,
	unblockTask,
	getTask
} from './task-service.js';

// ── Test database setup ──────────────────────────────────────────────────────

let db: ReturnType<typeof drizzle>;
let sqliteDb: Database.Database;

const CREATE_TABLES_SQL = `
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_md TEXT,
  git_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX milestone_status_idx ON milestones (status);

CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX module_milestone_id_idx ON modules (milestone_id);
CREATE INDEX module_status_idx ON modules (status);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  short_id INTEGER NOT NULL UNIQUE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "references" TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee TEXT,
  sub_total INTEGER NOT NULL DEFAULT 0,
  sub_done INTEGER NOT NULL DEFAULT 0,
  progress_message TEXT,
  commit_hash TEXT,
  blocked_reason TEXT,
  evidence_json TEXT,
  files_touched TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  reported_at INTEGER
);
CREATE INDEX task_status_module_idx ON tasks (status, module_id);
CREATE INDEX task_status_reported_idx ON tasks (status, reported_at);
CREATE INDEX task_module_id_idx ON tasks (module_id);
CREATE INDEX task_short_id_idx ON tasks (short_id);
`;

beforeAll(() => {
	sqliteDb = new Database(':memory:');
	sqliteDb.pragma('journal_mode = WAL');
	sqliteDb.pragma('foreign_keys = ON');
	sqliteDb.exec(CREATE_TABLES_SQL);
	db = drizzle(sqliteDb, { schema });
});

afterAll(() => {
	sqliteDb.close();
});

beforeEach(() => {
	sqliteDb.exec('DELETE FROM tasks');
	sqliteDb.exec('DELETE FROM modules');
	sqliteDb.exec('DELETE FROM milestones');
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_MD = '# Milestone\n\nBuild an end-to-end AI agent system.';

const THREE_MODULES = [
	{
		name: 'Auth Module',
		description: 'Authentication and authorization',
		tasks: [
			{ title: 'Setup OAuth provider', description: 'Configure OAuth2 provider' },
			{ title: 'Implement login flow', description: 'Build login UI and API' },
			{ title: 'Add RBAC middleware', description: 'Role-based access control' }
		]
	},
	{
		name: 'API Module',
		description: 'REST API endpoints',
		tasks: [
			{ title: 'Create CRUD endpoints', description: 'Build basic CRUD operations' },
			{ title: 'Add pagination', description: 'Implement cursor-based pagination' },
			{ title: 'Rate limiting', description: 'Add request rate limiting' }
		]
	},
	{
		name: 'Frontend Module',
		description: 'User interface',
		tasks: [
			{ title: 'Build dashboard', description: 'Main dashboard page' },
			{ title: 'Add notifications', description: 'Real-time notifications' },
			{ title: 'Responsive layout', description: 'Mobile-friendly design' }
		]
	}
];

/** Seed a milestone and confirm 3 modules × 3 tasks = 9 tasks total. */
async function seedFullMilestone() {
	const ms = await createMilestone(db, { title: 'Agent Lifecycle Test', sourceMd: SOURCE_MD });
	const result = await confirmMilestone(db, ms.id!, THREE_MODULES);
	if ('error' in result) throw new Error(`confirm failed: ${JSON.stringify(result.error)}`);
	return { milestoneId: ms.id!, modules: result.data!, milestone: ms };
}

/** Claim → progress → complete (with optional evidence/files). */
async function driveToDone(
	taskId: string,
	assignee: string,
	opts?: { commitHash?: string; evidence?: Array<{ command: string; exitCode: number; verdict: string }>; filesTouched?: string[] }
) {
	const claimed = await claimTask(db, taskId, { assignee });
	if ('error' in claimed) throw new Error(`claim failed for ${taskId}: ${JSON.stringify(claimed)}`);

	const progressed = await progressTask(db, taskId, {
		progressMessage: 'Working on it',
		subTotal: 5,
		subDone: 3
	});
	if ('error' in progressed) throw new Error(`progress failed for ${taskId}: ${JSON.stringify(progressed)}`);

	const completed = await completeTask(db, taskId, {
		commitHash: opts?.commitHash ?? 'abc123',
		evidence: opts?.evidence,
		filesTouched: opts?.filesTouched
	});
	if ('error' in completed) throw new Error(`complete failed for ${taskId}: ${JSON.stringify(completed)}`);

	return completed.task!;
}

// ── 1. Seed & Discover ──────────────────────────────────────────────────────

describe('Phase 1: Seed milestone and discover tasks', () => {
	it('seeds 3 modules with 3 tasks each → 9 total tasks', async () => {
		const { modules } = await seedFullMilestone();
		expect(modules).toHaveLength(3);
		const totalTasks = modules.reduce((sum, m) => sum + m.tasks.length, 0);
		expect(totalTasks).toBe(9);
	});

	it('agent discovers tasks via listTasks → all in todo status', async () => {
		const { milestoneId } = await seedFullMilestone();
		const tasks = await listTasks(db, { milestoneId });
		expect(tasks).toHaveLength(9);
		expect(tasks.every((t) => t.status === 'todo')).toBe(true);
	});

	it('listTasks returns tasks ordered by shortId', async () => {
		const { milestoneId } = await seedFullMilestone();
		const tasks = await listTasks(db, { milestoneId });
		for (let i = 1; i < tasks.length; i++) {
			expect(tasks[i].shortId).toBeGreaterThan(tasks[i - 1].shortId);
		}
	});
});

// ── 2. Claim ─────────────────────────────────────────────────────────────────

describe('Phase 2: Agent claims a task', () => {
	it('agent-001 claims first task → in-progress, assignee set', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		const result = await claimTask(db, taskId, { assignee: 'agent-001' });
		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('in-progress');
		expect(result.task!.assignee).toBe('agent-001');
	});
});

// ── 3. Progress ──────────────────────────────────────────────────────────────

describe('Phase 3: Agent reports progress', () => {
	it('agent-001 reports progress → counters and message updated', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });
		const result = await progressTask(db, taskId, {
			progressMessage: 'Setting up auth module',
			subTotal: 5,
			subDone: 2
		});

		expect('error' in result).toBe(false);
		expect(result.task!.progressMessage).toBe('Setting up auth module');
		expect(result.task!.subTotal).toBe(5);
		expect(result.task!.subDone).toBe(2);
	});
});

// ── 4. Block ─────────────────────────────────────────────────────────────────

describe('Phase 4: Agent hits blocker', () => {
	it('agent-001 blocks task with reason → blocked status, blockedReason set', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });
		const result = await blockTask(db, taskId, { reason: '缺少 OAuth 配置，无法继续' });

		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('blocked');
		expect(result.task!.blockedReason).toBe('缺少 OAuth 配置，无法继续');
	});
});

// ── 5. Unblock ───────────────────────────────────────────────────────────────

describe('Phase 5: Admin resolves blocker', () => {
	it('unblock → in-progress, blockedReason cleared, progressMessage updated', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });
		await blockTask(db, taskId, { reason: '缺少 OAuth 配置，无法继续' });

		const result = await unblockTask(db, taskId, { message: 'OAuth config已添加，可继续' });
		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('in-progress');
		expect(result.task!.blockedReason).toBeNull();
		expect(result.task!.progressMessage).toBe('OAuth config已添加，可继续');
	});
});

// ── 6. Complete with evidence ────────────────────────────────────────────────

describe('Phase 6: Agent completes with evidence and files', () => {
	it('complete with evidence + filesTouched → done, fields persisted as JSON', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });
		await blockTask(db, taskId, { reason: '缺少 OAuth 配置，无法继续' });
		await unblockTask(db, taskId, { message: 'OAuth config已添加，可继续' });

		const evidence = [
			{ command: 'npm test', exitCode: 0, verdict: 'pass' },
			{ command: 'npm run build', exitCode: 0, verdict: 'pass' }
		];
		const files = ['src/api/auth.ts', 'src/lib/oauth.ts'];

		const result = await completeTask(db, taskId, {
			commitHash: 'a1b2c3d',
			evidence,
			filesTouched: files
		});

		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('done');
		expect(result.task!.commitHash).toBe('a1b2c3d');
		expect(result.task!.evidence).toEqual(evidence);
		expect(result.task!.filesTouched).toEqual(files);
		expect(result.task!.reportedAt).not.toBeNull();
	});
});

// ── 7. Full single-task lifecycle (end-to-end) ──────────────────────────────

describe('Full single-task lifecycle: discover → claim → progress → block → unblock → complete', () => {
	it('drives one task through entire lifecycle with all assertions', async () => {
		const { milestoneId, modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		// Discover
		const discovered = await listTasks(db, { milestoneId });
		const target = discovered.find((t) => t.id === taskId)!;
		expect(target.status).toBe('todo');
		expect(target.assignee).toBeNull();

		// Claim
		const claimed = await claimTask(db, taskId, { assignee: 'agent-001' });
		expect(claimed.task!.status).toBe('in-progress');
		expect(claimed.task!.assignee).toBe('agent-001');

		// Progress
		const progressed = await progressTask(db, taskId, {
			progressMessage: 'Setting up auth module',
			subTotal: 5,
			subDone: 2
		});
		expect(progressed.task!.progressMessage).toBe('Setting up auth module');
		expect(progressed.task!.subTotal).toBe(5);
		expect(progressed.task!.subDone).toBe(2);

		// Block
		const blocked = await blockTask(db, taskId, { reason: '缺少 OAuth 配置，无法继续' });
		expect(blocked.task!.status).toBe('blocked');
		expect(blocked.task!.blockedReason).toBe('缺少 OAuth 配置，无法继续');

		// Unblock
		const unblocked = await unblockTask(db, taskId, { message: 'OAuth config已添加，可继续' });
		expect(unblocked.task!.status).toBe('in-progress');
		expect(unblocked.task!.blockedReason).toBeNull();

		// Complete with evidence
		const evidence = [
			{ command: 'npm test', exitCode: 0, verdict: 'pass' },
			{ command: 'npm run build', exitCode: 0, verdict: 'pass' }
		];
		const files = ['src/api/auth.ts', 'src/lib/oauth.ts'];

		const completed = await completeTask(db, taskId, {
			commitHash: 'a1b2c3d',
			evidence,
			filesTouched: files
		});
		expect(completed.task!.status).toBe('done');
		expect(completed.task!.evidence).toEqual(evidence);
		expect(completed.task!.filesTouched).toEqual(files);
		expect(completed.task!.reportedAt).not.toBeNull();

		// Verify via getTask detail
		const detail = await getTask(db, taskId);
		expect(detail).not.toBeNull();
		expect(detail!.status).toBe('done');
		expect(detail!.blockedReason).toBeNull();
		expect(detail!.evidence).toEqual(evidence);
		expect(detail!.filesTouched).toEqual(files);
		expect(detail!.assignee).toBe('agent-001');
	});
});

// ── 8. Multi-agent conflict scenario ─────────────────────────────────────────

describe('Multi-agent conflict: second agent tries to claim blocked task', () => {
	it('agent-001 claims, blocks → agent-002 tries claim → conflict, then unblock and complete', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		// agent-001 claims and blocks
		await claimTask(db, taskId, { assignee: 'agent-001' });
		await blockTask(db, taskId, { reason: 'Blocked by agent-001' });

		// agent-002 tries to claim while blocked → should fail (not todo/in-progress)
		const claimResult = await claimTask(db, taskId, { assignee: 'agent-002' });
		expect('error' in claimResult).toBe(true);
		expect(claimResult.error).toBe('invalid_status');

		// Unblock
		await unblockTask(db, taskId, { message: 'Resolved' });

		// agent-002 tries to claim again → conflict (still assigned to agent-001)
		const claimResult2 = await claimTask(db, taskId, { assignee: 'agent-002' });
		expect('error' in claimResult2).toBe(true);
		expect(claimResult2.error).toBe('conflict');
		if ('currentAssignee' in claimResult2) {
			expect(claimResult2.currentAssignee).toBe('agent-001');
		}

		// agent-001 completes the task
		const completed = await completeTask(db, taskId, {
			commitHash: 'conflict-resolved',
			evidence: [{ command: 'npm test', exitCode: 0, verdict: 'pass' }],
			filesTouched: ['src/api/auth.ts']
		});
		expect('error' in completed).toBe(false);
		expect(completed.task!.status).toBe('done');
	});
});

// ── 9. Drive all tasks to done → 100% kanban ────────────────────────────────

describe('Drive all 9 tasks to done → kanban shows 100%', () => {
	it('completes all tasks and verifies kanban progress is 100%', async () => {
		const { milestoneId, modules } = await seedFullMilestone();
		const allTaskIds = modules.flatMap((m) => m.tasks.map((t) => t.id));
		expect(allTaskIds).toHaveLength(9);

		// Drive each task through the full lifecycle
		for (let i = 0; i < allTaskIds.length; i++) {
			const tid = allTaskIds[i];
			const assignee = i % 2 === 0 ? 'agent-001' : 'agent-002';

			await claimTask(db, tid, { assignee });
			await progressTask(db, tid, {
				progressMessage: `Task ${i + 1} progress`,
				subTotal: 5,
				subDone: 3
			});

			// Only block/unblock for some tasks (odd-indexed)
			if (i % 2 === 1) {
				await blockTask(db, tid, { reason: `Blocker on task ${i + 1}` });
				await unblockTask(db, tid, { message: `Resolved blocker on task ${i + 1}` });
			}

			const completed = await completeTask(db, tid, {
				commitHash: `hash-${i}`,
				evidence: [{ command: `npm test --task-${i}`, exitCode: 0, verdict: 'pass' }],
				filesTouched: [`src/module-${Math.floor(i / 3)}/task-${i}.ts`]
			});
			expect(completed.task!.status).toBe('done');
		}

		// Verify all tasks are done via listTasks
		const allTasks = await listTasks(db, { milestoneId });
		expect(allTasks).toHaveLength(9);
		expect(allTasks.every((t) => t.status === 'done')).toBe(true);

		// Verify kanban shows 100%
		const kanban = await listKanbanData(db, milestoneId);
		expect(kanban).not.toBeNull();
		expect(kanban!.modules).toHaveLength(3);

		for (const mod of kanban!.modules) {
			expect(mod.progressPercent).toBe(100);
			expect(mod.doneTasks).toBe(3);
			expect(mod.totalTasks).toBe(3);
		}
	});
});

// ── 10. Error scenarios ─────────────────────────────────────────────────────

describe('Error scenarios', () => {
	it('claim already-claimed task by different agent → conflict with currentAssignee', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });

		const result = await claimTask(db, taskId, { assignee: 'agent-002' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('conflict');
		if ('currentAssignee' in result) {
			expect(result.currentAssignee).toBe('agent-001');
		}
	});

	it('block a todo task → invalid_status error', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;
		// Task is still todo, never claimed

		const result = await blockTask(db, taskId, { reason: 'Cannot start' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('todo');
		}
	});

	it('unblock a non-blocked (in-progress) task → invalid_status error', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });
		// Task is in-progress, not blocked

		const result = await unblockTask(db, taskId, { message: 'Nothing to unblock' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('in-progress');
		}
	});

	it('complete a todo task (skip claim) → invalid_status error', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;
		// Task is still todo

		const result = await completeTask(db, taskId, { commitHash: 'skip' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('todo');
		}
	});

	it('operations on non-existent task → not_found error', async () => {
		const ghostId = 'TASK-99999';

		// Claim
		const claim = await claimTask(db, ghostId, { assignee: 'agent-001' });
		expect(claim.error).toBe('not_found');

		// Progress
		const progress = await progressTask(db, ghostId, { progressMessage: 'x' });
		expect(progress.error).toBe('not_found');

		// Block
		const block = await blockTask(db, ghostId, { reason: 'x' });
		expect(block.error).toBe('not_found');

		// Unblock
		const unblock = await unblockTask(db, ghostId, { message: 'x' });
		expect(unblock.error).toBe('not_found');

		// Complete
		const complete = await completeTask(db, ghostId, { commitHash: 'x' });
		expect(complete.error).toBe('not_found');

		// GetTask
		const detail = await getTask(db, ghostId);
		expect(detail).toBeNull();
	});
});

// ── 11. Cross-cutting checks ─────────────────────────────────────────────────

describe('Cross-cutting checks', () => {
	it('evidenceJson and filesTouched are persisted as JSON and parseable on read', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });

		const evidence = [
			{ command: 'npx vitest run', exitCode: 0, verdict: 'pass' },
			{ command: 'npm run lint', exitCode: 1, verdict: 'fail' },
			{ command: 'npm run build', exitCode: 0, verdict: 'pass' }
		];
		const files = [
			'src/api/auth.ts',
			'src/lib/oauth.ts',
			'src/middleware/rbac.ts',
			'tests/auth.test.ts'
		];

		await completeTask(db, taskId, {
			commitHash: 'json-persist-test',
			evidence,
			filesTouched: files
		});

		// Read back via getTask
		const detail = await getTask(db, taskId);
		expect(detail).not.toBeNull();

		// evidence should be parsed JSON array
		expect(Array.isArray(detail!.evidence)).toBe(true);
		expect(detail!.evidence).toHaveLength(3);
		expect(detail!.evidence).toEqual(evidence);

		// filesTouched should be parsed JSON array
		expect(Array.isArray(detail!.filesTouched)).toBe(true);
		expect(detail!.filesTouched).toHaveLength(4);
		expect(detail!.filesTouched).toEqual(files);
	});

	it('blockedReason persists through block and clears on unblock', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });

		// Block with reason
		const blocked = await blockTask(db, taskId, { reason: 'Waiting for API key' });
		expect(blocked.task!.blockedReason).toBe('Waiting for API key');

		// Read back — reason persists
		const detail1 = await getTask(db, taskId);
		expect(detail1!.blockedReason).toBe('Waiting for API key');

		// Unblock
		await unblockTask(db, taskId, { message: 'API key received' });

		// Read back — reason cleared
		const detail2 = await getTask(db, taskId);
		expect(detail2!.blockedReason).toBeNull();
		expect(detail2!.progressMessage).toBe('API key received');
	});

	it('listKanbanData after full completion shows 100% progress', async () => {
		const { milestoneId, modules } = await seedFullMilestone();
		const allTaskIds = modules.flatMap((m) => m.tasks.map((t) => t.id));

		for (const tid of allTaskIds) {
			await driveToDone(tid, 'agent-001');
		}

		const kanban = await listKanbanData(db, milestoneId);
		expect(kanban).not.toBeNull();

		// Each module should be 100%
		for (const mod of kanban!.modules) {
			expect(mod.progressPercent).toBe(100);
			expect(mod.doneTasks).toBe(3);
			expect(mod.totalTasks).toBe(3);
		}

		// Verify assignees tracked
		const allAssignees = kanban!.modules.flatMap((m) => m.assignees);
		expect(allAssignees).toContain('agent-001');
	});

	it('getTask detail includes all new fields: blockedReason, evidence, filesTouched', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		// Before any operations — all fields should be null/default
		const initial = await getTask(db, taskId);
		expect(initial).not.toBeNull();
		expect(initial!.blockedReason).toBeNull();
		expect(initial!.evidence).toBeNull();
		expect(initial!.filesTouched).toBeNull();
		expect(initial!.status).toBe('todo');

		// After full lifecycle with all fields populated
		await claimTask(db, taskId, { assignee: 'agent-detail' });
		await progressTask(db, taskId, { progressMessage: 'Detail check', subTotal: 10, subDone: 7 });
		await blockTask(db, taskId, { reason: 'Detail blocker' });
		await unblockTask(db, taskId, { message: 'Detail resolved' });

		const evidence = [{ command: 'npm test --detail', exitCode: 0, verdict: 'pass' }];
		const files = ['src/detail/file.ts'];
		await completeTask(db, taskId, { commitHash: 'detail-hash', evidence, filesTouched: files });

		// Read back all fields
		const final = await getTask(db, taskId);
		expect(final).not.toBeNull();
		expect(final!.status).toBe('done');
		expect(final!.assignee).toBe('agent-detail');
		expect(final!.blockedReason).toBeNull();
		expect(final!.evidence).toEqual(evidence);
		expect(final!.filesTouched).toEqual(files);
		expect(final!.commitHash).toBe('detail-hash');
		expect(final!.progressMessage).toBe('Detail resolved'); // preserved from unblock
		expect(final!.reportedAt).not.toBeNull();

		// Also verify module and milestone info
		expect(final!.module).not.toBeNull();
		expect(final!.module!.name).toBe('Auth Module');
		expect(final!.milestone).not.toBeNull();
		expect(final!.milestone!.status).toBe('in-progress');
	});

	it('empty evidence/filesTouched stores null (not empty arrays)', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });

		const completed = await completeTask(db, taskId, {
			commitHash: 'empty-test',
			evidence: [],
			filesTouched: []
		});

		expect('error' in completed).toBe(false);
		expect(completed.task!.evidence).toBeNull();
		expect(completed.task!.filesTouched).toBeNull();
	});

	it('complete without evidence/filesTouched → both null', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });

		const completed = await completeTask(db, taskId, { commitHash: 'no-evidence' });

		expect('error' in completed).toBe(false);
		expect(completed.task!.evidence).toBeNull();
		expect(completed.task!.filesTouched).toBeNull();
	});
});

// ── 12. Same-agent re-claim idempotency ─────────────────────────────────────

describe('Same-agent re-claim idempotency', () => {
	it('same agent re-claiming succeeds and preserves status', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		const first = await claimTask(db, taskId, { assignee: 'agent-001' });
		expect('error' in first).toBe(false);
		expect(first.task!.status).toBe('in-progress');

		const second = await claimTask(db, taskId, { assignee: 'agent-001' });
		expect('error' in second).toBe(false);
		expect(second.task!.assignee).toBe('agent-001');
	});
});

// ── 13. Status transition edge cases ─────────────────────────────────────────

describe('Status transition edge cases', () => {
	it('cannot block a done task', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await driveToDone(taskId, 'agent-001');

		const result = await blockTask(db, taskId, { reason: 'Too late' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('done');
		}
	});

	it('cannot unblock a done task', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await driveToDone(taskId, 'agent-001');

		const result = await unblockTask(db, taskId, { message: 'N/A' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
	});

	it('cannot complete a blocked task without unblocking first', async () => {
		const { modules } = await seedFullMilestone();
		const taskId = modules[0].tasks[0].id;

		await claimTask(db, taskId, { assignee: 'agent-001' });
		await blockTask(db, taskId, { reason: 'Still blocked' });

		const result = await completeTask(db, taskId, { commitHash: 'blocked' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('blocked');
		}
	});
});
