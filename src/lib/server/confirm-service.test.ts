import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema.js';
import { confirmMilestone } from './confirm-service.js';
import { createMilestone } from './milestone-service.js';

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function seedDraftMilestone() {
	return createMilestone(db, {
		title: 'Test Milestone',
		sourceMd: '# Requirements\n\nBuild a thing.'
	});
}

// ── Confirm service tests ────────────────────────────────────────────────────

describe('confirm-service', () => {
	it('writes modules and tasks atomically and returns IDs', async () => {
		const ms = await seedDraftMilestone();
		const result = await confirmMilestone(db, ms.id!, [
			{
				name: 'Frontend',
				description: 'UI layer',
				tasks: [
					{ title: 'Build login page', description: 'Implement OAuth flow' },
					{ title: 'Build dashboard' }
				]
			},
			{
				name: 'Backend',
				description: null,
				tasks: [{ title: 'Setup API server' }]
			}
		]);

		expect('data' in result).toBe(true);
		const modules = result.data!;
		expect(modules).toHaveLength(2);

		// Module 1
		expect(modules[0].id).toMatch(/^MOD-1-1$/);
		expect(modules[0].name).toBe('Frontend');
		expect(modules[0].description).toBe('UI layer');
		expect(modules[0].status).toBe('draft');
		expect(modules[0].sortOrder).toBe(0);
		expect(modules[0].tasks).toHaveLength(2);
		expect(modules[0].tasks[0].id).toMatch(/^TASK-\d+$/);
		expect(modules[0].tasks[0].title).toBe('Build login page');
		expect(modules[0].tasks[0].shortId).toBeGreaterThan(0);
		expect(modules[0].tasks[1].title).toBe('Build dashboard');

		// Module 2
		expect(modules[1].id).toMatch(/^MOD-1-2$/);
		expect(modules[1].name).toBe('Backend');
		expect(modules[1].description).toBeNull();
		expect(modules[1].tasks).toHaveLength(1);
		expect(modules[1].tasks[0].title).toBe('Setup API server');
	});

	it('updates milestone status from draft to in-progress', async () => {
		const ms = await seedDraftMilestone();
		await confirmMilestone(db, ms.id!, [
			{ name: 'Mod', tasks: [{ title: 'Task' }] }
		]);

		const updated = await db
			.select({ status: schema.milestones.status })
			.from(schema.milestones)
			.where(eq(schema.milestones.id, ms.id))
			.get();

		expect(updated!.status).toBe('in-progress');
	});

	it('generates correct IDs for modules and tasks', async () => {
		const ms = await seedDraftMilestone();
		const result = await confirmMilestone(db, ms.id!, [
			{ name: 'A', tasks: [{ title: 'T1' }, { title: 'T2' }] },
			{ name: 'B', tasks: [{ title: 'T3' }] }
		]);

		const modules = result.data!;
		expect(modules[0].id).toBe('MOD-1-1');
		expect(modules[1].id).toBe('MOD-1-2');
		expect(modules[0].tasks[0].id).toBe('TASK-1');
		expect(modules[0].tasks[0].shortId).toBe(1);
		expect(modules[0].tasks[1].id).toBe('TASK-2');
		expect(modules[0].tasks[1].shortId).toBe(2);
		expect(modules[1].tasks[0].id).toBe('TASK-3');
		expect(modules[1].tasks[0].shortId).toBe(3);
	});

	it('sets sortOrder based on array index', async () => {
		const ms = await seedDraftMilestone();
		const result = await confirmMilestone(db, ms.id!, [
			{ name: 'First', tasks: [{ title: 'T' }] },
			{ name: 'Second', tasks: [{ title: 'T' }] },
			{ name: 'Third', tasks: [{ title: 'T' }] }
		]);

		const modules = result.data!;
		expect(modules[0].sortOrder).toBe(0);
		expect(modules[1].sortOrder).toBe(1);
		expect(modules[2].sortOrder).toBe(2);
	});

	it('returns not_found for non-existent milestone', async () => {
		const result = await confirmMilestone(db, 'MS-999', [
			{ name: 'Mod', tasks: [{ title: 'T' }] }
		]);

		expect('error' in result).toBe(true);
		expect(result.error.code).toBe('not_found');
	});

	it('rejects non-draft milestone status', async () => {
		const ms = await seedDraftMilestone();
		// Manually set status to in-progress
		await db
			.update(schema.milestones)
			.set({ status: 'in-progress' })
			.where(eq(schema.milestones.id, ms.id));

		const result = await confirmMilestone(db, ms.id!, [
			{ name: 'Mod', tasks: [{ title: 'T' }] }
		]);

		expect('error' in result).toBe(true);
		expect(result.error.code).toBe('bad_request');
		expect(result.error.message).toContain('in-progress');
	});

	it('rejects milestone without source markdown', async () => {
		const ms = await createMilestone(db, { title: 'No Source' });

		const result = await confirmMilestone(db, ms.id!, [
			{ name: 'Mod', tasks: [{ title: 'T' }] }
		]);

		expect('error' in result).toBe(true);
		expect(result.error.code).toBe('bad_request');
		expect(result.error.message).toContain('no source markdown');
	});

	it('persists modules and tasks in the database', async () => {
		const ms = await seedDraftMilestone();
		await confirmMilestone(db, ms.id!, [
			{ name: 'Persisted', tasks: [{ title: 'Persisted Task' }] }
		]);

		const dbModules = await db
			.select()
			.from(schema.modules)
			.where(eq(schema.modules.milestoneId, ms.id))
			.all();

		expect(dbModules).toHaveLength(1);
		expect(dbModules[0].name).toBe('Persisted');

		const dbTasks = await db
			.select()
			.from(schema.tasks)
			.where(eq(schema.tasks.moduleId, dbModules[0].id))
			.all();

		expect(dbTasks).toHaveLength(1);
		expect(dbTasks[0].title).toBe('Persisted Task');
		expect(dbTasks[0].status).toBe('todo');
	});

	it('handles single module with single task', async () => {
		const ms = await seedDraftMilestone();
		const result = await confirmMilestone(db, ms.id!, [
			{ name: 'Only', tasks: [{ title: 'One' }] }
		]);

		expect(result.data!).toHaveLength(1);
		expect(result.data![0].tasks).toHaveLength(1);
	});
});
