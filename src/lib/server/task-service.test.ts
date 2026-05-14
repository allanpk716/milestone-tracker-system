import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/db/schema.js';
import {
	listTasks,
	getTask,
	claimTask,
	progressTask,
	completeTask,
	adminTaskAction,
	nextTaskId,
	updateTask,
	blockTask,
	unblockTask,
	listKanbanData
} from './task-service.js';
import { createMilestone } from './milestone-service.js';
import { createModule } from './module-service.js';

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
  blocked_reason TEXT,
  commit_hash TEXT,
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

async function seedFixture() {
	const ms = await createMilestone(db, { title: 'Test MS' });
	const mod = await createModule(db, ms.id, { name: 'Core' });
	return { ms, mod };
}

async function seedTask(title = 'Test Task', overrides: Record<string, any> = {}) {
	const { mod } = await seedFixture();
	const { id, shortId } = await nextTaskId(db);
	const result = await db
		.insert(schema.tasks)
		.values({ id, shortId, moduleId: mod.id, title, ...overrides })
		.returning()
		.get();
	return { task: result, ms: (await seedFixture()).ms, mod };
}

async function seedTaskDirect(title = 'Test Task', overrides: Record<string, any> = {}) {
	const { ms, mod } = await seedFixture();
	const { id, shortId } = await nextTaskId(db);
	const result = await db
		.insert(schema.tasks)
		.values({ id, shortId, moduleId: mod.id, title, ...overrides })
		.returning()
		.get();
	return { task: result, ms, mod };
}

// ── ID Generation ────────────────────────────────────────────────────────────

describe('task API — ID generation', () => {
	it('generates sequential TASK-{seq} IDs', async () => {
		const { id: id1 } = await nextTaskId(db);
		const { mod } = await seedFixture();
		await db.insert(schema.tasks).values({ id: id1, shortId: 99, moduleId: mod.id, title: 'Seq' });
		const { id: id2 } = await nextTaskId(db);
		expect(id1).toBe('TASK-1');
		expect(id2).toBe('TASK-2');
	});

	it('generates sequential short_id values', async () => {
		const { shortId: s1 } = await nextTaskId(db);
		const { mod } = await seedFixture();
		await db.insert(schema.tasks).values({ id: 'TASK-99', shortId: s1, moduleId: mod.id, title: 'Seq' });
		const { shortId: s2 } = await nextTaskId(db);
		expect(s1).toBe(1);
		expect(s2).toBe(2);
	});
});

// ── List Tasks ───────────────────────────────────────────────────────────────

describe('task API — list with filters', () => {
	it('lists all tasks ordered by shortId', async () => {
		const { mod } = await seedFixture();
		await db.insert(schema.tasks).values([
			{ id: 'TASK-10', shortId: 10, moduleId: mod.id, title: 'C' },
			{ id: 'TASK-1', shortId: 1, moduleId: mod.id, title: 'A' },
			{ id: 'TASK-5', shortId: 5, moduleId: mod.id, title: 'B' }
		]);
		const list = await listTasks(db);
		expect(list).toHaveLength(3);
		expect(list[0].shortId).toBe(1);
		expect(list[1].shortId).toBe(5);
		expect(list[2].shortId).toBe(10);
	});

	it('filters by status', async () => {
		const { mod } = await seedFixture();
		await db.insert(schema.tasks).values([
			{ id: 'TASK-1', shortId: 1, moduleId: mod.id, title: 'Done', status: 'done' },
			{ id: 'TASK-2', shortId: 2, moduleId: mod.id, title: 'Todo', status: 'todo' }
		]);
		const doneList = await listTasks(db, { status: 'done' });
		expect(doneList).toHaveLength(1);
		expect(doneList[0].title).toBe('Done');
	});

	it('filters by moduleId', async () => {
		const { mod } = await seedFixture();
		const mod2 = await createModule(db, (await createMilestone(db, { title: 'MS2' })).id!, { name: 'Other' });
		await db.insert(schema.tasks).values([
			{ id: 'TASK-1', shortId: 1, moduleId: mod.id, title: 'In Mod1' },
			{ id: 'TASK-2', shortId: 2, moduleId: mod2!.id, title: 'In Mod2' }
		]);
		const list = await listTasks(db, { moduleId: mod.id });
		expect(list).toHaveLength(1);
		expect(list[0].title).toBe('In Mod1');
	});

	it('filters by milestoneId through modules', async () => {
		const ms = await createMilestone(db, { title: 'Target' });
		const ms2 = await createMilestone(db, { title: 'Other' });
		const mod1 = await createModule(db, ms.id!, { name: 'M1' });
		const mod2 = await createModule(db, ms2.id!, { name: 'M2' });
		await db.insert(schema.tasks).values([
			{ id: 'TASK-1', shortId: 1, moduleId: mod1!.id, title: 'Target' },
			{ id: 'TASK-2', shortId: 2, moduleId: mod2!.id, title: 'Other' }
		]);
		const list = await listTasks(db, { milestoneId: ms.id });
		expect(list).toHaveLength(1);
		expect(list[0].title).toBe('Target');
	});

	it('returns empty list when milestone has no modules', async () => {
		const ms = await createMilestone(db, { title: 'Empty' });
		const list = await listTasks(db, { milestoneId: ms.id });
		expect(list).toHaveLength(0);
	});
});

// ── Get Task Detail ──────────────────────────────────────────────────────────

describe('task API — get detail with reference resolution', () => {
	it('returns task with module and milestone info', async () => {
		const { task, ms, mod } = await seedTaskDirect('Detail Test');
		const detail = await getTask(db, task.id);
		expect(detail).not.toBeNull();
		expect(detail!.id).toBe(task.id);
		expect(detail!.module).not.toBeNull();
		expect(detail!.module!.name).toBe('Core');
		expect(detail!.milestone).not.toBeNull();
		expect(detail!.milestone!.title).toBe('Test MS');
	});

	it('returns null for non-existent task', async () => {
		const detail = await getTask(db, 'TASK-999');
		expect(detail).toBeNull();
	});
});

// ── Claim Task ───────────────────────────────────────────────────────────────

describe('task API — claim with optimistic lock', () => {
	it('claims an unassigned todo task', async () => {
		const { task } = await seedTaskDirect('Claim Me');
		const result = await claimTask(db, task.id, { assignee: 'alice' });
		expect(result.task).toBeDefined();
		expect(result.task!.assignee).toBe('alice');
		expect(result.task!.status).toBe('in-progress'); // auto-transitions
	});

	it('claims an in-progress task if already assigned to same person', async () => {
		const { task } = await seedTaskDirect('Reclaim', { status: 'in-progress', assignee: 'alice' });
		const result = await claimTask(db, task.id, { assignee: 'alice' });
		expect(result.task).toBeDefined();
		expect(result.task!.assignee).toBe('alice');
	});

	it('returns 409 conflict when task already claimed by another', async () => {
		const { task } = await seedTaskDirect('Taken', { status: 'in-progress', assignee: 'bob' });
		const result = await claimTask(db, task.id, { assignee: 'alice' });
		expect(result.error).toBe('conflict');
		if (result.error === 'conflict') {
			expect(result.currentAssignee).toBe('bob');
		}
	});

	it('returns 404 for non-existent task', async () => {
		const result = await claimTask(db, 'TASK-999', { assignee: 'alice' });
		expect(result.error).toBe('not_found');
	});

	it('rejects claiming done tasks', async () => {
		const { task } = await seedTaskDirect('Done', { status: 'done' });
		const result = await claimTask(db, task.id, { assignee: 'alice' });
		expect(result.error).toBe('invalid_status');
	});
});

// ── Progress ─────────────────────────────────────────────────────────────────

describe('task API — progress update', () => {
	it('updates progress on an in-progress task', async () => {
		const { task } = await seedTaskDirect('Progress', { status: 'in-progress' });
		const result = await progressTask(db, task.id, {
			progressMessage: 'Working on it',
			subTotal: 5,
			subDone: 2
		});
		expect(result.task).toBeDefined();
		expect(result.task!.progressMessage).toBe('Working on it');
		expect(result.task!.subTotal).toBe(5);
		expect(result.task!.subDone).toBe(2);
	});

	it('returns 404 for non-existent task', async () => {
		const result = await progressTask(db, 'TASK-999', { progressMessage: 'Nope' });
		expect(result.error).toBe('not_found');
	});

	it('rejects progress update on done task', async () => {
		const { task } = await seedTaskDirect('Done', { status: 'done' });
		const result = await progressTask(db, task.id, { progressMessage: 'Late' });
		expect(result.error).toBe('invalid_status');
	});
});

// ── Complete ─────────────────────────────────────────────────────────────────

describe('task API — complete', () => {
	it('completes a review task with commit hash', async () => {
		const { task } = await seedTaskDirect('Review', { status: 'review', assignee: 'alice' });
		const result = await completeTask(db, task.id, {
			commitHash: 'abc1234',
			progressMessage: 'All tests pass'
		});
		expect(result.task).toBeDefined();
		expect(result.task!.status).toBe('done');
		expect(result.task!.commitHash).toBe('abc1234');
		expect(result.task!.reportedAt).not.toBeNull();
	});

	it('completes an in-progress task', async () => {
		const { task } = await seedTaskDirect('Direct', { status: 'in-progress', assignee: 'bob' });
		const result = await completeTask(db, task.id, {});
		expect(result.task!.status).toBe('done');
		expect(result.task!.reportedAt).not.toBeNull();
	});

	it('returns 404 for non-existent task', async () => {
		const result = await completeTask(db, 'TASK-999', {});
		expect(result.error).toBe('not_found');
	});

	it('rejects completing a todo task', async () => {
		const { task } = await seedTaskDirect('Todo', { status: 'todo' });
		const result = await completeTask(db, task.id, {});
		expect(result.error).toBe('invalid_status');
	});

	it('completes with evidence and persists it', async () => {
		const { task } = await seedTaskDirect('Evidence', { status: 'review' });
		const evidence = [
			{ command: 'npm test', exitCode: 0, verdict: 'pass' },
			{ command: 'npm run lint', exitCode: 0, verdict: 'pass' }
		];
		const result = await completeTask(db, task.id, {
			commitHash: 'abc123',
			evidence
		});
		expect(result.task).toBeDefined();
		expect(result.task!.status).toBe('done');
		expect(result.task!.evidence).toEqual(evidence);
	});

	it('completes with filesTouched and persists it', async () => {
		const { task } = await seedTaskDirect('Files', { status: 'in-progress' });
		const files = ['src/lib/db/schema.ts', 'src/lib/schemas/task.ts'];
		const result = await completeTask(db, task.id, { filesTouched: files });
		expect(result.task!.status).toBe('done');
		expect(result.task!.filesTouched).toEqual(files);
	});

	it('completes with both evidence and filesTouched', async () => {
		const { task } = await seedTaskDirect('Both', { status: 'review' });
		const evidence = [{ command: 'vitest run', exitCode: 0, verdict: 'pass' }];
		const files = ['src/a.ts'];
		const result = await completeTask(db, task.id, { evidence, filesTouched: files });
		expect(result.task!.evidence).toEqual(evidence);
		expect(result.task!.filesTouched).toEqual(files);
	});

	it('stores null when evidence is empty array', async () => {
		const { task } = await seedTaskDirect('Empty', { status: 'review' });
		const result = await completeTask(db, task.id, { evidence: [] });
		expect(result.task!.evidence).toBeNull();
	});

	it('stores null when filesTouched is empty array', async () => {
		const { task } = await seedTaskDirect('EmptyFiles', { status: 'review' });
		const result = await completeTask(db, task.id, { filesTouched: [] });
		expect(result.task!.filesTouched).toBeNull();
	});

	it('omits evidence/filesTouched when not provided (backward compat)', async () => {
		const { task } = await seedTaskDirect('Compat', { status: 'review' });
		const result = await completeTask(db, task.id, { commitHash: 'def456' });
		expect(result.task!.evidence).toBeNull();
		expect(result.task!.filesTouched).toBeNull();
	});

	it('returns evidence in getTask detail', async () => {
		const { task } = await seedTaskDirect('DetailEvidence', { status: 'review' });
		const evidence = [{ command: 'npm test', exitCode: 0, verdict: 'pass' }];
		await completeTask(db, task.id, { evidence });
		const detail = await getTask(db, task.id);
		expect(detail!.evidence).toEqual(evidence);
	});
});

// ── Admin Actions ────────────────────────────────────────────────────────────

describe('task API — admin actions', () => {
	it('admin can set any status (force override)', async () => {
		const { task } = await seedTaskDirect('Force', { status: 'todo' });
		const result = await adminTaskAction(db, task.id, { status: 'done' });
		expect(result.task).toBeDefined();
		expect(result.task!.status).toBe('done');
	});

	it('admin can reopen a done task', async () => {
		const { task } = await seedTaskDirect('Reopen', {
			status: 'done',
			reportedAt: new Date()
		});
		const result = await adminTaskAction(db, task.id, { status: 'todo' });
		expect(result.task!.status).toBe('todo');
		expect(result.task!.reportedAt).toBeNull();
	});

	it('admin can halt a task', async () => {
		const { task } = await seedTaskDirect('Halt', { status: 'in-progress' });
		// 'halt' is not a valid status — use blocked instead
		const result = await adminTaskAction(db, task.id, { status: 'blocked' });
		expect(result.task!.status).toBe('blocked');
	});

	it('admin can skip a task', async () => {
		const { task } = await seedTaskDirect('Skip', { status: 'todo' });
		const result = await adminTaskAction(db, task.id, { status: 'skipped' });
		expect(result.task!.status).toBe('skipped');
	});

	it('admin can update progress message via action', async () => {
		const { task } = await seedTaskDirect('Admin Note', { status: 'review' });
		const result = await adminTaskAction(db, task.id, {
			status: 'in-progress',
			progressMessage: 'Needs more work'
		});
		expect(result.task!.status).toBe('in-progress');
		expect(result.task!.progressMessage).toBe('Needs more work');
	});

	it('returns 404 for non-existent task', async () => {
		const result = await adminTaskAction(db, 'TASK-999', { status: 'todo' });
		expect(result.error).toBe('not_found');
	});

	it('sets reportedAt when admin sets done', async () => {
		const { task } = await seedTaskDirect('Admin Done', { status: 'review' });
		const result = await adminTaskAction(db, task.id, { status: 'done' });
		expect(result.task!.reportedAt).not.toBeNull();
	});
});

// ── Full Lifecycle Integration ───────────────────────────────────────────────

describe('task API — full lifecycle', () => {
	it('completes full task lifecycle: create → claim → progress → complete', async () => {
		const { ms, mod } = await seedFixture();
		const { id, shortId } = await nextTaskId(db);
		await db.insert(schema.tasks).values({
			id,
			shortId,
			moduleId: mod.id,
			title: 'Lifecycle Test'
		});

		// Claim
		const claimed = await claimTask(db, id, { assignee: 'alice' });
		expect(claimed.task!.status).toBe('in-progress');
		expect(claimed.task!.assignee).toBe('alice');

		// Progress
		const progressed = await progressTask(db, id, {
			progressMessage: 'Half done',
			subTotal: 4,
			subDone: 2
		});
		expect(progressed.task!.subDone).toBe(2);

		// Complete
		const completed = await completeTask(db, id, { commitHash: 'deadbeef' });
		expect(completed.task!.status).toBe('done');
		expect(completed.task!.commitHash).toBe('deadbeef');
		expect(completed.task!.reportedAt).not.toBeNull();
	});
});

// ── Update Task ──────────────────────────────────────────────────────────────

describe('update task', () => {
	it('updates title of an existing task', async () => {
		const { task } = await seedTaskDirect('Old Title');
		const result = await updateTask(db, task.id, { title: 'New Title' });
		expect(result.task).toBeDefined();
		expect(result.task!.title).toBe('New Title');
	});

	it('updates description', async () => {
		const { task } = await seedTaskDirect('Desc Test');
		const result = await updateTask(db, task.id, { description: 'New description' });
		expect(result.task!.description).toBe('New description');
	});

	it('clears description with null', async () => {
		const { task } = await seedTaskDirect('Clear Desc', { description: 'Old desc' });
		const result = await updateTask(db, task.id, { description: null });
		expect(result.task!.description).toBeNull();
	});

	it('updates assignee', async () => {
		const { task } = await seedTaskDirect('Assign Test');
		const result = await updateTask(db, task.id, { assignee: 'bob' });
		expect(result.task!.assignee).toBe('bob');
	});

	it('clears assignee with null', async () => {
		const { task } = await seedTaskDirect('Clear Assign', { assignee: 'alice' });
		const result = await updateTask(db, task.id, { assignee: null });
		expect(result.task!.assignee).toBeNull();
	});

	it('updates multiple fields at once', async () => {
		const { task } = await seedTaskDirect('Multi', { description: 'old', assignee: 'alice' });
		const result = await updateTask(db, task.id, {
			title: 'Updated',
			description: 'new desc',
			assignee: 'bob'
		});
		expect(result.task!.title).toBe('Updated');
		expect(result.task!.description).toBe('new desc');
		expect(result.task!.assignee).toBe('bob');
	});

	it('returns not_found for non-existent task', async () => {
		const result = await updateTask(db, 'TASK-999', { title: 'Nope' });
		expect(result.error).toBe('not_found');
	});

	it('updates updatedAt timestamp', async () => {
		const { task } = await seedTaskDirect('Timestamp');
		const result = await updateTask(db, task.id, { title: 'Timestamp Updated' });
		// Verify updatedAt is a valid ISO date string
		expect(result.task!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});
});

// ── Admin Action — Assignee Clearing (Force Release) ─────────────────────────

describe('admin action — assignee clearing', () => {
	it('admin can clear assignee (force release)', async () => {
		const { task } = await seedTaskDirect('Force Release', {
			status: 'in-progress',
			assignee: 'alice'
		});
		const result = await adminTaskAction(db, task.id, {
			status: 'todo',
			assignee: null
		});
		expect(result.task!.assignee).toBeNull();
		expect(result.task!.status).toBe('todo');
	});

	it('admin can reassign to another agent', async () => {
		const { task } = await seedTaskDirect('Reassign', {
			status: 'in-progress',
			assignee: 'alice'
		});
		const result = await adminTaskAction(db, task.id, {
			status: 'in-progress',
			assignee: 'bob'
		});
		expect(result.task!.assignee).toBe('bob');
	});

	it('admin action without assignee field does not change assignee', async () => {
		const { task } = await seedTaskDirect('No Change', {
			status: 'in-progress',
			assignee: 'alice'
		});
		const result = await adminTaskAction(db, task.id, { status: 'blocked' });
		expect(result.task!.assignee).toBe('alice');
	});
});

// ── Zombie Detection ─────────────────────────────────────────────────────────

describe('zombie detection', () => {
	it('marks in-progress tasks updated >24h ago as zombies', async () => {
		const ms = await createMilestone(db, { title: 'Zombie MS' });
		const mod = await createModule(db, ms.id!, { name: 'Zombie Mod' });
		const { id, shortId } = await nextTaskId(db);

		// Insert a task with updatedAt set to 25 hours ago
		const twentyFiveHoursAgo = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000);
		await db
			.insert(schema.tasks)
			.values({
				id,
				shortId,
				moduleId: mod!.id,
				title: 'Zombie Task',
				status: 'in-progress',
				assignee: 'alice',
				updatedAt: new Date(twentyFiveHoursAgo * 1000)
			})
			.returning()
			.get();

		const data = await listKanbanData(db, ms.id!);
		expect(data).not.toBeNull();
		const zombieTask = data!.modules[0].tasks.find((t) => t.id === id);
		expect(zombieTask!.isZombie).toBe(true);
	});

	it('does not mark recently updated in-progress tasks as zombies', async () => {
		const ms = await createMilestone(db, { title: 'Fresh MS' });
		const mod = await createModule(db, ms.id!, { name: 'Fresh Mod' });
		const { id, shortId } = await nextTaskId(db);

		await db
			.insert(schema.tasks)
			.values({
				id,
				shortId,
				moduleId: mod!.id,
				title: 'Fresh Task',
				status: 'in-progress',
				assignee: 'bob'
			})
			.returning()
			.get();

		const data = await listKanbanData(db, ms.id!);
		const freshTask = data!.modules[0].tasks.find((t) => t.id === id);
		expect(freshTask!.isZombie).toBe(false);
	});

	it('does not mark non-in-progress tasks as zombies', async () => {
		const ms = await createMilestone(db, { title: 'Done MS' });
		const mod = await createModule(db, ms.id!, { name: 'Done Mod' });
		const { id, shortId } = await nextTaskId(db);

		// Insert a done task with old updatedAt
		const twentyFiveHoursAgo = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000);
		await db
			.insert(schema.tasks)
			.values({
				id,
				shortId,
				moduleId: mod!.id,
				title: 'Old Done Task',
				status: 'done',
				updatedAt: new Date(twentyFiveHoursAgo * 1000)
			})
			.returning()
			.get();

		const data = await listKanbanData(db, ms.id!);
		const doneTask = data!.modules[0].tasks.find((t) => t.id === id);
		expect(doneTask!.isZombie).toBe(false);
	});

	it('returns null for non-existent milestone', async () => {
		const data = await listKanbanData(db, 'MS-999');
		expect(data).toBeNull();
	});

	it('computes module progress correctly', async () => {
		const ms = await createMilestone(db, { title: 'Progress MS' });
		const mod = await createModule(db, ms.id!, { name: 'Progress Mod' });

		// Seed 4 tasks: 2 done, 1 in-progress, 1 todo
		for (let i = 0; i < 4; i++) {
			const { id, shortId } = await nextTaskId(db);
			await db
				.insert(schema.tasks)
				.values({
					id,
					shortId,
					moduleId: mod!.id,
					title: `Task ${i}`,
					status: i < 2 ? 'done' : i === 2 ? 'in-progress' : 'todo'
				})
				.returning()
				.get();
		}

		const data = await listKanbanData(db, ms.id!);
		const moduleData = data!.modules[0];
		expect(moduleData.totalTasks).toBe(4);
		expect(moduleData.doneTasks).toBe(2);
		expect(moduleData.progressPercent).toBe(50);
	});

	it('collects unique assignees per module', async () => {
		const ms = await createMilestone(db, { title: 'Assignee MS' });
		const mod = await createModule(db, ms.id!, { name: 'Assignee Mod' });

		for (const name of ['alice', 'bob', 'alice']) {
			const { id, shortId } = await nextTaskId(db);
			await db
				.insert(schema.tasks)
				.values({
					id,
					shortId,
					moduleId: mod!.id,
					title: `${name}'s Task`,
					status: 'in-progress',
					assignee: name
				})
				.returning()
				.get();
		}

		const data = await listKanbanData(db, ms.id!);
		const assignees = data!.modules[0].assignees;
		expect(assignees).toHaveLength(2);
		expect(assignees).toContain('alice');
		expect(assignees).toContain('bob');
	});
});

// ── Block Task ───────────────────────────────────────────────────────────────

describe('task API — block', () => {
	it('blocks an in-progress task and sets blockedReason', async () => {
		const { task } = await seedTaskDirect('Block Me', { status: 'in-progress' });
		const result = await blockTask(db, task.id, { reason: 'Missing OAuth config' });
		expect(result.task).toBeDefined();
		expect(result.task!.status).toBe('blocked');
		expect(result.task!.blockedReason).toBe('Missing OAuth config');
	});

	it('returns not_found for non-existent task', async () => {
		const result = await blockTask(db, 'TASK-999', { reason: 'Nope' });
		expect(result.error).toBe('not_found');
	});

	it('rejects blocking a todo task', async () => {
		const { task } = await seedTaskDirect('Todo Block', { status: 'todo' });
		const result = await blockTask(db, task.id, { reason: 'Cannot block' });
		expect(result.error).toBe('invalid_status');
		if (result.error === 'invalid_status') {
			expect(result.currentStatus).toBe('todo');
		}
	});

	it('rejects blocking an already-blocked task', async () => {
		const { task } = await seedTaskDirect('Already Blocked', { status: 'blocked' });
		const result = await blockTask(db, task.id, { reason: 'Double block' });
		expect(result.error).toBe('invalid_status');
		if (result.error === 'invalid_status') {
			expect(result.currentStatus).toBe('blocked');
		}
	});

	it('rejects blocking a done task', async () => {
		const { task } = await seedTaskDirect('Done Block', { status: 'done' });
		const result = await blockTask(db, task.id, { reason: 'Cannot block done' });
		expect(result.error).toBe('invalid_status');
	});

	it('rejects blocking a review task', async () => {
		const { task } = await seedTaskDirect('Review Block', { status: 'review' });
		const result = await blockTask(db, task.id, { reason: 'Cannot block review' });
		expect(result.error).toBe('invalid_status');
	});

	it('rejects blocking a skipped task', async () => {
		const { task } = await seedTaskDirect('Skipped Block', { status: 'skipped' });
		const result = await blockTask(db, task.id, { reason: 'Cannot block skipped' });
		expect(result.error).toBe('invalid_status');
	});

	it('accepts reason at max length (2000 chars)', async () => {
		const { task } = await seedTaskDirect('Long Reason', { status: 'in-progress' });
		const longReason = 'X'.repeat(2000);
		const result = await blockTask(db, task.id, { reason: longReason });
		expect(result.task!.blockedReason).toBe(longReason);
	});

	it('accepts reason with special characters', async () => {
		const { task } = await seedTaskDirect('Special', { status: 'in-progress' });
		const specialReason = '需要配置 🔒 JSON {"key": "value"} <script>alert(1)</script>';
		const result = await blockTask(db, task.id, { reason: specialReason });
		expect(result.task!.blockedReason).toBe(specialReason);
	});

	it('includes blockedReason in task response', async () => {
		const { task } = await seedTaskDirect('Response Check', { status: 'in-progress' });
		await blockTask(db, task.id, { reason: 'API key missing' });
		const detail = await getTask(db, task.id);
		expect(detail!.blockedReason).toBe('API key missing');
	});
});

// ── Unblock Task ─────────────────────────────────────────────────────────────

describe('task API — unblock', () => {
	it('unblocks a blocked task and clears blockedReason', async () => {
		const { task } = await seedTaskDirect('Unblock Me', {
			status: 'blocked',
			blockedReason: 'Old reason'
		});
		const result = await unblockTask(db, task.id, {});
		expect(result.task).toBeDefined();
		expect(result.task!.status).toBe('in-progress');
		expect(result.task!.blockedReason).toBeNull();
	});

	it('unblocks with optional message as progressMessage', async () => {
		const { task } = await seedTaskDirect('Unblock Msg', {
			status: 'blocked',
			blockedReason: 'Fixed'
		});
		const result = await unblockTask(db, task.id, { message: 'OAuth config has been added' });
		expect(result.task!.status).toBe('in-progress');
		expect(result.task!.blockedReason).toBeNull();
		expect(result.task!.progressMessage).toBe('OAuth config has been added');
	});

	it('returns not_found for non-existent task', async () => {
		const result = await unblockTask(db, 'TASK-999', {});
		expect(result.error).toBe('not_found');
	});

	it('rejects unblocking an in-progress task', async () => {
		const { task } = await seedTaskDirect('In Progress', { status: 'in-progress' });
		const result = await unblockTask(db, task.id, {});
		expect(result.error).toBe('invalid_status');
		if (result.error === 'invalid_status') {
			expect(result.currentStatus).toBe('in-progress');
		}
	});

	it('rejects unblocking a todo task', async () => {
		const { task } = await seedTaskDirect('Todo Unblock', { status: 'todo' });
		const result = await unblockTask(db, task.id, {});
		expect(result.error).toBe('invalid_status');
	});

	it('rejects unblocking a done task', async () => {
		const { task } = await seedTaskDirect('Done Unblock', { status: 'done' });
		const result = await unblockTask(db, task.id, {});
		expect(result.error).toBe('invalid_status');
	});
});
