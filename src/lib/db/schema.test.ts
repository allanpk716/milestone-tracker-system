import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from './schema.js';

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

// ── Schema & WAL mode tests ──────────────────────────────────────────────────

describe('db schema', () => {
	it('should create all three tables', () => {
		const tables = sqliteDb
			.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
			.all()
			.map((r: any) => r.name);

		expect(tables).toContain('milestones');
		expect(tables).toContain('modules');
		expect(tables).toContain('tasks');
	});

	it('should have WAL mode enabled (or memory mode for in-memory DB)', () => {
		const result = sqliteDb.pragma('journal_mode');
		// In-memory databases report 'memory' instead of 'wal' — both are valid
		expect(['wal', 'memory']).toContain(result[0].journal_mode);
	});

	it('should enforce foreign keys', () => {
		const result = sqliteDb.pragma('foreign_keys');
		expect(result[0].foreign_keys).toBe(1);
	});

	it('should create indexes for task queries', () => {
		const indexes = sqliteDb
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
			)
			.all()
			.map((r: any) => r.name);

		expect(indexes).toContain('task_status_module_idx');
		expect(indexes).toContain('task_status_reported_idx');
		expect(indexes).toContain('task_module_id_idx');
		expect(indexes).toContain('task_short_id_idx');
	});

	it('should have milestone and module indexes', () => {
		const indexes = sqliteDb
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
			)
			.all()
			.map((r: any) => r.name);

		expect(indexes).toContain('milestone_status_idx');
		expect(indexes).toContain('module_milestone_id_idx');
		expect(indexes).toContain('module_status_idx');
	});
});

// ── Milestone CRUD ───────────────────────────────────────────────────────────

describe('milestone CRUD', () => {
	it('should insert a milestone and return it', async () => {
		const result = await db
			.insert(schema.milestones)
			.values({ id: 'MS-1', title: 'First Milestone' })
			.returning()
			.get();

		expect(result.id).toBe('MS-1');
		expect(result.title).toBe('First Milestone');
		expect(result.status).toBe('draft');
		expect(result.createdAt).toBeInstanceOf(Date);
	});

	it('should default status to draft', async () => {
		const result = await db
			.insert(schema.milestones)
			.values({ id: 'MS-2', title: 'Auto Draft' })
			.returning()
			.get();

		expect(result.status).toBe('draft');
	});

	it('should allow all milestone statuses', async () => {
		const statuses = schema.milestoneStatusEnum;
		for (const status of statuses) {
			const result = await db
				.insert(schema.milestones)
				.values({ id: `MS-${status}`, title: `Status ${status}`, status: status as any })
				.returning()
				.get();
			expect(result.status).toBe(status);
		}

		const all = await db.select().from(schema.milestones);
		expect(all).toHaveLength(4);
	});

	it('should read a milestone by id', async () => {
		await db.insert(schema.milestones).values({ id: 'MS-3', title: 'Find Me' });

		const found = await db
			.select()
			.from(schema.milestones)
			.where(eq(schema.milestones.id, 'MS-3'))
			.get();

		expect(found).toBeDefined();
		expect(found!.title).toBe('Find Me');
	});

	it('should update a milestone', async () => {
		await db.insert(schema.milestones).values({ id: 'MS-4', title: 'Original' });

		await db
			.update(schema.milestones)
			.set({ title: 'Updated', status: 'in-progress' })
			.where(eq(schema.milestones.id, 'MS-4'));

		const updated = await db
			.select()
			.from(schema.milestones)
			.where(eq(schema.milestones.id, 'MS-4'))
			.get();

		expect(updated!.title).toBe('Updated');
		expect(updated!.status).toBe('in-progress');
	});

	it('should delete a milestone', async () => {
		await db.insert(schema.milestones).values({ id: 'MS-5', title: 'Delete Me' });

		await db.delete(schema.milestones).where(eq(schema.milestones.id, 'MS-5'));

		const found = await db
			.select()
			.from(schema.milestones)
			.where(eq(schema.milestones.id, 'MS-5'))
			.get();

		expect(found).toBeUndefined();
	});

	it('should list all milestones', async () => {
		await db.insert(schema.milestones).values([
			{ id: 'MS-10', title: 'Alpha' },
			{ id: 'MS-11', title: 'Beta' },
			{ id: 'MS-12', title: 'Gamma' }
		]);

		const all = await db.select().from(schema.milestones).orderBy(desc(schema.milestones.createdAt));
		expect(all).toHaveLength(3);
	});
});

// ── Module CRUD ──────────────────────────────────────────────────────────────

describe('module CRUD', () => {
	it('should insert a module linked to a milestone', async () => {
		await db.insert(schema.milestones).values({ id: 'MS-20', title: 'Parent' });

		const result = await db
			.insert(schema.modules)
			.values({ id: 'MOD-20-1', milestoneId: 'MS-20', name: 'Core Module' })
			.returning()
			.get();

		expect(result.id).toBe('MOD-20-1');
		expect(result.milestoneId).toBe('MS-20');
		expect(result.name).toBe('Core Module');
		expect(result.status).toBe('draft');
		expect(result.sortOrder).toBe(0);
	});

	it('should cascade delete when milestone is deleted', async () => {
		await db.insert(schema.milestones).values({ id: 'MS-21', title: 'Cascade Parent' });
		await db
			.insert(schema.modules)
			.values({ id: 'MOD-21-1', milestoneId: 'MS-21', name: 'Child' });

		await db.delete(schema.milestones).where(eq(schema.milestones.id, 'MS-21'));

		const modules = await db.select().from(schema.modules);
		expect(modules).toHaveLength(0);
	});

	it('should allow all module statuses', async () => {
		await db.insert(schema.milestones).values({ id: 'MS-22', title: 'Status Test' });

		const statuses = schema.moduleStatusEnum;
		for (let i = 0; i < statuses.length; i++) {
			await db
				.insert(schema.modules)
				.values({
					id: `MOD-22-${i}`,
					milestoneId: 'MS-22',
					name: `Module ${i}`,
					status: statuses[i] as any
				});
		}

		const all = await db.select().from(schema.modules);
		expect(all).toHaveLength(3);
	});
});

// ── Task CRUD ────────────────────────────────────────────────────────────────

describe('task CRUD', () => {
	// Seed milestone + module for task tests
	beforeEach(async () => {
		await db.insert(schema.milestones).values({ id: 'MS-30', title: 'Task Parent' });
		await db
			.insert(schema.modules)
			.values({ id: 'MOD-30-1', milestoneId: 'MS-30', name: 'Task Module' });
	});

	it('should insert a task linked to a module', async () => {
		const result = await db
			.insert(schema.tasks)
			.values({
				id: 'TASK-1',
				shortId: 1,
				moduleId: 'MOD-30-1',
				title: 'Build API'
			})
			.returning()
			.get();

		expect(result.id).toBe('TASK-1');
		expect(result.shortId).toBe(1);
		expect(result.moduleId).toBe('MOD-30-1');
		expect(result.title).toBe('Build API');
		expect(result.status).toBe('todo');
		expect(result.subTotal).toBe(0);
		expect(result.subDone).toBe(0);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
	});

	it('should allow all task statuses in the full lifecycle', async () => {
		const statuses = schema.taskStatusEnum;
		for (let i = 0; i < statuses.length; i++) {
			await db
				.insert(schema.tasks)
				.values({
					id: `TASK-${i}`,
					shortId: 100 + i,
					moduleId: 'MOD-30-1',
					title: `Task ${i}`,
					status: statuses[i] as any
				});
		}

		const all = await db.select().from(schema.tasks);
		expect(all).toHaveLength(6);
		const statusValues = all.map((t) => t.status);
		for (const s of statuses) {
			expect(statusValues).toContain(s);
		}
	});

	it('should update task status through lifecycle', async () => {
		await db
			.insert(schema.tasks)
			.values({
				id: 'TASK-50',
				shortId: 50,
				moduleId: 'MOD-30-1',
				title: 'Lifecycle Test'
			});

		const transitions: Array<string> = ['in-progress', 'blocked', 'in-progress', 'review', 'done'];
		for (const nextStatus of transitions) {
			await db
				.update(schema.tasks)
				.set({ status: nextStatus as any })
				.where(eq(schema.tasks.id, 'TASK-50'));
		}

		const task = await db
			.select()
			.from(schema.tasks)
			.where(eq(schema.tasks.id, 'TASK-50'))
			.get();

		expect(task!.status).toBe('done');
	});

	it('should store and retrieve optional fields', async () => {
		const references = JSON.stringify({ github: 'https://github.com/org/repo/pull/1' });

		await db
			.insert(schema.tasks)
			.values({
				id: 'TASK-60',
				shortId: 60,
				moduleId: 'MOD-30-1',
				title: 'Full Task',
				description: 'A detailed description',
				references,
				assignee: 'alice',
				subTotal: 5,
				subDone: 3,
				progressMessage: 'Working on subtask 4',
				commitHash: 'abc1234'
			});

		const task = await db
			.select()
			.from(schema.tasks)
			.where(eq(schema.tasks.id, 'TASK-60'))
			.get();

		expect(task!.description).toBe('A detailed description');
		expect(task!.references).toBe(references);
		expect(task!.assignee).toBe('alice');
		expect(task!.subTotal).toBe(5);
		expect(task!.subDone).toBe(3);
		expect(task!.progressMessage).toBe('Working on subtask 4');
		expect(task!.commitHash).toBe('abc1234');
	});

	it('should cascade delete when module is deleted', async () => {
		await db
			.insert(schema.tasks)
			.values({
				id: 'TASK-70',
				shortId: 70,
				moduleId: 'MOD-30-1',
				title: 'Orphan Test'
			});

		await db.delete(schema.modules).where(eq(schema.modules.id, 'MOD-30-1'));

		const tasks = await db.select().from(schema.tasks);
		expect(tasks).toHaveLength(0);
	});

	it('should enforce unique short_id', async () => {
		await db
			.insert(schema.tasks)
			.values({
				id: 'TASK-80',
				shortId: 80,
				moduleId: 'MOD-30-1',
				title: 'First'
			});

		expect(() =>
			db
				.insert(schema.tasks)
				.values({
					id: 'TASK-81',
					shortId: 80, // duplicate shortId
					moduleId: 'MOD-30-1',
					title: 'Duplicate'
				})
				.run()
		).toThrow();
	});

	it('should query tasks by status and module_id using index', async () => {
		// Insert tasks with different statuses
		for (let i = 0; i < 5; i++) {
			await db
				.insert(schema.tasks)
				.values({
					id: `TASK-90-${i}`,
					shortId: 90 + i,
					moduleId: 'MOD-30-1',
					title: `Task ${i}`,
					status: i < 3 ? 'done' : 'todo'
				});
		}

		const doneTasks = await db
			.select()
			.from(schema.tasks)
			.where(and(eq(schema.tasks.status, 'done'), eq(schema.tasks.moduleId, 'MOD-30-1')));

		expect(doneTasks).toHaveLength(3);
	});
});
