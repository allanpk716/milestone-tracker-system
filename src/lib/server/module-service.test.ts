import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '$lib/db/schema.js';
import {
	createModule,
	listModulesByMilestone,
	updateModule,
	getModule
} from './module-service.js';
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

// ── Helper ───────────────────────────────────────────────────────────────────

async function seedMilestone(seq: number) {
	return createMilestone(db, { title: `Milestone ${seq}` });
}

// ── Module CRUD ──────────────────────────────────────────────────────────────

describe('module API — full CRUD cycle', () => {
	it('creates a module with auto-assigned MOD-{ms_seq}-{seq} ID', async () => {
		const ms = await seedMilestone(1);
		const mod = await createModule(db, ms.id, { name: 'Core Module' });
		expect(mod!.id).toBe('MOD-1-1');
		expect(mod!.milestoneId).toBe(ms.id);
		expect(mod!.name).toBe('Core Module');
		expect(mod!.status).toBe('draft');
		expect(mod!.sortOrder).toBe(0);
	});

	it('increments module seq within a milestone', async () => {
		const ms = await seedMilestone(1);
		const mod1 = await createModule(db, ms.id, { name: 'Module A' });
		const mod2 = await createModule(db, ms.id, { name: 'Module B' });
		expect(mod1!.id).toBe('MOD-1-1');
		expect(mod2!.id).toBe('MOD-1-2');
	});

	it('creates module with description and sortOrder', async () => {
		const ms = await seedMilestone(5);
		const mod = await createModule(db, ms.id, {
			name: 'Backend',
			description: 'Server-side logic',
			sortOrder: 10
		});
		expect(mod!.description).toBe('Server-side logic');
		expect(mod!.sortOrder).toBe(10);
	});

	it('returns null when milestone does not exist', async () => {
		const mod = await createModule(db, 'MS-999', { name: 'Orphan' });
		expect(mod).toBeNull();
	});

	it('lists modules ordered by sortOrder', async () => {
		const ms = await seedMilestone(1);
		await createModule(db, ms.id, { name: 'C', sortOrder: 30 });
		await createModule(db, ms.id, { name: 'A', sortOrder: 10 });
		await createModule(db, ms.id, { name: 'B', sortOrder: 20 });

		const mods = await listModulesByMilestone(db, ms.id);
		expect(mods).toHaveLength(3);
		expect(mods[0].name).toBe('A');
		expect(mods[1].name).toBe('B');
		expect(mods[2].name).toBe('C');
	});

	it('returns empty list for milestone with no modules', async () => {
		const ms = await seedMilestone(1);
		const mods = await listModulesByMilestone(db, ms.id);
		expect(mods).toHaveLength(0);
	});

	it('updates module name', async () => {
		const ms = await seedMilestone(1);
		const mod = await createModule(db, ms.id, { name: 'Original' });
		const updated = await updateModule(db, mod!.id, { name: 'Renamed' });
		expect(updated!.name).toBe('Renamed');
	});

	it('updates module status', async () => {
		const ms = await seedMilestone(1);
		const mod = await createModule(db, ms.id, { name: 'Mod' });
		const updated = await updateModule(db, mod!.id, { status: 'in-progress' });
		expect(updated!.status).toBe('in-progress');
	});

	it('returns null when updating non-existent module', async () => {
		const updated = await updateModule(db, 'MOD-999-1', { name: 'Nope' });
		expect(updated).toBeNull();
	});

	it('gets module by ID', async () => {
		const ms = await seedMilestone(1);
		const mod = await createModule(db, ms.id, { name: 'Fetch Me' });
		const fetched = await getModule(db, mod!.id);
		expect(fetched).not.toBeNull();
		expect(fetched!.id).toBe(mod!.id);
		expect(fetched!.name).toBe('Fetch Me');
		expect(fetched!.milestoneId).toBe(ms.id);
	});

	it('returns null for non-existent module ID', async () => {
		const fetched = await getModule(db, 'MOD-999-1');
		expect(fetched).toBeNull();
	});

	it('gets module with all fields populated', async () => {
		const ms = await seedMilestone(5);
		const mod = await createModule(db, ms.id, {
			name: 'Full Module',
			description: 'Has all fields',
			sortOrder: 42
		});
		const fetched = await getModule(db, mod!.id);
		expect(fetched!.description).toBe('Has all fields');
		expect(fetched!.sortOrder).toBe(42);
		expect(fetched!.status).toBe('draft');
	});
});
