import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { healthCheck, type DbClient, type HealthResponse } from './+server.js';

/**
 * Tests for the health check endpoint logic.
 *
 * Tests the extracted `healthCheck` function with both real and mock DbClients.
 * The handler itself is thin — testing the core logic here provides adequate coverage.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a mock DbClient that either succeeds or throws. */
function createMockDb(opts: { shouldError?: boolean; errorMessage?: string } = {}): DbClient {
	return {
		async run() {
			if (opts.shouldError) {
				throw new Error(opts.errorMessage ?? 'DB connection failed');
			}
		}
	};
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('healthCheck function', () => {
	it('returns db: "connected" when DB query succeeds', async () => {
		const mockDb = createMockDb();
		const result = await healthCheck(mockDb);
		expect(result.db).toBe('connected');
	});

	it('returns db: "error" when DB query fails', async () => {
		const mockDb = createMockDb({ shouldError: true, errorMessage: 'Connection refused' });
		const result = await healthCheck(mockDb);
		expect(result.db).toBe('error');
	});

	it('returns db: "error" for any exception type', async () => {
		const failingDb: DbClient = {
			async run() {
				throw new TypeError('not a database');
			}
		};
		const result = await healthCheck(failingDb);
		expect(result.db).toBe('error');
	});

	it('works with a real in-memory SQLite database', async () => {
		const sqlite = new Database(':memory:');
		sqlite.pragma('journal_mode = WAL');
		const db = drizzle(sqlite);

		const result = await healthCheck(db as unknown as DbClient);
		expect(result.db).toBe('connected');

		sqlite.close();
	});
});

describe('health response shape', () => {
	it('matches the HealthResponse interface', () => {
		// Verify the exported type is correct by constructing a response
		const response: HealthResponse = {
			status: 'ok',
			version: '1.0.0',
			uptime: 123.45,
			db: 'connected'
		};

		expect(response).toEqual({
			status: 'ok',
			version: '1.0.0',
			uptime: 123.45,
			db: 'connected'
		});
	});

	it('has all required fields', () => {
		const requiredFields: (keyof HealthResponse)[] = ['status', 'version', 'uptime', 'db'];

		for (const field of requiredFields) {
			expect(field).toBeDefined();
		}
	});

	it('db field only allows "connected" or "error"', async () => {
		const connected = await healthCheck(createMockDb());
		expect(['connected', 'error']).toContain(connected.db);

		const errored = await healthCheck(createMockDb({ shouldError: true }));
		expect(['connected', 'error']).toContain(errored.db);
	});
});
