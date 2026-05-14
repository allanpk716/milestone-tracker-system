/**
 * End-to-end lifecycle integration test.
 *
 * Exercises the full milestone lifecycle through service-layer calls against
 * an in-memory SQLite database — no HTTP layer, no mocks.  Each section is
 * a describe block so failures are easy to localise.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema.js';
import { createMilestone, getMilestone } from './milestone-service.js';
import { confirmMilestone } from './confirm-service.js';
import {
	claimTask,
	progressTask,
	completeTask,
	adminTaskAction,
	updateTask,
	listTasks,
	listKanbanData,
	blockTask,
	unblockTask
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

const SOURCE_MD = '# Milestone\n\nBuild an end-to-end system.';

async function seedMilestone() {
	return createMilestone(db, {
		title: 'Lifecycle Test',
		sourceMd: SOURCE_MD
	});
}

const CONFIRM_MODULES = [
	{
		name: 'Module A',
		description: 'First module',
		tasks: [
			{ title: 'Task A1', description: 'First task in A' },
			{ title: 'Task A2', description: 'Second task in A' },
			{ title: 'Task A3', description: 'Third task in A' }
		]
	},
	{
		name: 'Module B',
		description: 'Second module',
		tasks: [
			{ title: 'Task B1', description: 'First task in B' },
			{ title: 'Task B2', description: 'Second task in B' },
			{ title: 'Task B3', description: 'Third task in B' }
		]
	}
];

/** Confirm the milestone and return flat task-id list ordered by module then position. */
async function confirmAndGetTaskIds(milestoneId: string) {
	const result = await confirmMilestone(db, milestoneId, CONFIRM_MODULES);
	if ('error' in result) throw new Error(`confirm failed: ${JSON.stringify(result.error)}`);
	return result.data!.flatMap((m) => m.tasks.map((t) => t.id));
}

/** Drive one task through claim → progress → complete and return final state. */
async function driveTaskToDone(taskId: string, assignee: string, commitHash = 'abc123') {
	const claimed = await claimTask(db, taskId, { assignee });
	if ('error' in claimed) throw new Error(`claim failed: ${JSON.stringify(claimed)}`);

	const progressed = await progressTask(db, taskId, {
		progressMessage: 'Working on it',
		subTotal: 5,
		subDone: 3
	});
	if ('error' in progressed) throw new Error(`progress failed: ${JSON.stringify(progressed)}`);

	const completed = await completeTask(db, taskId, { commitHash });
	if ('error' in completed) throw new Error(`complete failed: ${JSON.stringify(completed)}`);

	return completed.task!;
}

// ── 1. Happy path lifecycle ─────────────────────────────────────────────────

describe('happy path lifecycle', () => {
	it('create milestone with sourceMd → draft status', async () => {
		const ms = await seedMilestone();
		expect(ms.status).toBe('draft');
		expect(ms.sourceMd).toBe(SOURCE_MD);
		expect(ms.id).toMatch(/^MS-\d+$/);
	});

	it('confirm 2 modules with 3 tasks each → milestone activated', async () => {
		const ms = await seedMilestone();
		const result = await confirmMilestone(db, ms.id!, CONFIRM_MODULES);

		expect('data' in result).toBe(true);
		const modules = result.data!;
		expect(modules).toHaveLength(2);
		expect(modules[0].tasks).toHaveLength(3);
		expect(modules[1].tasks).toHaveLength(3);

		// Milestone should now be in-progress
		const fresh = await getMilestone(db, ms.id!);
		expect(fresh!.status).toBe('in-progress');
	});

	it('agent claims task → todo becomes in-progress, assignee set', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		const result = await claimTask(db, taskId, { assignee: 'agent-a' });
		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('in-progress');
		expect(result.task!.assignee).toBe('agent-a');
	});

	it('agent reports progress → progressMessage and sub counters updated', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });
		const result = await progressTask(db, taskId, {
			progressMessage: 'Half done',
			subTotal: 10,
			subDone: 5
		});

		expect('error' in result).toBe(false);
		expect(result.task!.progressMessage).toBe('Half done');
		expect(result.task!.subTotal).toBe(10);
		expect(result.task!.subDone).toBe(5);
	});

	it('agent completes task → done status, reportedAt set', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });
		const result = await completeTask(db, taskId, { commitHash: 'deadbeef' });

		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('done');
		expect(result.task!.commitHash).toBe('deadbeef');
		expect(result.task!.reportedAt).not.toBeNull();
	});

	it('drives all 6 tasks through claim→progress→complete', async () => {
		const ms = await seedMilestone();
		const taskIds = await confirmAndGetTaskIds(ms.id!);
		expect(taskIds).toHaveLength(6);

		for (const tid of taskIds) {
			const final = await driveTaskToDone(tid, 'agent-a', 'c0ffee');
			expect(final.status).toBe('done');
			expect(final.reportedAt).not.toBeNull();
		}

		// All tasks done — verify via listTasks
		const all = await listTasks(db, { milestoneId: ms.id! });
		expect(all).toHaveLength(6);
		expect(all.every((t) => t.status === 'done')).toBe(true);
	});

	it('admin UAT-pass on all tasks via adminTaskAction', async () => {
		const ms = await seedMilestone();
		const taskIds = await confirmAndGetTaskIds(ms.id!);

		// Drive all tasks to done first
		for (const tid of taskIds) {
			await driveTaskToDone(tid, 'agent-a');
		}

		// Admin reviews and confirms done
		for (const tid of taskIds) {
			const result = await adminTaskAction(db, tid, { status: 'done', progressMessage: 'UAT passed' });
			expect('error' in result).toBe(false);
			expect(result.task!.status).toBe('done');
		}
	});

	it('kanban data shows 100% progress and no zombies', async () => {
		const ms = await seedMilestone();
		const taskIds = await confirmAndGetTaskIds(ms.id!);

		for (const tid of taskIds) {
			await driveTaskToDone(tid, 'agent-a');
		}

		const kanban = await listKanbanData(db, ms.id!);
		expect(kanban).not.toBeNull();
		expect(kanban!.modules).toHaveLength(2);

		for (const mod of kanban!.modules) {
			expect(mod.progressPercent).toBe(100);
			expect(mod.doneTasks).toBe(3);
			expect(mod.totalTasks).toBe(3);
			expect(mod.tasks.every((t) => !t.isZombie)).toBe(true);
		}
	});
});

// ── 2. Concurrent claim verification (sequential, service-level) ─────────────

describe('concurrent claim verification', () => {
	it('first claim succeeds, second claim by different agent returns conflict', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		const first = await claimTask(db, taskId, { assignee: 'agent-a' });
		expect('error' in first).toBe(false);

		const second = await claimTask(db, taskId, { assignee: 'agent-b' });
		expect('error' in second).toBe(true);
		if ('error' in second && second.error === 'conflict') {
			expect(second.currentAssignee).toBe('agent-a');
		} else {
			// Should not reach here
			throw new Error('Expected conflict error');
		}
	});

	it('claim on non-todo task (done) returns invalid_status', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await driveTaskToDone(taskId, 'agent-a');

		const result = await claimTask(db, taskId, { assignee: 'agent-b' });
		expect('error' in result).toBe(true);
		if ('error' in result && result.error === 'invalid_status') {
			expect(result.currentStatus).toBe('done');
		}
	});

	it('same-agent re-claim is idempotent (already claimed)', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		const first = await claimTask(db, taskId, { assignee: 'agent-a' });
		expect('error' in first).toBe(false);

		const second = await claimTask(db, taskId, { assignee: 'agent-a' });
		// Same agent re-claim should succeed (idempotent)
		expect('error' in second).toBe(false);
		expect(second.task!.assignee).toBe('agent-a');
	});

	it('claim on task already claimed by different agent returns conflict', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		const first = await claimTask(db, taskId, { assignee: 'agent-a' });
		expect('error' in first).toBe(false);

		const second = await claimTask(db, taskId, { assignee: 'agent-b' });
		expect('error' in second).toBe(true);
		expect(second.error).toBe('conflict');
	});
});

// ── 3. Error paths and boundary conditions ───────────────────────────────────

describe('error paths and boundary conditions', () => {
	it('confirm on non-draft milestone → bad_request', async () => {
		const ms = await seedMilestone();
		// Activate milestone
		await db
			.update(schema.milestones)
			.set({ status: 'in-progress' })
			.where(eq(schema.milestones.id, ms.id));

		const result = await confirmMilestone(db, ms.id!, CONFIRM_MODULES);
		expect('error' in result).toBe(true);
		expect(result.error.code).toBe('bad_request');
	});

	it('confirm on milestone without sourceMd → bad_request', async () => {
		const ms = await createMilestone(db, { title: 'No Source' });
		expect(ms.sourceMd).toBeNull();

		const result = await confirmMilestone(db, ms.id!, CONFIRM_MODULES);
		expect('error' in result).toBe(true);
		expect(result.error.code).toBe('bad_request');
		expect(result.error.message).toContain('no source markdown');
	});

	it('confirm on non-existent milestone → not_found', async () => {
		const result = await confirmMilestone(db, 'MS-99999', CONFIRM_MODULES);
		expect('error' in result).toBe(true);
		expect(result.error.code).toBe('not_found');
	});

	it('complete on non-in-progress task (todo) → invalid_status', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);
		// Task is in todo state, try to complete directly

		const result = await completeTask(db, taskId, { commitHash: 'abc' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('todo');
		}
	});

	it('progress on non-existent task → not_found', async () => {
		const result = await progressTask(db, 'TASK-99999', { progressMessage: 'hello' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('not_found');
	});

	it('admin action with invalid status transitions are allowed (admin override)', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		// Admin can set any status
		const result = await adminTaskAction(db, taskId, { status: 'blocked' });
		expect('error' in result).toBe(false);
		expect(result.task!.status).toBe('blocked');
	});

	it('admin action on non-existent task → not_found', async () => {
		const result = await adminTaskAction(db, 'TASK-99999', { status: 'done' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('not_found');
	});

	it('updateTask modifies title, description, and assignee', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		const result = await updateTask(db, taskId, {
			title: 'Updated title',
			description: 'Updated desc',
			assignee: 'new-agent'
		});

		expect('error' in result).toBe(false);
		expect(result.task!.title).toBe('Updated title');
		expect(result.task!.description).toBe('Updated desc');
		expect(result.task!.assignee).toBe('new-agent');
	});

	it('updateTask on non-existent task → not_found', async () => {
		const result = await updateTask(db, 'TASK-99999', { title: 'X' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('not_found');
	});

	it('claim on non-existent task → not_found', async () => {
		const result = await claimTask(db, 'TASK-99999', { assignee: 'agent-a' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('not_found');
	});
});

// ── 4. Cross-slice data flow ─────────────────────────────────────────────────

describe('cross-slice data flow', () => {
	it('getMilestone returns modules with tasks nested', async () => {
		const ms = await seedMilestone();
		await confirmAndGetTaskIds(ms.id!);

		const detail = await getMilestone(db, ms.id!);
		expect(detail).not.toBeNull();
		expect(detail!.status).toBe('in-progress');
		expect(detail!.modules).toHaveLength(2);
		expect(detail!.modules[0].tasks).toHaveLength(3);
		expect(detail!.modules[1].tasks).toHaveLength(3);
	});

	it('listTasks with milestoneId filter returns correct tasks', async () => {
		const ms = await seedMilestone();
		const taskIds = await confirmAndGetTaskIds(ms.id!);

		const tasks = await listTasks(db, { milestoneId: ms.id! });
		expect(tasks).toHaveLength(6);
		const ids = tasks.map((t) => t.id);
		for (const tid of taskIds) {
			expect(ids).toContain(tid);
		}
	});

	it('listKanbanData returns enriched data with zombie flags and progress', async () => {
		const ms = await seedMilestone();
		await confirmAndGetTaskIds(ms.id!);

		const kanban = await listKanbanData(db, ms.id!);
		expect(kanban).not.toBeNull();
		expect(kanban!.id).toBe(ms.id);
		expect(kanban!.modules).toHaveLength(2);

		for (const mod of kanban!.modules) {
			expect(mod).toHaveProperty('totalTasks');
			expect(mod).toHaveProperty('doneTasks');
			expect(mod).toHaveProperty('progressPercent');
			expect(mod).toHaveProperty('assignees');
			expect(mod.totalTasks).toBe(3);
			expect(mod.tasks.every((t: any) => 'isZombie' in t)).toBe(true);
		}
	});

	it('task reference field preserved through claim/progress/complete cycle', async () => {
		const ms = await seedMilestone();
		const result = await confirmMilestone(db, ms.id!, [
			{
				name: 'Ref Mod',
				description: null,
				tasks: [{ title: 'Ref Task', description: 'Has refs' }]
			}
		]);

		if ('error' in result) throw new Error('confirm failed');
		const taskId = result.data![0].tasks[0].id;

		// Set a reference via direct DB update (no service endpoint for references yet)
		await db
			.update(schema.tasks)
			.set({ references: 'PR-42, JIRA-101' })
			.where(eq(schema.tasks.id, taskId));

		// Drive through lifecycle
		await claimTask(db, taskId, { assignee: 'agent-a' });
		await progressTask(db, taskId, { progressMessage: 'working' });
		await completeTask(db, taskId, { commitHash: 'ref' });

		// Verify reference preserved
		const final = await db
			.select({ references: schema.tasks.references })
			.from(schema.tasks)
			.where(eq(schema.tasks.id, taskId))
			.get();

		expect(final!.references).toBe('PR-42, JIRA-101');
	});

	it('module status tracks child task completion', async () => {
		const ms = await seedMilestone();
		const result = await confirmMilestone(db, ms.id!, CONFIRM_MODULES);
		if ('error' in result) throw new Error('confirm failed');

		const modId = result.data![0].id;
		const taskIds = result.data![0].tasks.map((t) => t.id);

		// Complete all tasks in module A
		for (const tid of taskIds) {
			await driveTaskToDone(tid, 'agent-a');
		}

		// Verify module tasks are all done
		const moduleTasks = await listTasks(db, { moduleId: modId });
		expect(moduleTasks).toHaveLength(3);
		expect(moduleTasks.every((t) => t.status === 'done')).toBe(true);
	});
});

// ── 5. Block / Unblock lifecycle ─────────────────────────────────────────────

describe('block / unblock lifecycle', () => {
	it('claim → block (with reason) → status is blocked, blockedReason set', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const blocked = await blockTask(db, taskId, { reason: 'Waiting for API credentials' });
		expect('error' in blocked).toBe(false);
		expect(blocked.task!.status).toBe('blocked');
		expect(blocked.task!.blockedReason).toBe('Waiting for API credentials');
	});

	it('block → unblock → status back to in-progress, blockedReason cleared', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });
		await blockTask(db, taskId, { reason: 'Dependency issue' });

		const unblocked = await unblockTask(db, taskId, { message: 'Resolved dependency' });
		expect('error' in unblocked).toBe(false);
		expect(unblocked.task!.status).toBe('in-progress');
		expect(unblocked.task!.blockedReason).toBeNull();
		expect(unblocked.task!.progressMessage).toBe('Resolved dependency');
	});

	it('full lifecycle: claim → block → unblock → progress → complete', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		// Claim
		const claimed = await claimTask(db, taskId, { assignee: 'agent-a' });
		expect(claimed.task!.status).toBe('in-progress');

		// Block
		const blocked = await blockTask(db, taskId, { reason: 'Env var missing' });
		expect(blocked.task!.status).toBe('blocked');
		expect(blocked.task!.blockedReason).toBe('Env var missing');

		// Unblock
		const unblocked = await unblockTask(db, taskId, { message: 'Got the env var' });
		expect(unblocked.task!.status).toBe('in-progress');
		expect(unblocked.task!.blockedReason).toBeNull();

		// Progress
		const progressed = await progressTask(db, taskId, {
			progressMessage: 'Almost done',
			subTotal: 4,
			subDone: 3
		});
		expect(progressed.task!.subDone).toBe(3);

		// Complete
		const completed = await completeTask(db, taskId, { commitHash: 'a1b2c3' });
		expect(completed.task!.status).toBe('done');
		expect(completed.task!.reportedAt).not.toBeNull();
	});

	it('block on todo task → invalid_status', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		const result = await blockTask(db, taskId, { reason: 'Cannot start' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('todo');
		}
	});

	it('block on done task → invalid_status', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await driveTaskToDone(taskId, 'agent-a');

		const result = await blockTask(db, taskId, { reason: 'Too late' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('done');
		}
	});

	it('unblock on non-blocked task → invalid_status', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const result = await unblockTask(db, taskId, { message: 'Nothing to unblock' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('invalid_status');
		if ('currentStatus' in result) {
			expect(result.currentStatus).toBe('in-progress');
		}
	});

	it('block on non-existent task → not_found', async () => {
		const result = await blockTask(db, 'TASK-99999', { reason: 'ghost' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('not_found');
	});

	it('unblock on non-existent task → not_found', async () => {
		const result = await unblockTask(db, 'TASK-99999', { message: 'ghost' });
		expect('error' in result).toBe(true);
		expect(result.error).toBe('not_found');
	});

	it('unblock without message preserves existing progressMessage', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });
		await progressTask(db, taskId, { progressMessage: 'Before block' });
		await blockTask(db, taskId, { reason: 'Paused' });

		const unblocked = await unblockTask(db, taskId, {});
		expect('error' in unblocked).toBe(false);
		expect(unblocked.task!.progressMessage).toBe('Before block');
	});
});

// ── 6. Complete with evidence and filesTouched ───────────────────────────────

describe('complete with evidence and filesTouched', () => {
	it('complete with evidence stores parsed JSON in evidence field', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const evidence = [
			{ command: 'npx vitest run', exitCode: 0, verdict: 'pass' },
			{ command: 'npx lint', exitCode: 0, verdict: 'pass' }
		];

		const completed = await completeTask(db, taskId, { commitHash: 'e1e2e3', evidence });
		expect('error' in completed).toBe(false);
		expect(completed.task!.status).toBe('done');
		expect(completed.task!.evidence).toEqual(evidence);
		expect(completed.task!.evidence).toHaveLength(2);
	});

	it('complete with filesTouched stores parsed JSON in filesTouched field', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const files = ['src/lib/server/task-service.ts', 'src/lib/db/schema.ts'];

		const completed = await completeTask(db, taskId, { commitHash: 'f1f2f3', filesTouched: files });
		expect('error' in completed).toBe(false);
		expect(completed.task!.status).toBe('done');
		expect(completed.task!.filesTouched).toEqual(files);
		expect(completed.task!.filesTouched).toHaveLength(2);
	});

	it('complete with both evidence and filesTouched stores both', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const evidence = [
			{ command: 'npx vitest run', exitCode: 0, verdict: 'pass' }
		];
		const files = ['src/lib/server/lifecycle.test.ts'];

		const completed = await completeTask(db, taskId, {
			commitHash: 'g1g2g3',
			evidence,
			filesTouched: files
		});

		expect('error' in completed).toBe(false);
		expect(completed.task!.evidence).toEqual(evidence);
		expect(completed.task!.filesTouched).toEqual(files);
	});

	it('complete with empty evidence/filesTouched stores null', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const completed = await completeTask(db, taskId, {
			commitHash: 'h1h2h3',
			evidence: [],
			filesTouched: []
		});

		expect('error' in completed).toBe(false);
		expect(completed.task!.evidence).toBeNull();
		expect(completed.task!.filesTouched).toBeNull();
	});

	it('complete without evidence/filesTouched returns null for both', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-a' });

		const completed = await completeTask(db, taskId, { commitHash: 'i1i2i3' });

		expect('error' in completed).toBe(false);
		expect(completed.task!.evidence).toBeNull();
		expect(completed.task!.filesTouched).toBeNull();
	});

	it('full lifecycle with evidence: claim → progress → block → unblock → complete + evidence + files', async () => {
		const ms = await seedMilestone();
		const [taskId] = await confirmAndGetTaskIds(ms.id!);

		await claimTask(db, taskId, { assignee: 'agent-full' });
		await progressTask(db, taskId, { progressMessage: 'Working' });
		await blockTask(db, taskId, { reason: 'Blocked temporarily' });

		const unblocked = await unblockTask(db, taskId, { message: 'Unblocked' });
		expect(unblocked.task!.status).toBe('in-progress');

		const evidence = [
			{ command: 'npx vitest run src/lib/server/lifecycle.test.ts', exitCode: 0, verdict: 'pass' },
			{ command: 'npm run build', exitCode: 0, verdict: 'pass' }
		];
		const files = [
			'src/lib/server/task-service.ts',
			'src/lib/db/schema.ts',
			'src/lib/server/lifecycle.test.ts'
		];

		const completed = await completeTask(db, taskId, {
			commitHash: 'full-lifecycle',
			progressMessage: 'All done with evidence',
			evidence,
			filesTouched: files
		});

		expect('error' in completed).toBe(false);
		expect(completed.task!.status).toBe('done');
		expect(completed.task!.blockedReason).toBeNull();
		expect(completed.task!.evidence).toHaveLength(2);
		expect(completed.task!.filesTouched).toHaveLength(3);
		expect(completed.task!.commitHash).toBe('full-lifecycle');
		expect(completed.task!.reportedAt).not.toBeNull();
	});
});
