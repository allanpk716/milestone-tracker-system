import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema.js';
import { confirmMilestone } from './confirm-service.js';
import { createMilestone } from './milestone-service.js';
import { confirmRequestSchema } from '$lib/schemas/confirm.js';

/**
 * Tests for the confirm endpoint contract.
 *
 * Since the SvelteKit handler imports db directly from $lib/db/index.js,
 * we test the full contract through the service layer with the same
 * validation and precondition logic the endpoint uses.
 */

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

async function seedDraftMilestone(title = 'Test', sourceMd = '# Req\n\nBuild it.') {
	return createMilestone(db, { title, sourceMd });
}

// Simulate the endpoint handler's validation + service call
async function simulateConfirmRequest(milestoneId: string, body: unknown) {
	// Validate JSON parse
	if (typeof body !== 'object' || body === null) {
		return { status: 400, body: { error: { code: 'bad_request', message: 'Invalid JSON body' } } };
	}

	// Validate with Zod
	const parsed = confirmRequestSchema.safeParse(body);
	if (!parsed.success) {
		const details = parsed.error.issues.map((i) => ({
			field: i.path.join('.'),
			message: i.message
		}));
		return { status: 400, body: { error: { code: 'validation_error', message: 'Request validation failed', details } } };
	}

	// Call service
	const result = await confirmMilestone(db, milestoneId, parsed.data.modules);

	if ('error' in result) {
		const status = result.error.code === 'not_found' ? 404 : 400;
		return { status, body: { error: result.error } };
	}

	return {
		status: 200,
		body: { milestoneId, modules: result.data }
	};
}

// ── Confirm endpoint tests ───────────────────────────────────────────────────

describe('confirm endpoint', () => {
	it('returns 200 with created modules and tasks', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, {
			modules: [
				{ name: 'Mod1', tasks: [{ title: 'T1' }] }
			]
		});

		expect(resp.status).toBe(200);
		expect(resp.body.milestoneId).toBe(ms.id);
		expect(resp.body.modules).toHaveLength(1);
		expect(resp.body.modules[0].id).toMatch(/^MOD-/);
		expect(resp.body.modules[0].tasks[0].id).toMatch(/^TASK-/);
		expect(resp.body.modules[0].tasks[0].shortId).toBeGreaterThan(0);
	});

	it('returns 404 for non-existent milestone', async () => {
		const resp = await simulateConfirmRequest('MS-999', {
			modules: [{ name: 'Mod', tasks: [{ title: 'T' }] }]
		});

		expect(resp.status).toBe(404);
		expect(resp.body.error.code).toBe('not_found');
	});

	it('returns 400 when milestone is not draft', async () => {
		const ms = await seedDraftMilestone();
		await db.update(schema.milestones).set({ status: 'completed' }).where(eq(schema.milestones.id, ms.id));

		const resp = await simulateConfirmRequest(ms.id!, {
			modules: [{ name: 'Mod', tasks: [{ title: 'T' }] }]
		});

		expect(resp.status).toBe(400);
		expect(resp.body.error.code).toBe('bad_request');
	});

	it('returns 400 for empty modules array', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, { modules: [] });

		expect(resp.status).toBe(400);
		expect(resp.body.error.code).toBe('validation_error');
	});

	it('returns 400 for modules missing tasks', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, {
			modules: [{ name: 'Mod', tasks: [] }]
		});

		expect(resp.status).toBe(400);
		expect(resp.body.error.code).toBe('validation_error');
	});

	it('returns 400 for missing modules field', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, {});

		expect(resp.status).toBe(400);
	});

	it('returns 400 for non-JSON input', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, 'not json');

		expect(resp.status).toBe(400);
		expect(resp.body.error.code).toBe('bad_request');
	});

	it('returns 400 for module with empty name', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, {
			modules: [{ name: '', tasks: [{ title: 'T' }] }]
		});

		expect(resp.status).toBe(400);
	});

	it('returns 400 for task with empty title', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, {
			modules: [{ name: 'Mod', tasks: [{ title: '' }] }]
		});

		expect(resp.status).toBe(400);
	});

	it('returns structured response with all IDs for audit', async () => {
		const ms = await seedDraftMilestone();
		const resp = await simulateConfirmRequest(ms.id!, {
			modules: [
				{ name: 'A', description: 'Desc', tasks: [{ title: 'T1' }, { title: 'T2' }] }
			]
		});

		expect(resp.status).toBe(200);
		const mod = resp.body.modules[0];
		// All IDs present for audit
		expect(mod.id).toBeTruthy();
		expect(mod.milestoneId).toBe(ms.id);
		expect(mod.tasks[0].id).toBeTruthy();
		expect(mod.tasks[0].shortId).toBeTruthy();
		expect(mod.tasks[0].moduleId).toBe(mod.id);
		expect(mod.tasks[1].id).toBeTruthy();
		expect(mod.tasks[1].shortId).toBeTruthy();
	});
});
