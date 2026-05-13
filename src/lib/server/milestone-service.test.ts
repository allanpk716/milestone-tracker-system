import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema.js';
import {
	createMilestone,
	listMilestones,
	getMilestone,
	updateMilestone
} from './milestone-service.js';

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

// ── Milestone CRUD ───────────────────────────────────────────────────────────

describe('milestone API — full CRUD cycle', () => {
	it('creates a milestone with auto-assigned MS-{seq} ID', async () => {
		const ms = await createMilestone(db, { title: 'First Milestone' });
		expect(ms.id).toBe('MS-1');
		expect(ms.title).toBe('First Milestone');
		expect(ms.status).toBe('draft');
		expect(ms.sourceMd).toBeNull();
		expect(ms.gitUrl).toBeNull();
		expect(ms.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('increments ID sequence', async () => {
		const ms1 = await createMilestone(db, { title: 'Alpha' });
		const ms2 = await createMilestone(db, { title: 'Beta' });
		expect(ms1.id).toBe('MS-1');
		expect(ms2.id).toBe('MS-2');
	});

	it('creates with sourceMd and gitUrl', async () => {
		const ms = await createMilestone(db, {
			title: 'With Extras',
			sourceMd: '# My Plan\nSome content',
			gitUrl: 'https://github.com/org/repo'
		});
		expect(ms.sourceMd).toBe('# My Plan\nSome content');
		expect(ms.gitUrl).toBe('https://github.com/org/repo');
	});

	it('creates with empty gitUrl stored as null', async () => {
		const ms = await createMilestone(db, {
			title: 'Empty Git',
			gitUrl: ''
		});
		expect(ms.gitUrl).toBeNull();
	});

	it('lists all milestones ordered by created_at desc', async () => {
		await createMilestone(db, { title: 'Alpha' });
		await createMilestone(db, { title: 'Beta' });
		await createMilestone(db, { title: 'Gamma' });

		const list = await listMilestones(db);
		expect(list).toHaveLength(3);
		expect(list[0].title).toBe('Gamma');
		expect(list[1].title).toBe('Beta');
		expect(list[2].title).toBe('Alpha');
	});

	it('returns empty list when no milestones', async () => {
		const list = await listMilestones(db);
		expect(list).toHaveLength(0);
	});

	it('gets milestone detail with modules and tasks', async () => {
		const ms = await createMilestone(db, { title: 'Parent' });
		// Insert module and task directly
		await db.insert(schema.modules).values({
			id: 'MOD-1-1',
			milestoneId: ms.id,
			name: 'Core'
		});
		await db.insert(schema.tasks).values({
			id: 'TASK-1',
			shortId: 1,
			moduleId: 'MOD-1-1',
			title: 'Build API'
		});

		const detail = await getMilestone(db, ms.id);
		expect(detail).not.toBeNull();
		expect(detail!.id).toBe(ms.id);
		expect(detail!.modules).toHaveLength(1);
		expect(detail!.modules[0].name).toBe('Core');
		expect(detail!.modules[0].tasks).toHaveLength(1);
		expect(detail!.modules[0].tasks[0].title).toBe('Build API');
	});

	it('returns null for non-existent milestone', async () => {
		const detail = await getMilestone(db, 'MS-999');
		expect(detail).toBeNull();
	});

	it('updates milestone title', async () => {
		const ms = await createMilestone(db, { title: 'Original' });
		const updated = await updateMilestone(db, ms.id, { title: 'Updated' });
		expect(updated!.title).toBe('Updated');
	});

	it('updates milestone status', async () => {
		const ms = await createMilestone(db, { title: 'Status Test' });
		const updated = await updateMilestone(db, ms.id, { status: 'in-progress' });
		expect(updated!.status).toBe('in-progress');
	});

	it('updates milestone gitUrl', async () => {
		const ms = await createMilestone(db, { title: 'Git Test' });
		const updated = await updateMilestone(db, ms.id, { gitUrl: 'https://github.com/new/repo' });
		expect(updated!.gitUrl).toBe('https://github.com/new/repo');
	});

	it('returns null when updating non-existent milestone', async () => {
		const updated = await updateMilestone(db, 'MS-999', { title: 'Nope' });
		expect(updated).toBeNull();
	});

	it('returns unchanged milestone when no updates provided', async () => {
		const ms = await createMilestone(db, { title: 'No Change' });
		const updated = await updateMilestone(db, ms.id, {});
		expect(updated!.title).toBe('No Change');
	});
});
